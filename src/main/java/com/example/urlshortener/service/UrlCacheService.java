package com.example.urlshortener.service;

import com.example.urlshortener.exception.UrlNotFoundException;
import com.example.urlshortener.model.Url;
import com.example.urlshortener.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Separate bean so @Cacheable is invoked through a Spring proxy (self-calls don't work).
 * Caches only the originalUrl string; click recording stays in UrlShortenerService so
 * every redirect—cached or not—increments the click count.
 */
@Service
@RequiredArgsConstructor
public class UrlCacheService {

    private final UrlRepository urlRepository;

    @Cacheable(cacheNames = "urls", key = "#code")
    public String getOriginalUrl(String code) {
        Url url = urlRepository.findByShortCode(code)
                .orElseThrow(() -> new UrlNotFoundException(code));

        if (!url.isActive()) {
            throw new UrlNotFoundException(code);
        }

        if (url.getExpiresAt() != null && url.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UrlNotFoundException(code);
        }

        return url.getOriginalUrl();
    }

    @CacheEvict(cacheNames = "urls", key = "#code")
    public void evict(String code) {
        // intentionally empty — annotation does the work
    }
}
