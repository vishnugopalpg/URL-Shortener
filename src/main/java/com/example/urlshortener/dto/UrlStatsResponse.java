package com.example.urlshortener.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class UrlStatsResponse {

    private String shortCode;
    private String shortUrl;
    private String originalUrl;
    private long clickCount;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    // @JsonProperty forces the JSON key to "isActive".
    // Without it, Lombok's isActive() getter causes Jackson to strip the "is" prefix
    // and emit "active" instead — making the frontend always see undefined/false.
    @JsonProperty("isActive")
    private boolean isActive;
    private List<LocalDateTime> clickTimestamps;
}
