package com.brac.query.engine.dto;

import java.util.List;

public record ListRequest(Filter filter, Page page) {

    public record Filter(
            String module,
            String queryNamePrefix,
            List<String> status,
            String author
    ) {
    }

    public record Page(Integer size, String cursor) {
    }
}
