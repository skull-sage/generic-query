package com.brac.query.engine.dto;

import com.brac.query.engine.model.ValidationError;
import com.brac.query.engine.model.ValidatedQuery;

import java.time.Instant;
import java.util.List;

/** Response for {@code POST /engine/draft}, {@code POST /engine/draft-yml}, and {@code POST /engine/drafted}. */
public record DraftResponse(
        String queryName,
        String status,
        ValidatedQuery validatedQuery,
        List<ValidationError> errors,
        Instant expiresAt
) {
}
