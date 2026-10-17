package com.brac.query.engine.model;

import java.util.Locale;
import java.util.Optional;

/** Supported {@code params} type values from the query definition YAML (see PRD "Query definition format"). */
public enum ParamType {
    STRING,
    INT,
    LONG,
    DECIMAL,
    BOOLEAN,
    DATE,
    DATETIME;

    public static Optional<ParamType> fromDeclared(String declared) {
        if (declared == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(ParamType.valueOf(declared.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
