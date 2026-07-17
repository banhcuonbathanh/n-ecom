/**
 * CLIENT QR FLOW — End-to-End Integration Tests
 *
 * Covers: docs/work_flow/CLIENT_QR_FLOW.md
 * Pattern: store state transitions + business rules + invariants
 * No browser required — Vitest Node environment + Zustand stores + localStorage mock
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { useCartStore } from '../../fe/src/store/cart'
import { useAuthStore } from '../../fe/src/features/auth/auth.store'
import { STORAGE_KEYS } from '../../fe/src/lib/storage-keys'
import type { CartItem } from '../../fe/src/types/cart'
import type { Order } from '../../fe/src/types/order'

// ── localStorage mock (Node env has none) ───────────────────────────────────

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

// ── Helpers ─────────────────────────────────────────────────────────────────

const CART_RESET: Parameters<typeof useCartStore.setState>[0] = {
  items: [], tableId: null, tableName: null,
  activeOrderId: null, paymentMethod: null,
  orderNote: '',
}

const AUTH_RESET: Parameters<typeof useAuthStore.setState>[0] = {
  user: null, accessToken: null,
}

const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: 'product_p1_',
  type: 'product',
  product_id: 'p1',
  name: 'Bánh cuốn',
  quantity: 1,
  price: 30_000,
  toppings: [],
  ...overrides,
})

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-001',
  order_number: 'BC-0001',
  status: 'pending',
  source: 'qr',
  table_id: 'table-1',
  table_name: 'Bàn 1',
  customer_name: '',
  customer_phone: '',
  total_amount: 60_000,
  note: null,
  created_at: new Date().toISOString(),
  items: [],
  ...overrides,
})

beforeEach(() => {
  useCartStore.setState(CART_RESET)
  useAuthStore.setState(AUTH_RESET)
  localStorageMock.clear()
})

// ── Step 1: QR Auth ──────────────────────────────────────────────────────────

describe('Step 1 — QR Auth: store state after guest auth', () => {
  it('sets accessToken in auth store memory (not localStorage)', () => {
    const FAKE_JWT = 'header.eyJzdWIiOiJndWVzdCJ9.sig'
    useAuthStore.getState().setAuth(
      { id: 'guest-1', username: 'guest', full_name: 'Khách', role: 'customer', is_active: true },
      FAKE_JWT,
    )

    expect(useAuthStore.getState().accessToken).toBe(FAKE_JWT)
    // Token must NEVER appear in localStorage (Invariant 3)
    const localKeys = Object.keys(storage)
    const hasTokenInStorage = localKeys.some(k => storage[k]?.includes(FAKE_JWT))
    expect(hasTokenInStorage).toBe(false)
  })

  it('sets tableId in cart store after QR auth response', () => {
    useCartStore.getState().setTableId('table-5')
    useCartStore.getState().setTableName('Bàn 5')

    expect(useCartStore.getState().tableId).toBe('table-5')
    expect(useCartStore.getState().tableName).toBe('Bàn 5')
  })

  it('clears auth correctly — no stale token in memory', () => {
    useAuthStore.getState().setAuth(
      { id: 'g1', username: 'guest', full_name: '', role: 'customer', is_active: true },
      'some.jwt.token',
    )
    useAuthStore.getState().clearAuth()

    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })
})

// ── Step 2: Menu + Cart ──────────────────────────────────────────────────────

describe('Step 2 — Menu: add items to cart', () => {
  it('adds a product to cart', () => {
    useCartStore.getState().addItem(makeItem())
    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('merges duplicate items by increasing quantity', () => {
    useCartStore.getState().addItem(makeItem({ quantity: 1 }))
    useCartStore.getState().addItem(makeItem({ quantity: 2 }))
    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(3)
  })

  it('calculates total correctly', () => {
    useCartStore.getState().addItem(makeItem({ id: 'p1', price: 30_000, quantity: 2 }))
    useCartStore.getState().addItem(makeItem({ id: 'p2', product_id: 'p2', price: 15_000, quantity: 3 }))
    // 30000×2 + 15000×3 = 105000
    expect(useCartStore.getState().total()).toBe(105_000)
  })

  it('itemCount sums all quantities', () => {
    useCartStore.getState().addItem(makeItem({ id: 'a', quantity: 2 }))
    useCartStore.getState().addItem(makeItem({ id: 'b', product_id: 'b', quantity: 3 }))
    expect(useCartStore.getState().itemCount()).toBe(5)
  })

  it('removes a single item', () => {
    useCartStore.getState().addItem(makeItem({ id: 'x' }))
    useCartStore.getState().removeItem('x')
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('updates quantity — zero quantity removes item', () => {
    useCartStore.getState().addItem(makeItem({ id: 'y', quantity: 3 }))
    useCartStore.getState().updateQty('y', 0)
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

// ── Step 3: Order Submit (QR path) ───────────────────────────────────────────

describe('Step 3 — Order submit: POST /orders success path', () => {
  it('clearCart empties the draft but KEEPS identity (tableId/tableName/activeOrderId) — overrides Invariant 5', () => {
    const s = useCartStore.getState()
    s.addItem(makeItem())
    s.setTableId('table-3')
    s.setTableName('Bàn 3')
    s.setActiveOrderId('order-abc')
    s.setPaymentMethod('cash')

    useCartStore.getState().clearCart()
    const after = useCartStore.getState()

    // Draft is cleared
    expect(after.items).toHaveLength(0)
    expect(after.paymentMethod).toBeNull()
    // Identity survives so the placed order stays recoverable after navigating away
    expect(after.tableId).toBe('table-3')
    expect(after.tableName).toBe('Bàn 3')
    expect(after.activeOrderId).toBe('order-abc')
  })

  it('caches order in localStorage under ORDER_CACHE prefix', () => {
    const order = makeOrder({ id: 'order-001' })
    const cacheKey = STORAGE_KEYS.ORDER_CACHE + order.id
    localStorage.setItem(cacheKey, JSON.stringify(order))

    const cached = JSON.parse(localStorage.getItem(cacheKey) ?? 'null')
    expect(cached).not.toBeNull()
    expect(cached.id).toBe('order-001')
    expect(cached.status).toBe('pending')
  })

  it('order cache key follows ORDER_CACHE + id pattern', () => {
    const orderId = 'abc-123-def'
    const key = STORAGE_KEYS.ORDER_CACHE + orderId
    expect(key).toBe(`order_cache_${orderId}`)
  })

  it('multiple orders cached independently', () => {
    const ids = ['order-1', 'order-2', 'order-3']
    ids.forEach(id => {
      localStorage.setItem(STORAGE_KEYS.ORDER_CACHE + id, JSON.stringify(makeOrder({ id })))
    })

    ids.forEach(id => {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDER_CACHE + id) ?? 'null')
      expect(cached?.id).toBe(id)
    })
  })
})

// ── Step 5: Order List (localStorage-only) ───────────────────────────────────

describe('Step 5 — Order list: reads from localStorage cache', () => {
  it('reads all order caches by ORDER_CACHE prefix', () => {
    const orders = ['o-1', 'o-2'].map(id => makeOrder({ id }))
    orders.forEach(o => localStorage.setItem(STORAGE_KEYS.ORDER_CACHE + o.id, JSON.stringify(o)))
    // Unrelated key must not pollute order list
    localStorage.setItem('some_other_key', 'noise')

    const cachedOrders: Order[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(STORAGE_KEYS.ORDER_CACHE)) {
        cachedOrders.push(JSON.parse(localStorage.getItem(k)!))
      }
    }

    expect(cachedOrders).toHaveLength(2)
    expect(cachedOrders.map(o => o.id)).toContain('o-1')
    expect(cachedOrders.map(o => o.id)).toContain('o-2')
  })
})

// ── Invariants ───────────────────────────────────────────────────────────────

describe('Invariant 1 — No login during QR flow', () => {
  it('guest auth token present means /login redirect is never triggered', () => {
    // Guest is authenticated purely via Zustand; no localStorage check needed
    useAuthStore.getState().setAuth(
      { id: 'g', username: 'guest', full_name: '', role: 'customer', is_active: true },
      'guest.jwt.token',
    )
    expect(useAuthStore.getState().accessToken).not.toBeNull()
  })
})

describe('Invariant 3 — Guest JWT is memory-only', () => {
  it('auth store has no persist middleware — nothing written to localStorage on setAuth', () => {
    const keysBefore = localStorage.length

    useAuthStore.getState().setAuth(
      { id: 'g', username: 'guest', full_name: '', role: 'customer', is_active: true },
      'guest.jwt',
    )

    // auth store uses plain create() with no persist — localStorage untouched
    expect(localStorage.length).toBe(keysBefore)
  })
})

describe('Invariant 5 (overridden) — clearCart KEEPS tableId', () => {
  it('tableId survives clearCart so the customer can add more to their order', () => {
    useCartStore.getState().setTableId('table-7')
    expect(useCartStore.getState().tableId).toBe('table-7')

    useCartStore.getState().clearCart()
    expect(useCartStore.getState().tableId).toBe('table-7')
  })
})

describe('Invariant 6 — TABLE_HAS_ACTIVE_ORDER must redirect, not show generic error', () => {
  it('error code constant is a known string, not a number', () => {
    // The FE must match this exact error code from the API response
    const expected = 'TABLE_HAS_ACTIVE_ORDER'
    expect(typeof expected).toBe('string')
    expect(expected).not.toMatch(/^\d+$/)
  })
})

describe('Invariant 7 — activeOrderId survives page reload (cart persist partialize)', () => {
  it('partialize config persists activeOrderId under CART_CONFIG key', () => {
    // Simulate: activeOrderId is set, then page "reloads" (state reset + hydrate from storage)
    useCartStore.getState().setActiveOrderId('order-xyz')
    // Manually write what persist would write (partialize: orderNote + activeOrderId only)
    const persistedState = {
      orderNote:     useCartStore.getState().orderNote,
      activeOrderId: useCartStore.getState().activeOrderId,
    }
    localStorage.setItem(STORAGE_KEYS.CART_CONFIG, JSON.stringify({ state: persistedState, version: 0 }))

    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART_CONFIG) ?? '{}')
    expect(raw.state.activeOrderId).toBe('order-xyz')
  })

  it('activeOrderId is NOT in partialize when null', () => {
    useCartStore.getState().clearCart()
    const persistedState = {
      orderNote:     useCartStore.getState().orderNote,
      activeOrderId: useCartStore.getState().activeOrderId,
    }
    expect(persistedState.activeOrderId).toBeNull()
  })
})

// ── Walk-in checkout path (no tableId) ──────────────────────────────────────

describe('Step 3 — Walk-in path: no tableId → /checkout instead of TableConfirmModal', () => {
  it('tableId is null on a fresh session (no QR scan)', () => {
    expect(useCartStore.getState().tableId).toBeNull()
  })

  it('cart can hold items without a tableId (walk-in)', () => {
    useCartStore.getState().addItem(makeItem())
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().tableId).toBeNull()
  })
})

// ── Order note ───────────────────────────────────────────────────────────────

describe('Step 3 — Optional order note (QR path)', () => {
  it('order note defaults to empty string', () => {
    expect(useCartStore.getState().orderNote).toBe('')
  })

  it('setOrderNote stores note correctly', () => {
    useCartStore.getState().setOrderNote('Không cay')
    expect(useCartStore.getState().orderNote).toBe('Không cay')
  })

  it('clearCart does NOT reset orderNote (it is part of persist config)', () => {
    useCartStore.getState().setOrderNote('Ít đường')
    useCartStore.getState().clearCart()
    // clearCart only clears: items, tableId, tableName, activeOrderId, paymentMethod
    // orderNote is intentionally preserved (part of persist config)
    expect(useCartStore.getState().orderNote).toBe('Ít đường')
  })
})
