-- Persistent storage for the query engine's own drafting/publishing lifecycle: query_draft
-- backs the Draft Store and published_query backs the Query Registry. Both replace what used
-- to be ConcurrentHashMaps in the application's heap -- query_engine keeps no lifecycle state
-- in memory; every draft, published query, and list read goes through Postgres.

CREATE TABLE IF NOT EXISTS query_draft (
    query_name       VARCHAR(255)  NOT NULL PRIMARY KEY,
    sql_text         TEXT          NOT NULL,
    params           JSONB         NOT NULL,
    allowed_roles    JSONB         NOT NULL,
    validated_query  JSONB,
    status           VARCHAR(32)   NOT NULL,
    errors           JSONB         NOT NULL,
    simulated        BOOLEAN       NOT NULL DEFAULT FALSE,
    author           VARCHAR(255)  NOT NULL,
    updated_at       TIMESTAMPTZ   NOT NULL,
    expires_at       TIMESTAMPTZ   NOT NULL
);

CREATE TABLE IF NOT EXISTS published_query (
    query_name       VARCHAR(255)  NOT NULL PRIMARY KEY,
    sql_text         TEXT          NOT NULL,
    params           JSONB         NOT NULL,
    allowed_roles    JSONB         NOT NULL,
    validated_query  JSONB         NOT NULL,
    published_at     TIMESTAMPTZ   NOT NULL,
    published_by     VARCHAR(255)  NOT NULL
);
