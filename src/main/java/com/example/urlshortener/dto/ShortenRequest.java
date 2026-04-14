package com.example.urlshortener.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.validator.constraints.URL;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class ShortenRequest {

    @NotBlank(message = "Original URL must not be blank")
    @URL(message = "Must be a valid URL")
    private String originalUrl;

    @Size(max = 20, message = "Custom alias must be at most 20 characters")
    private String customAlias;

    private LocalDateTime expiresAt;
}
