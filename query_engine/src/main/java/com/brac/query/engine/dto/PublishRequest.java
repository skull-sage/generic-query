package com.brac.query.engine.dto;

import jakarta.validation.constraints.NotBlank;

public record PublishRequest(
        @NotBlank String queryName
) {
}
