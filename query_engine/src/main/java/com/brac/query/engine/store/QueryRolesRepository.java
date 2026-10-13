package com.brac.query.engine.store;

import com.brac.query.engine.dto.QueryRolesResponse;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

/**
 * Reads the seeded identity catalog ({@code realm_role} and {@code realm_group}) that backs
 * {@code GET /query-roles}, reactively via {@link DatabaseClient}. Read-only -- the catalog is
 * managed by the identity provider in a real deployment and is seeded here (see
 * 02_query_engine_schema.sql).
 */
@Component
public class QueryRolesRepository {

    private final DatabaseClient db;

    public QueryRolesRepository(DatabaseClient db) {
        this.db = db;
    }

    public Flux<QueryRolesResponse.RealmRole> findRealmRoles() {
        return db.sql("SELECT name, description FROM realm_role ORDER BY name")
                .map((row, meta) -> new QueryRolesResponse.RealmRole(
                        row.get("name", String.class),
                        row.get("description", String.class)))
                .all();
    }

    public Flux<QueryRolesResponse.Group> findGroups() {
        return db.sql("SELECT name, path, description FROM realm_group ORDER BY name")
                .map((row, meta) -> new QueryRolesResponse.Group(
                        row.get("name", String.class),
                        row.get("path", String.class),
                        row.get("description", String.class)))
                .all();
    }
}
