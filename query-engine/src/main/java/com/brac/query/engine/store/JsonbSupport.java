package com.brac.query.engine.store;

import io.r2dbc.postgresql.codec.Json;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * Reads/writes JSONB columns for the R2DBC-backed stores. Values are bound as
 * {@link Json} (r2dbc-postgresql's native jsonb wrapper) so the driver sends them as the real
 * jsonb wire type, and are read back from the {@link Json} the driver decodes a jsonb column into.
 */
@Component
public class JsonbSupport {

    private final JsonMapper jsonMapper;

    public JsonbSupport(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    /** Serializes a value to a jsonb-bindable {@link Json}. Never null -- a null value becomes JSON null. */
    public Json toJson(Object value) {
        return Json.of(jsonMapper.writeValueAsString(value));
    }

    public <T> T fromJson(Json json, Class<T> type) {
        if (json == null) {
            return null;
        }
        return jsonMapper.readValue(json.asString(), type);
    }

    public <T> T fromJson(Json json, TypeReference<T> type) {
        if (json == null) {
            return null;
        }
        return jsonMapper.readValue(json.asString(), type);
    }
}
