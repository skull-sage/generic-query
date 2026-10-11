package com.brac.query.engine.dto;

public record ErrorResponse(String error, String message, String queryName) {
}
