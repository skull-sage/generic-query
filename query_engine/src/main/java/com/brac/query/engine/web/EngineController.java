package com.brac.query.engine.web;

import com.brac.query.engine.dto.DraftRequest;
import com.brac.query.engine.dto.DraftResponse;
import com.brac.query.engine.dto.DiscardRequest;
import com.brac.query.engine.dto.DiscardResponse;
import com.brac.query.engine.dto.DraftedLookupRequest;
import com.brac.query.engine.dto.PublishRequest;
import com.brac.query.engine.dto.PublishResponse;
import com.brac.query.engine.dto.ListRequest;
import com.brac.query.engine.dto.ListResponse;
import com.brac.query.engine.dto.SimulateRequest;
import com.brac.query.engine.dto.SimulateResponse;
import com.brac.query.engine.service.QueryEngineService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import tools.jackson.dataformat.yaml.YAMLMapper;

import java.util.Set;

/**
 * Phase 1 design-time endpoints from the PRD, all fixed paths under /engine. The query being
 * acted on is always identified by {@code queryName} in the request body, never in the URL. Every
 * handler is reactive: it returns a {@link Mono} that resolves on the non-blocking R2DBC pipeline.
 *
 * <p>{@code /engine/draft} and {@code /engine/draft-yml} are two separate endpoints for the same
 * draft operation: the former accepts/produces JSON, the latter accepts YAML and produces JSON.
 * JSON remains the default content type for every other endpoint.
 */
@RestController
@RequestMapping("/engine")
public class EngineController {

    private final QueryEngineService service;
    private final Validator validator;
    private final YAMLMapper yamlMapper = YAMLMapper.builder().build();

    public EngineController(QueryEngineService service, Validator validator) {
        this.service = service;
        this.validator = validator;
    }

    @PostMapping(path = "/draft", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<ResponseEntity<DraftResponse>> draft(@Valid @RequestBody DraftRequest request,
                                                      @RequestHeader(value = "X-Author", defaultValue = "anonymous") String author) {
        return service.draft(request, author).map(ResponseEntity::ok);
    }

    @PostMapping(path = "/draft-yml", consumes = MediaType.APPLICATION_YAML_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<ResponseEntity<DraftResponse>> draftYml(@RequestBody String yamlBody,
                                                        @RequestHeader(value = "X-Author", defaultValue = "anonymous") String author) {
        return Mono.fromCallable(() -> {
                    DraftRequest request = yamlMapper.readValue(yamlBody, DraftRequest.class);
                    Set<ConstraintViolation<DraftRequest>> violations = validator.validate(request);
                    if (!violations.isEmpty()) {
                        throw new ConstraintViolationException(violations);
                    }
                    return request;
                })
                .flatMap(request -> service.draft(request, author))
                .map(ResponseEntity::ok);
    }

    @PostMapping("/drafted")
    public Mono<ResponseEntity<DraftResponse>> getDrafted(@Valid @RequestBody DraftedLookupRequest request) {
        return service.getDrafted(request).map(ResponseEntity::ok);
    }

    @PostMapping("/simulate")
    public Mono<ResponseEntity<SimulateResponse>> simulate(@Valid @RequestBody SimulateRequest request) {
        return service.simulate(request).map(ResponseEntity::ok);
    }

    @PostMapping("/publish")
    public Mono<ResponseEntity<PublishResponse>> publish(@Valid @RequestBody PublishRequest request,
                                                         @RequestHeader(value = "X-Author", defaultValue = "anonymous") String publishedBy) {
        return service.publish(request, publishedBy)
                .map(response -> ResponseEntity.status(HttpStatus.CREATED).body(response));
    }

    @PostMapping("/discard")
    public Mono<ResponseEntity<DiscardResponse>> discard(@Valid @RequestBody DiscardRequest request) {
        return service.discard(request).map(ResponseEntity::ok);
    }

    @PostMapping("/list")
    public Mono<ResponseEntity<ListResponse>> list(@RequestBody(required = false) ListRequest request) {
        return service.list(request).map(ResponseEntity::ok);
    }
}
