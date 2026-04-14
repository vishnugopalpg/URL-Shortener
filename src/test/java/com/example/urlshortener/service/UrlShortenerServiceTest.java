package com.example.urlshortener.service;

import com.example.urlshortener.dto.ShortenRequest;
import com.example.urlshortener.dto.UrlStatsResponse;
import com.example.urlshortener.exception.UrlNotFoundException;
import com.example.urlshortener.model.Click;
import com.example.urlshortener.model.Url;
import com.example.urlshortener.repository.ClickRepository;
import com.example.urlshortener.repository.UrlRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UrlShortenerServiceTest {

    @Mock
    private UrlRepository urlRepository;

    @Mock
    private ClickRepository clickRepository;

    @Mock
    private CodeGeneratorService codeGeneratorService;

    @Mock
    private UrlCacheService urlCacheService;

    @InjectMocks
    private UrlShortenerService urlShortenerService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(urlShortenerService, "baseUrl", "http://localhost:8080");
    }

    @Test
    void shorten_savesEntityAndReturnsDto() {
        ShortenRequest request = new ShortenRequest();
        request.setOriginalUrl("https://www.example.com");

        when(codeGeneratorService.generateUniqueCode()).thenReturn("abc123");
        when(urlRepository.findByShortCode("abc123")).thenReturn(Optional.empty());

        Url saved = new Url();
        saved.setId(1L);
        saved.setShortCode("abc123");
        saved.setOriginalUrl("https://www.example.com");
        saved.setActive(true);
        ReflectionTestUtils.setField(saved, "createdAt", LocalDateTime.now());
        when(urlRepository.save(any(Url.class))).thenReturn(saved);

        UrlStatsResponse response = urlShortenerService.shorten(request);

        assertThat(response.getShortCode()).isEqualTo("abc123");
        assertThat(response.getShortUrl()).isEqualTo("http://localhost:8080/abc123");
        assertThat(response.getOriginalUrl()).isEqualTo("https://www.example.com");
        assertThat(response.getClickCount()).isZero();
        verify(urlRepository).save(any(Url.class));
    }

    @Test
    void shorten_reactivatesDeactivatedAlias() {
        ShortenRequest request = new ShortenRequest();
        request.setOriginalUrl("https://new-target.com");
        request.setCustomAlias("old-alias");

        Url deactivated = new Url();
        deactivated.setId(5L);
        deactivated.setShortCode("old-alias");
        deactivated.setOriginalUrl("https://old-target.com");
        deactivated.setActive(false);

        when(urlRepository.findByShortCode("old-alias")).thenReturn(Optional.of(deactivated));
        when(urlRepository.save(any(Url.class))).thenAnswer(inv -> inv.getArgument(0));

        UrlStatsResponse response = urlShortenerService.shorten(request);

        assertThat(response.getOriginalUrl()).isEqualTo("https://new-target.com");
        assertThat(response.isActive()).isTrue();
        verify(urlCacheService).evict("old-alias");
    }

    @Test
    void resolve_returnsOriginalUrlAndSavesClick() {
        Url url = new Url();
        url.setId(1L);
        url.setShortCode("abc123");
        url.setOriginalUrl("https://www.example.com");
        url.setActive(true);

        when(urlCacheService.getOriginalUrl("abc123")).thenReturn("https://www.example.com");
        when(urlRepository.findByShortCode("abc123")).thenReturn(Optional.of(url));
        when(clickRepository.save(any(Click.class))).thenAnswer(inv -> inv.getArgument(0));

        HttpServletRequest httpRequest = mock(HttpServletRequest.class);
        when(httpRequest.getHeader("X-Forwarded-For")).thenReturn(null);
        when(httpRequest.getRemoteAddr()).thenReturn("127.0.0.1");
        when(httpRequest.getHeader("User-Agent")).thenReturn("TestAgent/1.0");
        when(httpRequest.getHeader("Referer")).thenReturn(null);

        String result = urlShortenerService.resolve("abc123", httpRequest);

        assertThat(result).isEqualTo("https://www.example.com");

        ArgumentCaptor<Click> clickCaptor = ArgumentCaptor.forClass(Click.class);
        verify(clickRepository).save(clickCaptor.capture());
        assertThat(clickCaptor.getValue().getIpAddress()).isEqualTo("127.0.0.1");
    }

    @Test
    void resolve_throwsUrlNotFoundForExpiredLink() {
        Url expiredUrl = new Url();
        expiredUrl.setShortCode("abc123");
        expiredUrl.setActive(true);
        expiredUrl.setExpiresAt(LocalDateTime.now().minusHours(1));

        // Cache service returns the URL (was cached before expiry)
        when(urlCacheService.getOriginalUrl("abc123")).thenReturn("https://www.example.com");
        when(urlRepository.findByShortCode("abc123")).thenReturn(Optional.of(expiredUrl));

        HttpServletRequest httpRequest = mock(HttpServletRequest.class);

        assertThatThrownBy(() -> urlShortenerService.resolve("abc123", httpRequest))
                .isInstanceOf(UrlNotFoundException.class)
                .hasMessageContaining("abc123");

        verify(urlCacheService).evict("abc123");
    }

    @Test
    void delete_setsIsActiveToFalse() {
        Url url = new Url();
        url.setId(1L);
        url.setShortCode("abc123");
        url.setActive(true);

        when(urlRepository.findByShortCode("abc123")).thenReturn(Optional.of(url));
        when(urlRepository.save(any(Url.class))).thenAnswer(inv -> inv.getArgument(0));

        urlShortenerService.delete("abc123");

        ArgumentCaptor<Url> captor = ArgumentCaptor.forClass(Url.class);
        verify(urlRepository).save(captor.capture());
        assertThat(captor.getValue().isActive()).isFalse();
        verify(urlCacheService).evict("abc123");
    }
}
