package com.brac.query.engine.execution;

import com.brac.query.engine.model.ParamType;
import com.brac.query.engine.model.ValidatedQuery;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Executes a {@link ValidatedQuery}'s sql template against the real Postgres "projection store"
 * via a NamedParameterJdbcTemplate, under a row cap -- the dry-run stand-in for the PRD's cost
 * limiter (row cap / timeout / EXPLAIN-only). Replaces the earlier fakeExecute() echo.
 *
 * The template's own :paramName placeholders bind natively through Spring's named-parameter
 * support, so arguments are never string-concatenated into the SQL (see PRD "Query definition
 * format": "The sql field stays a template... bound through the driver's native named-parameter
 * binding").
 */
@Component
public class ProjectionStoreExecutor {

    private static final int ROW_CAP = 200;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public ProjectionStoreExecutor(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public ExecutionResult execute(ValidatedQuery validatedQuery, Map<String, Object> args) {
        Map<String, Object> boundArgs = bind(validatedQuery, args);
        long start = System.nanoTime();

        List<Map<String, Object>> rows = jdbcTemplate.query(
                validatedQuery.sql(),
                boundArgs,
                (ResultSet rs, int rowNum) -> toRow(rs)
        );

        long latencyMs = Math.max(1, (System.nanoTime() - start) / 1_000_000);
        boolean truncated = rows.size() > ROW_CAP;
        List<Map<String, Object>> capped = truncated ? rows.subList(0, ROW_CAP) : rows;
        return new ExecutionResult(capped, latencyMs, truncated);
    }

    /** Converts declared/typed args into JDBC-friendly values the driver can bind directly. */
    private Map<String, Object> bind(ValidatedQuery validatedQuery, Map<String, Object> args) {
        Map<String, Object> bound = new LinkedHashMap<>();
        for (var paramSpec : validatedQuery.params()) {
            Object raw = args.get(paramSpec.name());
            bound.put(paramSpec.name(), coerce(paramSpec.type(), raw));
        }
        return bound;
    }

    private Object coerce(ParamType type, Object raw) {
        if (raw == null) {
            return null;
        }
        return switch (type) {
            case STRING -> raw.toString();
            case INT -> raw instanceof Number n ? n.intValue() : Integer.parseInt(raw.toString());
            case LONG -> raw instanceof Number n ? n.longValue() : Long.parseLong(raw.toString());
            case DECIMAL -> raw instanceof java.math.BigDecimal bd ? bd : new java.math.BigDecimal(raw.toString());
            case BOOLEAN -> raw instanceof Boolean b ? b : Boolean.parseBoolean(raw.toString());
            case DATE -> LocalDate.parse(raw.toString());
            case DATETIME -> Timestamp.from(Instant.parse(raw.toString()));
        };
    }

    private Map<String, Object> toRow(ResultSet rs) throws SQLException {
        Map<String, Object> row = new LinkedHashMap<>();
        var meta = rs.getMetaData();
        for (int i = 1; i <= meta.getColumnCount(); i++) {
            row.put(meta.getColumnLabel(i), rs.getObject(i));
        }
        return row;
    }

    public record ExecutionResult(List<Map<String, Object>> rows, long latencyMs, boolean truncated) {
    }
}
