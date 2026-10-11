package com.brac.query.engine.store;

import com.brac.query.engine.model.PublishedQuery;
import com.brac.query.engine.model.QueryEntry;
import com.brac.query.engine.model.ValidatedQuery;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Query Registry backed by the {@code published_query} table in Postgres -- no in-memory map.
 * At most one published entry per queryName; publishing again overwrites the row via upsert.
 * No versioning.
 */
@Component
public class PublishedQueryRepository {

    private final NamedParameterJdbcTemplate jdbc;
    private final JsonbSupport jsonb;

    public PublishedQueryRepository(NamedParameterJdbcTemplate jdbc, JsonbSupport jsonb) {
        this.jdbc = jdbc;
        this.jsonb = jsonb;
    }

    public Optional<PublishedQuery> find(String queryName) {
        List<PublishedQuery> results = jdbc.query(
                "SELECT * FROM published_query WHERE query_name = :queryName",
                Map.of("queryName", queryName),
                rowMapper()
        );
        return results.stream().findFirst();
    }

    public void publish(PublishedQuery publishedQuery) {
        MapSqlParameterSource paramSource = new MapSqlParameterSource()
                .addValue("queryName", publishedQuery.queryName())
                .addValue("sqlText", publishedQuery.entry().sql())
                .addValue("params", jsonb.toJsonb(publishedQuery.entry().params()))
                .addValue("allowedRoles", jsonb.toJsonb(publishedQuery.entry().allowedRoles()))
                .addValue("validatedQuery", jsonb.toJsonb(publishedQuery.validatedQuery()))
                .addValue("publishedAt", Timestamp.from(publishedQuery.publishedAt()))
                .addValue("publishedBy", publishedQuery.publishedBy());

        jdbc.update("""
                INSERT INTO published_query
                    (query_name, sql_text, params, allowed_roles, validated_query,
                     published_at, published_by)
                VALUES
                    (:queryName, :sqlText, :params, :allowedRoles, :validatedQuery,
                     :publishedAt, :publishedBy)
                ON CONFLICT (query_name) DO UPDATE SET
                    sql_text = EXCLUDED.sql_text,
                    params = EXCLUDED.params,
                    allowed_roles = EXCLUDED.allowed_roles,
                    validated_query = EXCLUDED.validated_query,
                    published_at = EXCLUDED.published_at,
                    published_by = EXCLUDED.published_by
                """, paramSource);
    }

    public List<PublishedQuery> findAll() {
        return jdbc.query("SELECT * FROM published_query", rowMapper());
    }

    public Set<String> allQueryNames() {
        return Set.copyOf(jdbc.queryForList("SELECT query_name FROM published_query", Map.of(), String.class));
    }

    private RowMapper<PublishedQuery> rowMapper() {
        return (ResultSet rs, int rowNum) -> toPublishedQuery(rs);
    }

    private PublishedQuery toPublishedQuery(ResultSet rs) throws SQLException {
        QueryEntry entry = new QueryEntry(
                rs.getString("sql_text"),
                jsonb.fromJsonb(rs.getString("params"), new TypeReference<Map<String, String>>() {
                }),
                jsonb.fromJsonb(rs.getString("allowed_roles"), new TypeReference<List<String>>() {
                })
        );
        ValidatedQuery validatedQuery = jsonb.fromJsonb(rs.getString("validated_query"), ValidatedQuery.class);
        return new PublishedQuery(
                rs.getString("query_name"),
                entry,
                validatedQuery,
                rs.getTimestamp("published_at").toInstant(),
                rs.getString("published_by")
        );
    }
}
