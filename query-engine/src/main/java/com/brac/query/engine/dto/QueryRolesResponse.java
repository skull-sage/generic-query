package com.brac.query.engine.dto;

import java.util.List;

/**
 * Body for {@code GET /query-roles}: the realm roles and groups the UI offers when choosing who
 * may invoke a query (at publish time) and which identity to call a published query as (at run
 * time). Sourced from the {@code realm_role} and {@code realm_group} tables in Postgres.
 */
public record QueryRolesResponse(
        List<RealmRole> realmRoles,
        List<Group> groups
) {
    public record RealmRole(String name, String description) {
    }

    public record Group(String name, String path, String description) {
    }
}
