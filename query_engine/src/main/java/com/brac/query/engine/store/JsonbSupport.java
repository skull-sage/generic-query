package com.brac.query.engine.store;

import org.postgresql.util.PGobject;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.sql.SQLException;

/**
 * Reads/writes JSONB columns for the Postgres-backed stores. Values are bound as
 * {@link PGobject} (type "jsonb") rather than plain strings so the driver sends them as the
 * native jsonb wire type instead of relying on an implicit text cast.
 */
@Component
public class JsonbSupport {

    private final JsonMapper jsonMapper;

    public JsonbSupport(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    public PGobject toJsonb(Object value) {
        try {
            PGobject jsonbObject = new PGobject();
            jsonbObject.setType("jsonb");
            jsonbObject.setValue(jsonMapper.writeValueAsString(value));
            return jsonbObject;
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to set jsonb value", e);
        }
    }

    public <T> T fromJsonb(String json, Class<T> type) {
        if (json == null) {
            return null;
        }
        return jsonMapper.readValue(json, type);
    }

    public <T> T fromJsonb(String json, TypeReference<T> type) {
        if (json == null) {
            return null;
        }
        return jsonMapper.readValue(json, type);
    }
}
