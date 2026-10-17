package com.brac.query.engine.dto;

import jakarta.validation.constraints.NotBlank;

public record DiscardRequest(
        @NotBlank String queryName
) {
}
