package com.brac.query.engine.model;

import java.time.Instant;
import java.util.List;

/**
 * Server-side draft persisted in Postgres (see {@code query_draft}), keyed by queryName. See PRD
 * "How drafting stores the draft". At most one open draft exists per queryName. No versioning:
 * drafting a queryName again simply overwrites the stored draft, and publishing simply overwrites
 * any previously published query of the same name.
 */
public record DraftRecord(
        String queryName,
        QueryEntry entry,
        ValidatedQuery validatedQuery,
        DraftStatus status,
        List<ValidationError> errors,
        boolean simulated,
        String author,
        Instant updatedAt,
        Instant expiresAt
) {

    public DraftRecord withSimulated(Instant now, Instant newExpiry) {
        return new DraftRecord(queryName, entry, validatedQuery, status, errors, true, author, now, newExpiry);
    }

    public boolean isExpired(Instant now) {
        return now.isAfter(expiresAt);
    }
}
