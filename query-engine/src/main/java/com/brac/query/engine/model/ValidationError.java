package com.brac.query.engine.model;

/** A single error found while validating a drafted query entry (undeclared param, unknown result type, ...). */
public record ValidationError(String code, String param, String message) {
}
