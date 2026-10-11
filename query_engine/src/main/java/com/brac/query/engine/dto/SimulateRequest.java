package com.brac.query.engine.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

public record SimulateRequest(
        @NotBlank String queryName,
        Map<String, Object> params
) {
}
