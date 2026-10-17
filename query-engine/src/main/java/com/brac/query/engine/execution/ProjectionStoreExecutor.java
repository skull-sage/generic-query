package com.brac.query.engine.execution;

import com.brac.query.engine.model.ParamSpec;
import com.brac.query.engine.model.ParamType;
import com.brac.query.engine.model.ValidatedQuery;
import io.r2dbc.spi.ColumnMetadata;
import io.r2dbc.spi.Row;
import io.r2dbc.spi.RowMetadata;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Executes a {@link ValidatedQuery}'s sql template against the real Postgres "projection store"
 * reactively through {@link DatabaseClient} (R2DBC), under a row cap -- the dry-run stand-in for
 * the PRD's cost limiter (row cap / timeout / EXPLAIN-only).
 *
 * <p>The template's own {@code :paramName} placeholders are the named markers {@code DatabaseClient}
 * parses and binds through the driver's native parameter binding (translated to Postgres {@code $N}
 * positional markers), so argument values are never string-concatenated into the SQL. The set of
 * bound names is exactly {@link ValidatedQuery#params()} -- the tokens the validator found in the
 * sql -- so every marker in the template is bound and nothing extra is.
 */
@Component
public class ProjectionStoreExecutor {

    private static final int ROW_CAP = 200;

    private final DatabaseClient db;

    public ProjectionStoreExecutor(DatabaseClient db) {
        this.db = db;
    }

    public Mono<ExecutionResult> execute(ValidatedQuery validatedQuery, Map<String, Object> args) {
        return Mono.defer(() -> {
            long start = System.nanoTime();

            DatabaseClient.GenericExecuteSpec spec = db.sql(validatedQuery.sql());
            for (ParamSpec paramSpec : validatedQuery.params()) {
                Object value = coerce(paramSpec.type(), args.get(paramSpec.name()));
                spec = (value == null)
                        ? spec.bindNull(paramSpec.name(), javaType(paramSpec.type()))
                        : spec.bind(paramSpec.name(), value);
            }

            return spec.map(ProjectionStoreExecutor::toRow)
                    .all()
                    .collectList()
                    .map(rows -> {
                        long latencyMs = Math.max(1, (System.nanoTime() - start) / 1_000_000);
                        boolean truncated = rows.size() > ROW_CAP;
                        List<Map<String, Object>> capped = truncated ? List.copyOf(rows.subList(0, ROW_CAP)) : rows;
                        return new ExecutionResult(capped, latencyMs, truncated);
                    });
        });
    }

    /** Converts declared/typed args into values the R2DBC driver can bind directly. */
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
            case DATETIME -> OffsetDateTime.ofInstant(Instant.parse(raw.toString()), ZoneOffset.UTC);
        };
    }

    /** Java type used for {@code bindNull} so the driver knows the column type for a null argument. */
    private Class<?> javaType(ParamType type) {
        return switch (type) {
            case STRING -> String.class;
            case INT -> Integer.class;
            case LONG -> Long.class;
            case DECIMAL -> java.math.BigDecimal.class;
            case BOOLEAN -> Boolean.class;
            case DATE -> LocalDate.class;
            case DATETIME -> OffsetDateTime.class;
        };
    }

    private static Map<String, Object> toRow(Row row, RowMetadata meta) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (ColumnMetadata columnMeta : meta.getColumnMetadatas()) {
            String name = columnMeta.getName();
            result.put(name, row.get(name));
        }
        return result;
    }

    public record ExecutionResult(List<Map<String, Object>> rows, long latencyMs, boolean truncated) {
    }
}
