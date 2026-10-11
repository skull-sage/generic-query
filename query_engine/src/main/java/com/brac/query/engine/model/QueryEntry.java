package com.brac.query.engine.model;

import java.util.Map;

/**
 * The query entry an author writes, equivalent to one YAML list item in a {@code {module}_sql.yml}
 * file (see PRD "Query definition format").
 */
public record QueryEntry(
        String sql,
        Map<String, String> params,
        java.util.List<String> allowedRoles
) {
}
