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

-- Identity catalog consulted by the UI when publishing a query (to choose which realm roles and
-- groups may invoke it) and when running a published query (to pick an identity to call as). In a
-- real deployment this mirrors the identity provider (e.g. Keycloak realm roles and groups); here
-- it is a self-contained seeded catalog exposed via GET /query-roles.

CREATE TABLE IF NOT EXISTS realm_role (
    name         VARCHAR(255) NOT NULL PRIMARY KEY,
    description  TEXT
);

CREATE TABLE IF NOT EXISTS realm_group (
    name         VARCHAR(255) NOT NULL PRIMARY KEY,
    path         VARCHAR(255) NOT NULL,
    description  TEXT
);

INSERT INTO realm_role (name, description) VALUES
    ('senior_DBA',     'Senior database administrator with broad read access to projections'),
    ('chief_DBA',      'Lead DBA; may invoke any published query'),
    ('data_analyst',   'Business/data analyst running reporting queries'),
    ('branch_manager', 'Branch manager; scoped to their own branch data'),
    ('auditor',        'Read-only auditor for compliance reviews'),
    ('ops_engineer',   'Operations/SRE engineer monitoring live data'),
    ('read_only',      'Generic least-privilege read-only role')
ON CONFLICT (name) DO NOTHING;

INSERT INTO realm_group (name, path, description) VALUES
    ('data-platform',   '/data-platform',             'Data platform engineering team'),
    ('finance',         '/finance',                   'Finance department'),
    ('operations',      '/operations',                'Operations and support'),
    ('audit',           '/audit',                     'Internal audit and compliance'),
    ('branch-managers', '/branch-managers',           'All branch managers'),
    ('executives',      '/executives',                'Executive leadership')
ON CONFLICT (name) DO NOTHING;
