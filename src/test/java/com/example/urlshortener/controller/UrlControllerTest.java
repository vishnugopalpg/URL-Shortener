package com.example.urlshortener.controller;

import com.example.urlshortener.dto.ShortenRequest;
import com.example.urlshortener.dto.UrlStatsResponse;
import com.example.urlshortener.exception.GlobalExceptionHandler;
import com.example.urlshortener.exception.UrlNotFoundException;
import com.example.urlshortener.service.UrlShortenerService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({UrlController.class, GlobalExceptionHandler.class})
class UrlControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UrlShortenerService urlShortenerService;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Test
    void postUrls_validBody_returns201() throws Exception {
        ShortenRequest request = new ShortenRequest();
        request.setOriginalUrl("https://www.example.com");

        UrlStatsResponse response = UrlStatsResponse.builder()
                .shortCode("abc123")
                .shortUrl("http://localhost:8080/abc123")
                .originalUrl("https://www.example.com")
                .clickCount(0L)
                .createdAt(LocalDateTime.now())
                .isActive(true)
                .clickTimestamps(List.of())
                .build();

        when(urlShortenerService.shorten(any(ShortenRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/urls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.shortCode").value("abc123"))
                .andExpect(jsonPath("$.shortUrl").value("http://localhost:8080/abc123"));
    }

    @Test
    void postUrls_blankOriginalUrl_returns400() throws Exception {
        ShortenRequest request = new ShortenRequest();
        request.setOriginalUrl("");

        mockMvc.perform(post("/api/urls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation failed"));
    }

    @Test
    void getCode_existingCode_returns302Redirect() throws Exception {
        when(urlShortenerService.resolve(eq("abc123"), any())).thenReturn("https://www.example.com");

        mockMvc.perform(get("/abc123"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://www.example.com"));
    }

    @Test
    void getCode_nonExistingCode_returns404() throws Exception {
        when(urlShortenerService.resolve(eq("missing"), any()))
                .thenThrow(new UrlNotFoundException("missing"));

        mockMvc.perform(get("/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Short code not found: missing"));
    }

    @Test
    void getStats_existingCode_returns200() throws Exception {
        UrlStatsResponse response = UrlStatsResponse.builder()
                .shortCode("abc123")
                .shortUrl("http://localhost:8080/abc123")
                .originalUrl("https://www.example.com")
                .clickCount(5L)
                .createdAt(LocalDateTime.now())
                .isActive(true)
                .clickTimestamps(List.of(LocalDateTime.now(), LocalDateTime.now().minusHours(1)))
                .build();

        when(urlShortenerService.getStats("abc123")).thenReturn(response);

        mockMvc.perform(get("/api/urls/abc123/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shortCode").value("abc123"))
                .andExpect(jsonPath("$.clickCount").value(5));
    }
}
