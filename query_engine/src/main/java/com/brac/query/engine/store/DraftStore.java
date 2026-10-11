package com.brac.query.engine.store;

import com.brac.query.engine.model.DraftRecord;
import com.brac.query.engine.model.DraftStatus;
import com.brac.query.engine.model.QueryEntry;
import com.brac.query.engine.model.ValidatedQuery;
import com.brac.query.engine.model.ValidationError;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Draft Store backed by the {@code query_draft} table in Postgres -- no in-memory map. At most
 * one open draft exists per queryName; drafting again overwrites the row via upsert.
 */
@Component
public class DraftStore {

    private final NamedParameterJdbcTemplate jdbc;
    private final JsonbSupport jsonb;

    public DraftStore(NamedParameterJdbcTemplate jdbc, JsonbSupport jsonb) {
        this.jdbc = jdbc;
        this.jsonb = jsonb;
    }

    public Optional<DraftRecord> find(String queryName) {
        List<DraftRecord> results = jdbc.query(
                "SELECT * FROM query_draft WHERE query_name = :queryName",
                Map.of("queryName", queryName),
                rowMapper()
        );
        return results.stream().findFirst();
    }

    public void save(DraftRecord record) {
        MapSqlParameterSource paramSource = new MapSqlParameterSource()
                .addValue("queryName", record.queryName())
                .addValue("sqlText", record.entry().sql())
                .addValue("params", jsonb.toJsonb(record.entry().params()))
                .addValue("allowedRoles", jsonb.toJsonb(record.entry().allowedRoles()))
                .addValue("validatedQuery", record.validatedQuery() == null ? null : jsonb.toJsonb(record.validatedQuery()))
                .addValue("status", record.status().name())
                .addValue("errors", jsonb.toJsonb(record.errors()))
                .addValue("simulated", record.simulated())
                .addValue("author", record.author())
                .addValue("updatedAt", Timestamp.from(record.updatedAt()))
                .addValue("expiresAt", Timestamp.from(record.expiresAt()));

        jdbc.update("""
                INSERT INTO query_draft
                    (query_name, sql_text, params, allowed_roles, validated_query,
                     status, errors, simulated, author, updated_at, expires_at)
                VALUES
                    (:queryName, :sqlText, :params, :allowedRoles, :validatedQuery,
                     :status, :errors, :simulated, :author, :updatedAt, :expiresAt)
                ON CONFLICT (query_name) DO UPDATE SET
                    sql_text = EXCLUDED.sql_text,
                    params = EXCLUDED.params,
                    allowed_roles = EXCLUDED.allowed_roles,
                    validated_query = EXCLUDED.validated_query,
                    status = EXCLUDED.status,
                    errors = EXCLUDED.errors,
                    simulated = EXCLUDED.simulated,
                    author = EXCLUDED.author,
                    updated_at = EXCLUDED.updated_at,
                    expires_at = EXCLUDED.expires_at
                """, paramSource);
    }

    public void delete(String queryName) {
        jdbc.update("DELETE FROM query_draft WHERE query_name = :queryName", Map.of("queryName", queryName));
    }

    public List<DraftRecord> findAllNotExpired(Instant now) {
        return jdbc.query(
                "SELECT * FROM query_draft WHERE expires_at > :now",
                Map.of("now", Timestamp.from(now)),
                rowMapper()
        );
    }

    /** Removes expired drafts and returns how many were swept, per PRD "Nobody comes back". */
    public int sweepExpired(Instant now) {
        return jdbc.update("DELETE FROM query_draft WHERE expires_at <= :now", Map.of("now", Timestamp.from(now)));
    }

    private RowMapper<DraftRecord> rowMapper() {
        return (ResultSet rs, int rowNum) -> toDraftRecord(rs);
    }

    private DraftRecord toDraftRecord(ResultSet rs) throws SQLException {
        QueryEntry entry = new QueryEntry(
                rs.getString("sql_text"),
                jsonb.fromJsonb(rs.getString("params"), new TypeReference<Map<String, String>>() {
                }),
                jsonb.fromJsonb(rs.getString("allowed_roles"), new TypeReference<List<String>>() {
                })
        );
        ValidatedQuery validatedQuery = jsonb.fromJsonb(rs.getString("validated_query"), ValidatedQuery.class);
        List<ValidationError> errors = jsonb.fromJsonb(rs.getString("errors"), new TypeReference<List<ValidationError>>() {
        });
        return new DraftRecord(
                rs.getString("query_name"),
                entry,
                validatedQuery,
                DraftStatus.valueOf(rs.getString("status")),
                errors == null ? List.of() : errors,
                rs.getBoolean("simulated"),
                rs.getString("author"),
                rs.getTimestamp("updated_at").toInstant(),
                rs.getTimestamp("expires_at").toInstant()
        );
    }
}
