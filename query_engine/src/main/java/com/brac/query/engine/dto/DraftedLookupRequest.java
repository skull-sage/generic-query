package com.brac.query.engine.dto;

import jakarta.validation.constraints.NotBlank;

/** Body for {@code POST /engine/drafted} (was {@code /engine/draft}, the resume lookup). */
public record DraftedLookupRequest(@NotBlank String queryName) {
}
