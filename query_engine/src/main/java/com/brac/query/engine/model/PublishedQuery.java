package com.brac.query.engine.model;

import java.time.Instant;

/**
 * The published query that client apps can call, persisted in Postgres (see {@code published_query}).
 * No versioning: publishing a queryName again simply replaces the previous entry.
 */
public record PublishedQuery(
        String queryName,
        QueryEntry entry,
        ValidatedQuery validatedQuery,
        Instant publishedAt,
        String publishedBy
) {
}
