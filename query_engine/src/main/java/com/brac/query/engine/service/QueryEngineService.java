package com.brac.query.engine.service;

import com.brac.query.engine.validation.QueryValidator;
import com.brac.query.engine.execution.ProjectionStoreExecutor;
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
import com.brac.query.engine.error.EngineException;
import com.brac.query.engine.model.DraftRecord;
import com.brac.query.engine.model.DraftStatus;
import com.brac.query.engine.model.PublishedQuery;
import com.brac.query.engine.model.ParamType;
import com.brac.query.engine.model.QueryEntry;
import com.brac.query.engine.store.DraftStore;
import com.brac.query.engine.store.PublishedQueryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Orchestrates the query lifecycle described in the PRD: draft -> simulate -> publish/discard,
 * all addressed by {@code queryName} in the request body rather than the URL. The Draft Store
 * and Query Registry are both persisted in Postgres (see {@link DraftStore} and
 * {@link PublishedQueryRepository}) -- no in-memory map holds lifecycle state. There is no
 * versioning: drafting or publishing a queryName again simply overwrites whatever was there
 * before.
 */
@Service
public class QueryEngineService {

    private static final Duration DRAFT_TTL = Duration.ofDays(7);

    private final DraftStore draftStore;
    private final PublishedQueryRepository publishedQueries;
    private final QueryValidator validator;
    private final ProjectionStoreExecutor executor;

    public QueryEngineService(DraftStore draftStore, PublishedQueryRepository publishedQueries, QueryValidator validator,
                               ProjectionStoreExecutor executor) {
        this.draftStore = draftStore;
        this.publishedQueries = publishedQueries;
        this.validator = validator;
        this.executor = executor;
    }

    public DraftResponse draft(DraftRequest request, String author) {
        String queryName = requireQueryName(request.queryName());
        Instant now = Instant.now();

        draftStore.find(queryName).ifPresent(existing -> {
            if (!existing.isExpired(now) && !existing.author().equals(author)) {
                throw new EngineException("DRAFT_LOCKED", HttpStatus.CONFLICT, queryName,
                        "Draft for '" + queryName + "' is held by " + existing.author()
                                + " (expires " + existing.expiresAt() + ")");
            }
        });

        QueryEntry entry = new QueryEntry(request.sql(), request.params(), request.allowedRoles());
        var validationResult = validator.validate(entry);
        Instant expiresAt = now.plus(DRAFT_TTL);

        DraftStatus status = validationResult.hasErrors() ? DraftStatus.DRAFT : DraftStatus.VALIDATED;
        DraftRecord record = new DraftRecord(
                queryName, entry, validationResult.validatedQuery(), status,
                validationResult.errors(), false, author, now, expiresAt
        );
        draftStore.save(record);

        return new DraftResponse(queryName, status.name(), validationResult.validatedQuery(), validationResult.errors(), expiresAt);
    }

    public DraftResponse getDrafted(DraftedLookupRequest request) {
        String queryName = requireQueryName(request.queryName());
        DraftRecord record = loadDraftOrThrow(queryName);
        return new DraftResponse(record.queryName(), record.status().name(), record.validatedQuery(), record.errors(), record.expiresAt());
    }

    public SimulateResponse simulate(SimulateRequest request) {
        String queryName = requireQueryName(request.queryName());
        DraftRecord record = loadDraftOrThrow(queryName);

        if (record.status() == DraftStatus.DRAFT) {
            throw new EngineException("DRAFT_INVALID", HttpStatus.UNPROCESSABLE_ENTITY, queryName,
                    "Draft for '" + queryName + "' has validation errors and cannot be simulated");
        }

        Map<String, Object> params = request.params() == null ? Map.of() : request.params();
        validateParams(queryName, record, params);

        // Stand-in for: OPA policy evaluation (row/field redaction), then execution against the
        // real Projection Store (Postgres) under the row-cap cost limiter. See PRD Phase 1 step 6.
        var execResult = executor.execute(record.validatedQuery(), params);

        Instant now = Instant.now();
        Instant expiresAt = now.plus(DRAFT_TTL);
        draftStore.save(record.withSimulated(now, expiresAt));

        var metrics = new SimulateResponse.Metrics(
                execResult.latencyMs(),
                execResult.rows().size(),
                Math.round(ThreadLocalRandom.current().nextDouble(1, 50) * 100) / 100.0
        );

        return new SimulateResponse(queryName, execResult.rows(), execResult.rows().size(),
                execResult.truncated(), metrics, List.of(), expiresAt);
    }

    public PublishResponse publish(PublishRequest request, String publishedBy) {
        String queryName = requireQueryName(request.queryName());
        DraftRecord record = loadDraftOrThrow(queryName);

        if (!record.simulated()) {
            throw new EngineException("NOT_SIMULATED", HttpStatus.UNPROCESSABLE_ENTITY, queryName,
                    "Draft for '" + queryName + "' has not been simulated; publish requires a fresh simulate first");
        }
        if (record.validatedQuery() == null) {
            throw new EngineException("DRAFT_INVALID", HttpStatus.UNPROCESSABLE_ENTITY, queryName,
                    "Draft for '" + queryName + "' has no validated descriptor");
        }

        Instant now = Instant.now();
        PublishedQuery published = new PublishedQuery(queryName,
                record.entry(), record.validatedQuery(), now, publishedBy);
        publishedQueries.publish(published);
        draftStore.delete(queryName);

        return new PublishResponse(queryName, "PUBLISHED", now, publishedBy);
    }

    public DiscardResponse discard(DiscardRequest request) {
        String queryName = requireQueryName(request.queryName());
        loadDraftOrThrow(queryName);
        draftStore.delete(queryName);
        return new DiscardResponse(queryName, "DISCARDED");
    }

    public ListResponse list(ListRequest request) {
        ListRequest.Filter filter = request == null ? null : request.filter();
        Instant now = Instant.now();

        Map<String, PublishedQuery> publishedByName = new HashMap<>();
        publishedQueries.findAll().forEach(pq -> publishedByName.put(pq.queryName(), pq));

        Map<String, DraftRecord> draftByName = new HashMap<>();
        draftStore.findAllNotExpired(now).forEach(d -> draftByName.put(d.queryName(), d));

        java.util.Set<String> allNames = new java.util.TreeSet<>();
        allNames.addAll(publishedByName.keySet());
        allNames.addAll(draftByName.keySet());

        List<ListResponse.Item> items = new ArrayList<>();
        for (String name : allNames) {
            PublishedQuery published = publishedByName.get(name);
            DraftRecord draft = draftByName.get(name);

            if (!matchesFilter(name, published, draft, filter)) {
                continue;
            }

            ListResponse.PublishedSummary publishedSummary = published == null ? null : new ListResponse.PublishedSummary(
                    published.validatedQuery().sql(), published.validatedQuery().params(),
                    published.validatedQuery().allowedRoles(), published.publishedAt(), published.publishedBy()
            );
            ListResponse.DraftSummary draftSummary = draft == null ? null : new ListResponse.DraftSummary(
                    draft.status().name(), draft.simulated(), draft.author(), draft.updatedAt(), draft.expiresAt()
            );
            items.add(new ListResponse.Item(name, publishedSummary, draftSummary));
        }

        int pageSize = (request != null && request.page() != null && request.page().size() != null)
                ? Math.min(request.page().size(), 200) : 50;
        List<ListResponse.Item> page = items.size() > pageSize ? items.subList(0, pageSize) : items;
        String nextCursor = items.size() > pageSize ? page.get(page.size() - 1).queryName() : null;

        return new ListResponse(page, nextCursor);
    }

    /**
     * Runtime invocation (Phase 2): resolves the published query, applies the operation-level
     * RBAC gate, validates params, and executes against the projection store.
     */
    public InvocationResult invoke(String name, Map<String, Object> params, List<String> callerRoles) {
        String queryName = resolveQueryName(name);
        PublishedQuery published = publishedQueries.find(queryName)
                .orElseThrow(() -> new EngineException("QUERY_NOT_FOUND", HttpStatus.NOT_FOUND, queryName,
                        "No published query named '" + queryName + "'"));

        List<String> allowedRoles = published.validatedQuery().allowedRoles();
        boolean permitted = callerRoles.stream().anyMatch(allowedRoles::contains);
        if (!permitted) {
            throw new EngineException("FORBIDDEN", HttpStatus.FORBIDDEN, queryName,
                    "Role(s) " + callerRoles + " not permitted to invoke '" + queryName + "'");
        }

        for (var paramSpec : published.validatedQuery().params()) {
            if (!params.containsKey(paramSpec.name())) {
                throw new EngineException("INVALID_ARGUMENT", HttpStatus.BAD_REQUEST, queryName,
                        "Missing required param '" + paramSpec.name() + "'");
            }
            Object value = params.get(paramSpec.name());
            if (!typeMatches(paramSpec.type(), value)) {
                throw new EngineException("INVALID_ARGUMENT", HttpStatus.BAD_REQUEST, queryName,
                        paramSpec.name() + " expected " + paramSpec.type() + ", received "
                                + (value == null ? "null" : value.getClass().getSimpleName()));
            }
        }

        var execResult = executor.execute(published.validatedQuery(), params);
        return new InvocationResult(queryName, execResult.rows());
    }

    public record InvocationResult(String queryName, List<Map<String, Object>> rows) {
    }

    /** Accepts either a bare name ("orderById") or a fully namespaced one ("orders.orderById"). */
    private String resolveQueryName(String name) {
        if (name == null || name.isBlank()) {
            throw new EngineException("QUERY_NOT_FOUND", HttpStatus.NOT_FOUND, name, "name is required");
        }
        if (name.contains(".")) {
            return name;
        }
        List<String> matches = publishedQueries.allQueryNames().stream()
                .filter(qn -> qn.endsWith("." + name))
                .toList();
        if (matches.size() == 1) {
            return matches.get(0);
        }
        throw new EngineException("QUERY_NOT_FOUND", HttpStatus.NOT_FOUND, name,
                matches.isEmpty() ? "No published query named '" + name + "'"
                        : "Ambiguous name '" + name + "' matches multiple queries: " + matches);
    }

    // --- helpers -----------------------------------------------------------------------------

    private boolean matchesFilter(String queryName, PublishedQuery published, DraftRecord draft, ListRequest.Filter filter) {
        if (filter == null) {
            return true;
        }
        if (filter.module() != null && !queryName.startsWith(filter.module() + ".")) {
            return false;
        }
        if (filter.queryNamePrefix() != null && !queryName.startsWith(filter.queryNamePrefix())) {
            return false;
        }
        if (filter.author() != null) {
            boolean authorMatches = draft != null && draft.author().equals(filter.author());
            if (!authorMatches) {
                return false;
            }
        }
        if (filter.status() != null && !filter.status().isEmpty()) {
            boolean statusMatches = (published != null && filter.status().contains("PUBLISHED"))
                    || (draft != null && filter.status().contains(draft.status().name()));
            if (!statusMatches) {
                return false;
            }
        }
        return true;
    }

    private void validateParams(String queryName, DraftRecord record, Map<String, Object> params) {
        if (record.validatedQuery() == null) {
            return;
        }
        for (var paramSpec : record.validatedQuery().params()) {
            if (!params.containsKey(paramSpec.name())) {
                throw new EngineException("INVALID_ARGUMENT", HttpStatus.BAD_REQUEST, queryName,
                        "Missing required param '" + paramSpec.name() + "'");
            }
            Object value = params.get(paramSpec.name());
            if (!typeMatches(paramSpec.type(), value)) {
                throw new EngineException("INVALID_ARGUMENT", HttpStatus.BAD_REQUEST, queryName,
                        paramSpec.name() + " expected " + paramSpec.type() + ", received "
                                + (value == null ? "null" : value.getClass().getSimpleName()));
            }
        }
    }

    private boolean typeMatches(ParamType type, Object value) {
        if (value == null) {
            return false;
        }
        return switch (type) {
            case STRING -> value instanceof String;
            case INT -> value instanceof Integer;
            case LONG -> value instanceof Integer || value instanceof Long;
            case DECIMAL -> value instanceof Number;
            case BOOLEAN -> value instanceof Boolean;
            case DATE, DATETIME -> value instanceof String;
        };
    }

    private DraftRecord loadDraftOrThrow(String queryName) {
        return draftStore.find(queryName)
                .filter(d -> !d.isExpired(Instant.now()))
                .orElseThrow(() -> new EngineException("DRAFT_NOT_FOUND", HttpStatus.NOT_FOUND, queryName,
                        "No open draft for '" + queryName + "' (never drafted, published, discarded, or expired)"));
    }

    private String requireQueryName(String queryName) {
        if (queryName == null || queryName.isBlank() || !queryName.matches("^[a-zA-Z0-9_]+\\.[a-zA-Z0-9_]+$")) {
            throw new EngineException("INVALID_QUERY_NAME", HttpStatus.BAD_REQUEST, queryName,
                    "queryName must be in '{module}.{name}' form");
        }
        return queryName;
    }

}
