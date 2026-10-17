package com.brac.query.engine.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

/**
 * Runtime invocation body for {@code POST /data-query}: {@code { name, params: { ... } } }.
 */
public record DataQueryRequest(
        @NotBlank String name,
        Map<String, Object> params
) {
}
