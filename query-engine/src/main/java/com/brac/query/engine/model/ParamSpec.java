package com.brac.query.engine.model;

/** One resolved {@code :name} parameter extracted from a SQL template, paired with its declared type. */
public record ParamSpec(String name, ParamType type) {
}
