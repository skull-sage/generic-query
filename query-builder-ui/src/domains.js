// The domain query services the Query Builder can work against. Each one is a separate
// deployable (order-query, inventory-query) embedding query-engine, with its own database and
// its own published queries.
//
// apiBase is the dev-server proxy prefix (see vite.config.js). serviceUrl is the service's real
// address, shown to users as the endpoint independent client apps call.

export const DOMAINS = [
  {
    key: 'order',
    label: 'OrderQuery',
    service: 'order-query',
    description: 'Read model of the Order domain: order status, branch, sales channel, customer tier and order date.',
    apiBase: '/api/order',
    serviceUrl: 'http://localhost:8081',
    queryModule: 'orders',
    sampleDraft: `queryName: orders.ordersByStatusAndBranch
sql: |-
  SELECT orderId, status, total, branchId, channel, customerTier, orderDate
  FROM order_projection
  WHERE status = :status AND branchId = :branchId
  ORDER BY orderDate DESC
params:
  status: String
  branchId: int
`,
  },
  {
    key: 'inventory',
    label: 'InventoryQuery',
    service: 'inventory-query',
    description: 'Read model of the Inventory domain: stock per SKU and warehouse, category, supplier, reorder levels and stock status.',
    apiBase: '/api/inventory',
    serviceUrl: 'http://localhost:8082',
    queryModule: 'inventory',
    sampleDraft: `queryName: inventory.stockByWarehouseAndStatus
sql: |-
  SELECT sku, product_name, category, quantity_on_hand, reorder_level, status
  FROM inventory_projection
  WHERE warehouse_id = :warehouseId AND status = :status
  ORDER BY sku
params:
  warehouseId: String
  status: String
`,
  },
]

export function findDomain(key) {
  return DOMAINS.find((d) => d.key === key) || null
}
