package com.brac.query.engine.web;

import com.brac.query.engine.dto.QueryRolesResponse;
import com.brac.query.engine.store.QueryRolesRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

/**
 * Exposes the seeded identity catalog (realm roles + groups) the UI needs when deciding who may
 * invoke a query. Kept separate from {@code /engine} because it is reference data, not part of the
 * draft/publish lifecycle. Reactive: both catalog reads run on the non-blocking R2DBC pipeline and
 * are combined before the response is emitted.
 */
@RestController
public class QueryRolesController {

    private final QueryRolesRepository repository;

    public QueryRolesController(QueryRolesRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/query-roles")
    public Mono<ResponseEntity<QueryRolesResponse>> queryRoles() {
        return Mono.zip(
                        repository.findRealmRoles().collectList(),
                        repository.findGroups().collectList())
                .map(tuple -> ResponseEntity.ok(new QueryRolesResponse(tuple.getT1(), tuple.getT2())));
    }
}
