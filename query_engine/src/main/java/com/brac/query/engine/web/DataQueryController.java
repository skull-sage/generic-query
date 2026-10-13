package com.brac.query.engine.web;

import com.brac.query.engine.dto.DataQueryRequest;
import com.brac.query.engine.service.QueryEngineService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Phase 2 runtime invocation endpoint from the PRD, reactive end to end. This PoC stands in the
 * caller's roles with the X-Roles header rather than a real JWT, since no auth stack exists yet.
 */
@RestController
public class DataQueryController {

    private final QueryEngineService service;

    public DataQueryController(QueryEngineService service) {
        this.service = service;
    }

    @PostMapping("/data-query")
    public Mono<ResponseEntity<List<Map<String, Object>>>> invoke(@Valid @RequestBody DataQueryRequest request,
                                                                  @RequestHeader(value = "X-Roles", defaultValue = "senior_DBA") String rolesHeader) {
        List<String> roles = Arrays.stream(rolesHeader.split(","))
                .map(String::trim)
                .filter(r -> !r.isEmpty())
                .toList();

        Map<String, Object> params = request.params() == null ? Map.of() : request.params();
        return service.invoke(request.name(), params, roles)
                .map(result -> ResponseEntity.ok(result.rows()));
    }
}
