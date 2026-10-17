package com.brac.query.engine.error;

import org.springframework.http.HttpStatus;

/** Carries one of the PRD's error codes (DRAFT_NOT_FOUND, DRAFT_LOCKED, ...) plus the HTTP status to answer with. */
public class EngineException extends RuntimeException {

    private final String code;
    private final HttpStatus status;
    private final String queryName;

    public EngineException(String code, HttpStatus status, String queryName, String message) {
        super(message);
        this.code = code;
        this.status = status;
        this.queryName = queryName;
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getQueryName() {
        return queryName;
    }
}
