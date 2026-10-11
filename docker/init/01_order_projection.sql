-- Seed data for the "order_projection" table the orders.ordersByStatusAndBranch query
-- (frontend_service/src/main/resources/orders_sql.yml) reads from.
-- WHERE status = :status AND branchId = :branchId
--
-- Column names below are intentionally unquoted so Postgres folds them to lowercase
-- (orderid, branchid), matching how it folds the unquoted "orderId"/"branchId" references
-- in the query template at read time. Quoting here instead would preserve mixed case and
-- break the match against the template's unquoted identifiers.

CREATE TABLE IF NOT EXISTS order_projection (
    orderId  VARCHAR(32)    NOT NULL PRIMARY KEY,
    status   VARCHAR(32)    NOT NULL,
    total    NUMERIC(12, 2) NOT NULL,
    branchId INT            NOT NULL
);

INSERT INTO order_projection (orderId, status, total, branchId) VALUES
    ('O-1001', 'SHIPPED',     128.50, 12),
    ('O-1002', 'SHIPPED',      64.00, 12),
    ('O-1003', 'PENDING',      42.75, 12),
    ('O-1004', 'SHIPPED',     201.20, 7),
    ('O-1005', 'CANCELLED',    15.00, 12),
    ('O-1006', 'SHIPPED',      99.99, 3),
    ('O-1007', 'PENDING',     310.00, 7),
    ('O-1008', 'SHIPPED',      55.40, 12),
    -- extra rows for more branchId/status variance when simulating with multiple results
    ('O-1009', 'RETURNED',     88.25, 5),
    ('O-1010', 'PROCESSING',  143.10, 9),
    ('O-1011', 'SHIPPED',      27.60, 21),
    ('O-1012', 'PENDING',     176.40, 5),
    ('O-1013', 'CANCELLED',   500.00, 9),
    ('O-1014', 'SHIPPED',      73.95, 21),
    -- additional status variance: QUEUED and IN_PROGRESS alongside existing states
    ('O-1015', 'QUEUED',       34.20, 3),
    ('O-1016', 'IN_PROGRESS', 215.75, 7),
    ('O-1017', 'QUEUED',      120.00, 12),
    ('O-1018', 'IN_PROGRESS',  18.90, 21),
    ('O-1019', 'QUEUED',      365.40, 9),
    ('O-1020', 'IN_PROGRESS',  48.60, 5)
ON CONFLICT (orderId) DO NOTHING;
