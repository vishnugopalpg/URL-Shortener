package com.example.urlshortener.service;

import com.example.urlshortener.dto.ShortenRequest;
import com.example.urlshortener.dto.UrlStatsResponse;
import com.example.urlshortener.exception.UrlNotFoundException;
import com.example.urlshortener.model.Click;
import com.example.urlshortener.model.Url;
import com.example.urlshortener.repository.ClickRepository;
import com.example.urlshortener.repository.UrlRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UrlShortenerService {

    private final UrlRepository urlRepository;
    private final ClickRepository clickRepository;
    private final CodeGeneratorService codeGeneratorService;
    private final UrlCacheService urlCacheService;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Transactional
    public UrlStatsResponse shorten(ShortenRequest request) {
        String code = (request.getCustomAlias() != null && !request.getCustomAlias().isBlank())
                ? request.getCustomAlias().trim()
                : codeGeneratorService.generateUniqueCode();

        // Check whether an existing record with this code is just deactivated (soft-deleted).
        // If so, reactivate it with the new URL rather than failing due to the UNIQUE constraint.
        Optional<Url> existing = urlRepository.findByShortCode(code);
        if (existing.isPresent()) {
            Url existingUrl = existing.get();
            if (existingUrl.isActive()) {
                throw new IllegalArgumentException("Custom alias '" + code + "' is already taken");
            }
            // Reactivate the deactivated record
            existingUrl.setOriginalUrl(request.getOriginalUrl());
            existingUrl.setExpiresAt(request.getExpiresAt());
            existingUrl.setActive(true);
            existingUrl.setCreatedAt(LocalDateTime.now());
            Url saved = urlRepository.save(existingUrl);
            urlCacheService.evict(code);  // clear any stale cache entry
            log.info("Reactivated short URL: {} -> {}", code, request.getOriginalUrl());
            return toStatsResponse(saved, 0L, List.of());
        }

        Url url = new Url();
        url.setShortCode(code);
        url.setOriginalUrl(request.getOriginalUrl());
        url.setExpiresAt(request.getExpiresAt());
        url.setActive(true);

        Url saved = urlRepository.save(url);
        log.info("Created short URL: {} -> {}", code, request.getOriginalUrl());
        return toStatsResponse(saved, 0L, List.of());
    }

    /**
     * Resolves a short code to its original URL and records a click.
     *
     * NOT annotated with @Cacheable here — that lives in UrlCacheService so that
     * every redirect always reaches this method and records the click.
     */
    @Transactional
    public String resolve(String code, HttpServletRequest httpRequest) {
        // Delegates to the cached bean; throws UrlNotFoundException if inactive or expired.
        String originalUrl = urlCacheService.getOriginalUrl(code);

        // Always fetch the entity from DB to record the click.
        Url url = urlRepository.findByShortCode(code)
                .orElseThrow(() -> new UrlNotFoundException(code));

        // Re-check expiry on cache-hit paths (the cache doesn't know the link may have
        // expired since it was first cached). Evict if stale so future callers see 404.
        if (url.getExpiresAt() != null && url.getExpiresAt().isBefore(LocalDateTime.now())) {
            urlCacheService.evict(code);
            throw new UrlNotFoundException(code);
        }

        Click click = new Click();
        click.setUrl(url);
        click.setIpAddress(extractClientIp(httpRequest));
        click.setUserAgent(httpRequest.getHeader("User-Agent"));
        click.setReferer(httpRequest.getHeader("Referer"));
        clickRepository.save(click);

        log.info("Resolved {} -> {} (click recorded)", code, originalUrl);
        return originalUrl;
    }

    @Transactional(readOnly = true)
    public UrlStatsResponse getStats(String code) {
        Url url = urlRepository.findByShortCode(code)
                .orElseThrow(() -> new UrlNotFoundException(code));

        List<Click> clicks = clickRepository.findByUrlIdOrderByClickedAtDesc(url.getId());
        List<LocalDateTime> timestamps = clicks.stream()
                .map(Click::getClickedAt)
                .toList();

        log.info("Fetching stats for short code: {} ({} clicks)", code, clicks.size());
        return toStatsResponse(url, clicks.size(), timestamps);
    }

    @Transactional
    public void delete(String code) {
        Url url = urlRepository.findByShortCode(code)
                .orElseThrow(() -> new UrlNotFoundException(code));

        url.setActive(false);
        urlRepository.save(url);
        urlCacheService.evict(code);
        log.info("Deactivated short code: {}", code);
    }

    private UrlStatsResponse toStatsResponse(Url url, long clickCount, List<LocalDateTime> timestamps) {
        return UrlStatsResponse.builder()
                .shortCode(url.getShortCode())
                .shortUrl(baseUrl + "/" + url.getShortCode())
                .originalUrl(url.getOriginalUrl())
                .clickCount(clickCount)
                .createdAt(url.getCreatedAt())
                .expiresAt(url.getExpiresAt())
                .isActive(url.isActive())
                .clickTimestamps(timestamps)
                .build();
    }

    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
