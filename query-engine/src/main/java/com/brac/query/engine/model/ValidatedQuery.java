package com.brac.query.engine.model;

import java.util.List;

/**
 * Lightweight descriptor built by validating a drafted query entry: the sql template itself, the
 * extracted/declared param list, the resolved return shape, and the allowed roles.
 * No select/where AST is produced -- see PRD "What the registry engine actually builds".
 */
public record ValidatedQuery(
        String sql,
        List<ParamSpec> params,
        List<String> allowedRoles
) {
}
