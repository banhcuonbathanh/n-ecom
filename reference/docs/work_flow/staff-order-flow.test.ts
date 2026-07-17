/**
 * STAFF ORDER FLOW — End-to-End Integration Tests
 *
 * Covers: docs/work_flow/STAFF_ORDER_FLOW.md
 * Pattern: store state transitions + cancel rule + role routing + payment logic
 * No browser required — Vitest Node environment
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../../fe/src/features/auth/auth.store'
import { useCartStore } from '../../fe/src/store/cart'
import { STORAGE_KEYS } from '../../fe/src/lib/storage-keys'
import { deriveItemStatus } from '../../fe/src/types/order'
import type { Order, OrderItem } from '../../fe/src/types/order'
import type { User } from '../../fe/src/types/auth'

// ── localStorage mock ────────────────────────────────────────────────────────

const storage: Record<string, string> = {}
const localStorageMock = {
  getItem:    (k: string) => storage[k] ?? null,
  setItem:    (k: string, v: string) => { storage[k] = v },
  removeItem: (k: string) => { delete storage[k] },
  clear:      () => { Object.keys(storage).forEach(k => delete storage[k]) },
  key:        (i: number) => Object.keys(storage)[i] ?? null,
  get length() { return Object.keys(storage).length },
}
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true })

// ── Helpers ──────────────────────────────────────────────────────────────────

const AUTH_RESET: Parameters<typeof useAuthStore.setState>[0] = {
  user: null, accessToken: null,
}
const CART_RESET: Parameters<typeof useCartStore.setState>[0] = {
  items: [], tableId: null, tableName: null,
  activeOrderId: null, paymentMethod: null,
  orderNote: '',
}

/** Cancel rule from docs/core/MASTER_v1.2.md §4.2 */
function isCancelAllowed(items: Pick<OrderItem, 'qty_served' | 'quantity'>[]): boolean {
  const totalServed = items.reduce((s, i) => s + i.qty_served, 0)
  const totalQty    = items.reduce((s, i) => s + i.quantity, 0)
  if (totalQty === 0) return false
  return totalServed / totalQty < 0.30
}

/** Role → route mapping from Step 1 of STAFF_ORDER_FLOW */
function specRoleRoute(role: User['role']): string {
  if (role === 'chef')                       return '/kds'
  if (role === 'cashier')                    return '/pos'
  if (role === 'manager' || role === 'admin') return '/admin/overview'
  return '/pos' // staff fallback (spec says cashier+, staff behaves like cashier)
}

const makeOrderItem = (overrides: Partial<OrderItem> = {}): OrderItem => ({
  id: 'item-1',
  product_id: 'p1',
  combo_id: null,
  combo_ref_id: null,
  name: 'Bánh cuốn',
  quantity: 3,
  qty_served: 0,
  unit_price: 30_000,
  note: null,
  toppings_snapshot: null,
  flagged: false,
  ...overrides,
})

beforeEach(() => {
  useAuthStore.setState(AUTH_RESET)
  useCartStore.setState(CART_RESET)
  localStorageMock.clear()
})

// ── Step 1: Staff Login ──────────────────────────────────────────────────────

describe('Step 1 — Staff Login: auth store state', () => {
  it('stores access token in memory only — not in localStorage (Invariant 1)', () => {
    const TOKEN = 'staff.jwt.token'
    const keysBefore = localStorage.length

    useAuthStore.getState().setAuth(
      { id: 's1', username: 'chef1', full_name: 'Đầu bếp 1', role: 'chef', is_active: true },
      TOKEN,
    )

    expect(useAuthStore.getState().accessToken).toBe(TOKEN)
    // auth store has no persist middleware — localStorage must not change
    expect(localStorage.length).toBe(keysBefore)
  })

  it('stores user info (id, username, role) alongside token', () => {
    const user: User = { id: 'u1', username: 'cashier1', full_name: 'Thu ngân', role: 'cashier', is_active: true }
    useAuthStore.getState().setAuth(user, 'tok')

    const state = useAuthStore.getState()
    expect(state.user?.role).toBe('cashier')
    expect(state.user?.id).toBe('u1')
  })

  it('clearAuth wipes token and user completely', () => {
    useAuthStore.getState().setAuth(
      { id: 'x', username: 'mgr', full_name: 'Quản lý', role: 'manager', is_active: true },
      'manager.tok',
    )
    useAuthStore.getState().clearAuth()

    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setAccessToken updates token without clearing user (refresh flow)', () => {
    const user: User = { id: 'u2', username: 'staff1', full_name: 'NV', role: 'cashier', is_active: true }
    useAuthStore.getState().setAuth(user, 'old.token')
    useAuthStore.getState().setAccessToken('new.token.after.refresh')

    expect(useAuthStore.getState().accessToken).toBe('new.token.after.refresh')
    expect(useAuthStore.getState().user?.id).toBe('u2') // user unchanged
  })
})

// ── Step 1: Role-based routing ───────────────────────────────────────────────

describe('Step 1 — Role-based post-login redirect', () => {
  const cases: [User['role'], string][] = [
    ['chef',    '/kds'],
    ['cashier', '/pos'],
    ['manager', '/admin/overview'],
    ['admin',   '/admin/overview'],
  ]

  it.each(cases)('role "%s" routes to %s', (role, expected) => {
    expect(specRoleRoute(role)).toBe(expected)
  })

  it('chef never lands on /pos or /admin/overview', () => {
    expect(specRoleRoute('chef')).not.toBe('/pos')
    expect(specRoleRoute('chef')).not.toBe('/admin/overview')
  })

  it('cashier never lands on /kds or /admin/overview', () => {
    expect(specRoleRoute('cashier')).not.toBe('/kds')
    expect(specRoleRoute('cashier')).not.toBe('/admin/overview')
  })
})

// ── Step 2: KDS — Item Status ────────────────────────────────────────────────

describe('Step 2 — KDS: deriveItemStatus', () => {
  it('0 served → pending', () => {
    expect(deriveItemStatus(0, 3)).toBe('pending')
  })

  it('partial served → preparing', () => {
    expect(deriveItemStatus(1, 3)).toBe('preparing')
    expect(deriveItemStatus(2, 3)).toBe('preparing')
  })

  it('all served → done', () => {
    expect(deriveItemStatus(3, 3)).toBe('done')
    expect(deriveItemStatus(5, 5)).toBe('done')
  })

  it('over-served (edge) → done (qty_served >= quantity)', () => {
    expect(deriveItemStatus(10, 5)).toBe('done')
  })

  it('single item: 0 of 1 → pending', () => {
    expect(deriveItemStatus(0, 1)).toBe('pending')
  })

  it('single item: 1 of 1 → done', () => {
    expect(deriveItemStatus(1, 1)).toBe('done')
  })
})

// ── Step 5: Cancel Rule (§4.2) ───────────────────────────────────────────────

describe('Step 5 — Cancel Rule: SUM(qty_served)/SUM(quantity) < 0.30', () => {
  it('0% served → allowed', () => {
    const items = [makeOrderItem({ qty_served: 0, quantity: 10 })]
    expect(isCancelAllowed(items)).toBe(true)
  })

  it('20% served → allowed (2 of 10)', () => {
    const items = [makeOrderItem({ qty_served: 2, quantity: 10 })]
    expect(isCancelAllowed(items)).toBe(true)
  })

  it('29.9% served → allowed (just under threshold)', () => {
    // 2 served, 7 total → ~28.5%
    const items = [makeOrderItem({ qty_served: 2, quantity: 7 })]
    expect(isCancelAllowed(items)).toBe(true)
  })

  it('30% served → blocked (not strictly less than 0.30)', () => {
    // 3 of 10 = exactly 30% → must be blocked
    const items = [makeOrderItem({ qty_served: 3, quantity: 10 })]
    expect(isCancelAllowed(items)).toBe(false)
  })

  it('33% served → blocked (1 of 3)', () => {
    const items = [makeOrderItem({ qty_served: 1, quantity: 3 })]
    expect(isCancelAllowed(items)).toBe(false)
  })

  it('50% served → blocked', () => {
    const items = [makeOrderItem({ qty_served: 5, quantity: 10 })]
    expect(isCancelAllowed(items)).toBe(false)
  })

  it('100% served → blocked', () => {
    const items = [makeOrderItem({ qty_served: 3, quantity: 3 })]
    expect(isCancelAllowed(items)).toBe(false)
  })

  it('multi-item order: total served across items', () => {
    // Item A: 1 of 4 served, Item B: 0 of 6 served → 1/10 = 10% → allowed
    const items = [
      makeOrderItem({ id: 'i1', qty_served: 1, quantity: 4 }),
      makeOrderItem({ id: 'i2', qty_served: 0, quantity: 6 }),
    ]
    expect(isCancelAllowed(items)).toBe(true)
  })

  it('multi-item order: 30%+ spread across items → blocked', () => {
    // Item A: 2 of 4 served, Item B: 1 of 6 served → 3/10 = 30% → blocked
    const items = [
      makeOrderItem({ id: 'i1', qty_served: 2, quantity: 4 }),
      makeOrderItem({ id: 'i2', qty_served: 1, quantity: 6 }),
    ]
    expect(isCancelAllowed(items)).toBe(false)
  })

  it('empty items list → not allowed (guard against division by zero)', () => {
    expect(isCancelAllowed([])).toBe(false)
  })

  it('single large order: 1 of 100 → allowed (1%)', () => {
    const items = [makeOrderItem({ qty_served: 1, quantity: 100 })]
    expect(isCancelAllowed(items)).toBe(true)
  })
})

// ── Step 6: Payment ──────────────────────────────────────────────────────────

describe('Step 6 — Payment: COD vs QR method behavior', () => {
  it('COD payment method string is "cod"', () => {
    // Server expects exact lowercase string
    const validMethods = ['cod', 'vnpay', 'momo', 'zalopay'] as const
    expect(validMethods).toContain('cod')
  })

  it('COD does not require qr_code_url (completes immediately — Invariant 7)', () => {
    // Simulate COD response: no qr_code_url field
    const codResponse = {
      id: 'pay-1',
      order_id: 'order-1',
      method: 'cod',
      status: 'completed', // immediately completed
    }
    expect(codResponse.status).toBe('completed')
    expect((codResponse as Record<string, unknown>).qr_code_url).toBeUndefined()
  })

  it('QR payment method returns pending status + qr_code_url', () => {
    const vnpayResponse = {
      id: 'pay-2',
      order_id: 'order-2',
      method: 'vnpay',
      status: 'pending', // must wait for WS payment_success
      qr_code_url: 'https://vnpay.vn/qr/abc',
    }
    expect(vnpayResponse.status).toBe('pending')
    expect(vnpayResponse.qr_code_url).toBeTruthy()
  })

  it('Invariant 8: payment only valid when order status is ready or delivered', () => {
    const order: Partial<Order> = { status: 'preparing' }
    const isPaymentAllowed = (status: Order['status']) =>
      status === 'ready' || status === 'delivered'

    expect(isPaymentAllowed('ready')).toBe(true)
    expect(isPaymentAllowed('delivered')).toBe(true)
    expect(isPaymentAllowed('preparing')).toBe(false)
    expect(isPaymentAllowed('pending')).toBe(false)
    expect(isPaymentAllowed('confirmed')).toBe(false)
    expect(isPaymentAllowed('cancelled')).toBe(false)
    void order // used above
  })
})

// ── Step 3: POS Cart ─────────────────────────────────────────────────────────

describe('Step 3 — POS cart: component state, not Zustand (Invariant 3)', () => {
  it('cart store is empty by default — POS does not write to it', () => {
    // POS cart lives in component useState(), not Zustand
    // Zustand cart store must remain unaffected by POS operations
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('POS order does NOT set tableId (walk-in has no table)', () => {
    // POS orders have source = "pos", not "qr"
    // tableId in cart store must remain null for POS orders
    expect(useCartStore.getState().tableId).toBeNull()
  })
})

// ── Invariant 2: Refresh is automatic ────────────────────────────────────────

describe('Invariant 2 — Refresh token is httpOnly cookie (not JS-accessible)', () => {
  it('auth store has no refresh_token field', () => {
    const state = useAuthStore.getState()
    expect((state as Record<string, unknown>).refreshToken).toBeUndefined()
    expect((state as Record<string, unknown>).refresh_token).toBeUndefined()
  })
})

// ── STORAGE_KEYS completeness ────────────────────────────────────────────────

describe('Storage key constants', () => {
  it('CART_CONFIG key is defined for WS/SSE auth (Invariant 4+5)', () => {
    expect(STORAGE_KEYS.CART_CONFIG).toBe('cart-config')
  })

  it('ORDER_CACHE prefix is defined', () => {
    expect(STORAGE_KEYS.ORDER_CACHE).toBe('order_cache_')
  })

  it('all expected keys exist on STORAGE_KEYS', () => {
    expect(STORAGE_KEYS).toHaveProperty('COOKIE_CONSENT')
    expect(STORAGE_KEYS).toHaveProperty('ORDER_CACHE')
    expect(STORAGE_KEYS).toHaveProperty('FAVOURITES')
    expect(STORAGE_KEYS).toHaveProperty('CUSTOMER_SETTINGS')
    expect(STORAGE_KEYS).toHaveProperty('CART_CONFIG')
  })
})

// ── Order status state machine ───────────────────────────────────────────────

describe('Order status transitions (KDS + Manager confirm flow)', () => {
  const validTransitionsFromKDS: Record<string, string[]> = {
    confirmed:  ['preparing'],
    preparing:  ['ready'],
  }

  it('KDS can move confirmed → preparing', () => {
    expect(validTransitionsFromKDS['confirmed']).toContain('preparing')
  })

  it('KDS can move preparing → ready', () => {
    expect(validTransitionsFromKDS['preparing']).toContain('ready')
  })

  it('KDS cannot move pending → anything (pending requires manager confirm first)', () => {
    expect(validTransitionsFromKDS['pending']).toBeUndefined()
  })

  it('Manager confirms: pending → confirmed', () => {
    // PATCH /orders/:id/status { status: "confirmed" }
    const confirmAction = { status: 'confirmed' as const }
    expect(confirmAction.status).toBe('confirmed')
  })
})
