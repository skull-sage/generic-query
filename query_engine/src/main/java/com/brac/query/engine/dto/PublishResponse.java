package com.brac.query.engine.dto;

import java.time.Instant;

public record PublishResponse(
        String queryName,
        String status,
        Instant publishedAt,
        String publishedBy
) {
}
