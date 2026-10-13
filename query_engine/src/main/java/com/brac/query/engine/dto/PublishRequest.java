package com.brac.query.engine.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

/**
 * Body for {@code POST /engine/publish}. The {@code allowed_roles} (realm roles and/or groups
 * chosen in the publish dialog) are supplied here rather than at draft time, and become the RBAC
 * gate for the published query.
 */
public record PublishRequest(
        @NotBlank String queryName,
        @JsonProperty("allowed_roles") List<String> allowedRoles
) {
}
