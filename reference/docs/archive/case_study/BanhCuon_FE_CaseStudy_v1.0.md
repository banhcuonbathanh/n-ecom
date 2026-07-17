🍱
**BÁNH CUỐN E-COMMERCE**
**FRONTEND CASE STUDY**
*Version 1.0  |  React + TypeScript + Tailwind*
| Project | BanhCuon — Vietnamese Food E-Commerce Platform |
| --- | --- |
| Scope | Frontend Architecture, Components, Auth Flow, Product Module, Cart, Order |
| Tech Stack | React 18 · TypeScript · Tailwind CSS · React Router v6 · Zustand · Axios · React Hook Form + Zod |
| Version | FE Case Study v1.0 |
| Status | In Development |

# 1. Project Overview
BanhCuon is a full-stack Vietnamese food e-commerce platform. The frontend is a Single Page Application (SPA) built with React 18 and TypeScript. It communicates with a RESTful backend API through Axios with JWT-based authentication.
This case study covers the full frontend journey from architecture decisions to concrete implementation patterns for Auth, Products, Cart, and Order modules.

## 1.1 Tech Stack Breakdown
| Category | Library / Tool | Purpose |
| --- | --- | --- |
| Core | React 18 + TypeScript | Component-based UI with type safety |
| Styling | Tailwind CSS | Utility-first CSS, dark mode, responsive design |
| Routing | React Router v6 | Client-side routing with protected routes |
| State | Zustand | Lightweight global state (auth, cart, UI) |
| API | Axios + Interceptors | HTTP client with JWT auto-attach and refresh |
| Forms | React Hook Form + Zod | Validation, error messages, type-safe schemas |
| Query | TanStack Query (React Query) | Server state, caching, loading/error states |
| Testing | Vitest + Testing Library | Unit tests, component tests, mocks |

# 2. Folder Structure
The project follows a feature-based structure. Each domain (auth, products, cart, order) lives in its own folder under src/features/. Shared utilities, types, and components are outside features.

## 2.1 Top-Level Structure
src/
├── api/               # Axios instance, interceptors, all API calls
├── components/        # Reusable UI components (Button, Modal, Input...)
├── features/          # Feature modules
│   ├── auth/          # Login, Register, Forgot Password
│   ├── products/      # Product list, detail, search, filter
│   ├── cart/          # Cart sidebar, cart page, cart item
│   └── orders/        # Order history, order detail, checkout
├── hooks/             # Custom hooks (useAuth, useCart, useDebounce...)
├── layouts/           # MainLayout, AuthLayout, AdminLayout
├── pages/             # Route-level page components
├── router/            # Route definitions, ProtectedRoute
├── stores/            # Zustand stores (authStore, cartStore)
├── types/             # TypeScript interfaces and types
└── utils/             # Helpers (formatPrice, formatDate...)

## 2.2 Feature Folder Pattern
Every feature folder has the same internal layout for consistency:
features/products/
├── api/               # API functions for this feature only
│   └── productApi.ts
├── components/        # Feature-specific components
│   ├── ProductCard.tsx
│   ├── ProductGrid.tsx
│   └── ProductFilter.tsx
├── hooks/             # Feature-specific hooks
│   └── useProducts.ts
├── types/             # Feature types (Product, ProductFilter...)
│   └── product.types.ts
└── index.ts           # Public barrel export
**💡 Note: **Always export from index.ts. Other features import from 'features/products', never from deep paths like 'features/products/components/ProductCard'.

# 3. Routing Architecture
React Router v6 is used. Routes are split into Public, Protected (customer), and Admin groups. A ProtectedRoute component wraps private pages and redirects to /login if the user is not authenticated.

## 3.1 Route Map
| Path | Page | Guard | Description |
| --- | --- | --- | --- |
| / | HomePage | Public | Landing, featured products |
| /products | ProductsPage | Public | Product listing with filter/sort |
| /products/:id | ProductDetailPage | Public | Product detail + reviews |
| /login | LoginPage | Guest only | Redirect to / if logged in |
| /register | RegisterPage | Guest only | Redirect to / if logged in |
| /cart | CartPage | Protected | Cart review before checkout |
| /checkout | CheckoutPage | Protected | Address, payment, submit order |
| /orders | OrdersPage | Protected | Order history list |
| /orders/:id | OrderDetailPage | Protected | Single order detail |
| /profile | ProfilePage | Protected | User profile & password |
| /admin/* | AdminLayout | Admin only | Dashboard, CRUD management |

## 3.2 ProtectedRoute Component
// src/router/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface Props { requiredRole?: 'admin' | 'customer'; }

export const ProtectedRoute = ({ requiredRole }: Props) => {
const { user, isAuthenticated } = useAuthStore();

// Not logged in → go to login
if (!isAuthenticated) return <Navigate to='/login' replace />;

// Logged in but wrong role → go home
if (requiredRole && user?.role !== requiredRole)
return <Navigate to='/' replace />;

return <Outlet />;  // Render child routes
};

## 3.3 Route Setup (AppRouter)
// src/router/AppRouter.tsx
export const AppRouter = () => (
<Routes>
{/* Public routes */}
<Route path='/' element={<MainLayout />}>
<Route index element={<HomePage />} />
<Route path='products' element={<ProductsPage />} />
<Route path='products/:id' element={<ProductDetailPage />} />
</Route>

{/* Guest only (redirect if logged in) */}
<Route element={<GuestRoute />}>
<Route path='login'    element={<LoginPage />} />
<Route path='register' element={<RegisterPage />} />
</Route>

{/* Protected: customer */}
<Route element={<ProtectedRoute />}>
<Route path='cart'        element={<CartPage />} />
<Route path='checkout'    element={<CheckoutPage />} />
<Route path='orders'      element={<OrdersPage />} />
<Route path='orders/:id'  element={<OrderDetailPage />} />
<Route path='profile'     element={<ProfilePage />} />
</Route>

{/* Protected: admin */}
<Route element={<ProtectedRoute requiredRole='admin' />}>
<Route path='admin/*' element={<AdminLayout />} />
</Route>
</Routes>
);

# 4. Auth Module
Authentication uses JWT (Access Token + Refresh Token). The access token is stored in memory (Zustand store). The refresh token is stored in an httpOnly cookie. Axios interceptors handle auto-refresh when the access token expires.

## 4.1 Auth Flow Diagram
| Step | What Happens |
| --- | --- |
| 1. User submits login form | RHF validates → call POST /auth/login |
| 2. API returns tokens | accessToken in response body, refreshToken in httpOnly cookie |
| 3. Store access token | Save to Zustand authStore (memory only, not localStorage) |
| 4. Axios attaches token | Request interceptor adds Authorization: Bearer <token> |
| 5. Token expires (401) | Response interceptor calls POST /auth/refresh with cookie |
| 6. New tokens returned | Update Zustand store, retry original failed request |
| 7. Refresh also fails | Clear auth store, redirect to /login |

## 4.2 Zustand Auth Store
// src/stores/authStore.ts
import { create } from 'zustand';

interface User { id: string; name: string; email: string; role: 'customer' | 'admin'; }

interface AuthState {
user:            User | null;
accessToken:     string | null;
isAuthenticated: boolean;
// Actions
setAuth:  (user: User, token: string) => void;
clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
user:            null,
accessToken:     null,
isAuthenticated: false,

setAuth: (user, accessToken) =>
set({ user, accessToken, isAuthenticated: true }),

clearAuth: () =>
set({ user: null, accessToken: null, isAuthenticated: false }),
}));
**💡 Note: **Never store accessToken in localStorage — it's vulnerable to XSS. Zustand (memory) is cleared on page refresh, and /auth/refresh with the httpOnly cookie re-hydrates the session.

## 4.3 Axios Interceptors
// src/api/axiosInstance.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const api = axios.create({
baseURL: import.meta.env.VITE_API_URL,
withCredentials: true,   // Send httpOnly refresh cookie
});

// ── REQUEST: attach access token ──────────────────────
api.interceptors.request.use((config) => {
const token = useAuthStore.getState().accessToken;
if (token) config.headers.Authorization = `Bearer ${token}`;
return config;
});

// ── RESPONSE: handle 401, refresh token ───────────────
let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
(res) => res,
async (error) => {
const original = error.config;
if (error.response?.status !== 401 || original._retry) {
return Promise.reject(error);
}
original._retry = true;

if (isRefreshing) {
// Queue this request until refresh completes
return new Promise((resolve) =>
queue.push((token) => {
original.headers.Authorization = `Bearer ${token}`;
resolve(api(original));
})
);
}

isRefreshing = true;
try {
const { data } = await api.post('/auth/refresh');  // Uses httpOnly cookie
const { accessToken, user } = data;
useAuthStore.getState().setAuth(user, accessToken);
queue.forEach((cb) => cb(accessToken));
queue = [];
original.headers.Authorization = `Bearer ${accessToken}`;
return api(original);
} catch {
useAuthStore.getState().clearAuth();
window.location.href = '/login';
return Promise.reject(error);
} finally {
isRefreshing = false;
}
}
);

## 4.4 Login Form with React Hook Form + Zod
// src/features/auth/components/LoginForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
email:    z.string().email('Invalid email'),
password: z.string().min(6, 'Min 6 characters'),
});
type LoginForm = z.infer<typeof schema>;

export const LoginForm = () => {
const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
resolver: zodResolver(schema),
});

const onSubmit = async (data: LoginForm) => {
const res = await authApi.login(data);        // POST /auth/login
useAuthStore.getState().setAuth(res.user, res.accessToken);
navigate('/');
};

return (
<form onSubmit={handleSubmit(onSubmit)}>
<input {...register('email')} placeholder='Email' />
{errors.email && <p>{errors.email.message}</p>}
<input {...register('password')} type='password' />
{errors.password && <p>{errors.password.message}</p>}
<button type='submit'>Login</button>
</form>
);
};

# 5. Products Module
The products module handles listing, filtering, sorting, searching, and viewing product detail. TanStack Query is used for all server-state fetching with caching and loading states.

## 5.1 Product TypeScript Types
// src/features/products/types/product.types.ts

export interface Product {
id:          string;
name:        string;
slug:        string;
description: string;
price:       number;
salePrice:   number | null;
images:      string[];
category:    Category;
stock:       number;
rating:      number;
reviewCount: number;
tags:        string[];
}

export interface ProductFilter {
page:       number;
limit:      number;
search:     string;
categoryId: string;
minPrice:   number;
maxPrice:   number;
sortBy:     'price' | 'name' | 'rating' | 'newest';
sortOrder:  'asc' | 'desc';
}

export interface ProductsResponse {
products:   Product[];
total:      number;
page:       number;
totalPages: number;
}

## 5.2 Product API Functions
// src/features/products/api/productApi.ts
import { api } from '@/api/axiosInstance';
import type { ProductFilter, ProductsResponse, Product } from '../types';

export const productApi = {
getAll: (filter: Partial<ProductFilter>) =>
api.get<ProductsResponse>('/products', { params: filter })
.then(r => r.data),

getById: (id: string) =>
api.get<Product>(`/products/${id}`).then(r => r.data),

getBySlug: (slug: string) =>
api.get<Product>(`/products/slug/${slug}`).then(r => r.data),
};

## 5.3 useProducts Hook with TanStack Query
// src/features/products/hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { productApi } from '../api/productApi';
import type { ProductFilter } from '../types';

export const useProducts = (filter: Partial<ProductFilter>) => {
return useQuery({
queryKey: ['products', filter],    // Re-fetches when filter changes
queryFn:  () => productApi.getAll(filter),
staleTime: 1000 * 60 * 5,          // Cache 5 minutes
placeholderData: (prev) => prev,   // Keep old data while fetching
});
};

export const useProduct = (id: string) => {
return useQuery({
queryKey: ['product', id],
queryFn:  () => productApi.getById(id),
enabled:  !!id,
});
};

## 5.4 ProductsPage — Filter + Grid
// src/pages/ProductsPage.tsx
export const ProductsPage = () => {
const [filter, setFilter] = useState<Partial<ProductFilter>>({
page: 1, limit: 12, sortBy: 'newest',
});
const { data, isLoading, isError } = useProducts(filter);

// Debounced search — only fires after 400ms of no typing
const handleSearch = useDebounce((term: string) =>
setFilter(prev => ({ ...prev, search: term, page: 1 })),
400);

if (isLoading) return <ProductGridSkeleton count={12} />;
if (isError)   return <ErrorMessage />;

return (
<div className='grid grid-cols-[280px_1fr] gap-6'>
<ProductFilter filter={filter} onChange={setFilter} />
<div>
<SearchBar onSearch={handleSearch} />
<ProductGrid products={data.products} />
<Pagination
page={data.page}
total={data.totalPages}
onChange={(p) => setFilter(prev => ({ ...prev, page: p }))}
/>
</div>
</div>
);
};

# 6. Cart Module
The cart state is managed in Zustand and persisted to localStorage so it survives page refresh. It supports add, remove, update quantity, and clear operations.

## 6.1 Cart Types
// src/features/cart/types/cart.types.ts

export interface CartItem {
productId: string;
name:      string;
image:     string;
price:     number;
quantity:  number;
}

export interface CartState {
items:     CartItem[];
// Computed
totalItems:  number;
totalAmount: number;
// Actions
addItem:    (product: Product, qty?: number) => void;
removeItem: (productId: string) => void;
updateQty:  (productId: string, qty: number) => void;
clearCart:  () => void;
}

## 6.2 Cart Zustand Store
// src/stores/cartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create<CartState>()(
persist(
(set, get) => ({
items: [],

// Derived (computed) values
get totalItems()  { return get().items.reduce((s, i) => s + i.quantity, 0); },
get totalAmount() { return get().items.reduce((s, i) => s + i.price * i.quantity, 0); },

addItem: (product, qty = 1) =>
set((state) => {
const existing = state.items.find(i => i.productId === product.id);
if (existing)
return { items: state.items.map(i =>
i.productId === product.id
? { ...i, quantity: i.quantity + qty }
: i
)};
return { items: [...state.items, {
productId: product.id,
name:  product.name,
image: product.images[0],
price: product.salePrice ?? product.price,
quantity: qty,
}]};
}),

removeItem: (productId) =>
set(s => ({ items: s.items.filter(i => i.productId !== productId) })),

updateQty: (productId, qty) =>
set(s => ({
items: qty <= 0
? s.items.filter(i => i.productId !== productId)
: s.items.map(i => i.productId === productId ? { ...i, quantity: qty } : i)
})),

clearCart: () => set({ items: [] }),
}),
{ name: 'banhcuon-cart' }  // Persists to localStorage key
)
);

# 7. Order Module
Orders are placed from the Checkout page. After submitting, the cart is cleared and the user is redirected to their order detail. Order history is fetched via TanStack Query.

## 7.1 Checkout Flow
| # | Step | Details |
| --- | --- | --- |
| 1 | Review Cart | CartPage — user sees items, quantities, totals |
| 2 | Go to Checkout | Protected route — must be logged in |
| 3 | Enter Address | React Hook Form + Zod validates shipping address |
| 4 | Select Payment | COD or card (mock). No real payment gateway. |
| 5 | Submit Order | POST /orders — sends cartItems + address + payment |
| 6 | Success | Cart cleared → redirect to /orders/:id |

## 7.2 Checkout API
// src/features/orders/api/orderApi.ts
export const orderApi = {
create: (payload: CreateOrderPayload) =>
api.post<Order>('/orders', payload).then(r => r.data),

getAll: () =>
api.get<Order[]>('/orders').then(r => r.data),

getById: (id: string) =>
api.get<Order>(`/orders/${id}`).then(r => r.data),
};

## 7.3 useCreateOrder Hook
// src/features/orders/hooks/useCreateOrder.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateOrder = () => {
const queryClient  = useQueryClient();
const { clearCart } = useCartStore();
const navigate     = useNavigate();

return useMutation({
mutationFn: orderApi.create,
onSuccess: (order) => {
clearCart();                                   // Clear cart
queryClient.invalidateQueries({ queryKey: ['orders'] }); // Refresh order list
navigate(`/orders/${order.id}`);              // Go to order detail
},
onError: (err) => {
toast.error('Order failed. Please try again.');
},
});
};

# 8. Reusable Component Patterns
All shared components live in src/components/. They are generic, typed with TypeScript, and styled with Tailwind. Examples include Button, Input, Modal, Skeleton, and Toast.

## 8.1 Button Component
// src/components/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
size?:    'sm' | 'md' | 'lg';
loading?: boolean;
}

const VARIANTS = {
primary:   'bg-blue-600 hover:bg-blue-700 text-white',
secondary: 'border border-gray-300 hover:bg-gray-50 text-gray-700',
ghost:     'hover:bg-gray-100 text-gray-600',
danger:    'bg-red-600 hover:bg-red-700 text-white',
};
const SIZES = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2', lg: 'px-6 py-3 text-lg' };

export const Button = ({ variant='primary', size='md', loading, children, ...rest }: ButtonProps) => (
<button className={`${VARIANTS[variant]} ${SIZES[size]} rounded-lg font-medium`}
disabled={loading || rest.disabled} {...rest}>
{loading ? <Spinner size='sm' /> : children}
</button>
);

## 8.2 Price Display Utility
// src/utils/formatPrice.ts
export const formatVND = (amount: number) =>
new Intl.NumberFormat('vi-VN', {
style: 'currency', currency: 'VND'
}).format(amount);

// Usage
formatVND(250000)  // → '250.000 ₫'

## 8.3 ProductCard Component
// src/features/products/components/ProductCard.tsx
export const ProductCard = ({ product }: { product: Product }) => {
const { addItem } = useCartStore();
const effectivePrice = product.salePrice ?? product.price;
const hasDiscount    = !!product.salePrice;

return (
<div className='rounded-xl overflow-hidden border hover:shadow-lg transition'>
<Link to={`/products/${product.id}`}>
<img src={product.images[0]} alt={product.name} className='w-full h-48 object-cover' />
</Link>
<div className='p-4'>
<h3 className='font-semibold truncate'>{product.name}</h3>
<div className='flex items-center gap-2 mt-1'>
<span className='text-blue-600 font-bold'>{formatVND(effectivePrice)}</span>
{hasDiscount && (
<span className='line-through text-gray-400 text-sm'>
{formatVND(product.price)}
</span>
)}
</div>
<Button onClick={() => addItem(product)} className='mt-3 w-full'>
Add to Cart
</Button>
</div>
</div>
);
};

# 9. Error Handling Strategy
| Layer | Handled by | Example |
| --- | --- | --- |
| Form validation | Zod + React Hook Form | Show field errors inline |
| API 401 | Axios response interceptor | Auto refresh token or redirect to login |
| API 4xx/5xx | TanStack Query + onError | Toast notification to user |
| Component crash | React Error Boundary | Show fallback UI, log to Sentry |
| Not found route | React Router catch-all | 404 page with link to home |

## 9.1 Error Boundary
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
state = { hasError: false };
static getDerivedStateFromError() { return { hasError: true }; }
componentDidCatch(error: Error, info: React.ErrorInfo) {
console.error('[ErrorBoundary]', error, info);
// sentry.captureException(error);
}
render() {
if (this.state.hasError)
return <div>Something went wrong. <button onClick={() => window.location.reload()}>Reload</button></div>;
return this.props.children;
}
}

# 10. Performance Patterns
| Technique | Where Applied | Benefit |
| --- | --- | --- |
| React.lazy + Suspense | All page components | Code-split by route, smaller initial bundle |
| TanStack Query cache | Products, orders API | No re-fetch on revisit within staleTime |
| Debounce search | Product search input | Reduce API calls while typing |
| Image lazy loading | ProductCard, gallery | Native loading='lazy' attribute |
| Skeleton loading | ProductGrid, OrderList | Better perceived performance |
| Zustand selector | Cart badge, auth check | Only re-render when specific slice changes |

## 10.1 Code Splitting Example
// src/router/AppRouter.tsx
const ProductsPage    = React.lazy(() => import('@/pages/ProductsPage'));
const ProductDetail   = React.lazy(() => import('@/pages/ProductDetailPage'));
const CheckoutPage    = React.lazy(() => import('@/pages/CheckoutPage'));

// Wrap routes with Suspense
<Suspense fallback={<PageSpinner />}>
<Routes>
<Route path='products'   element={<ProductsPage />} />
<Route path='products/:id' element={<ProductDetail />} />
<Route path='checkout'   element={<CheckoutPage />} />
</Routes>
</Suspense>

## 10.2 Zustand Selector — Avoid Re-renders
// ❌ BAD: subscribes to entire cart, re-renders on any change
const cart = useCartStore();

// ✅ GOOD: only re-renders when totalItems changes
const totalItems = useCartStore((s) => s.totalItems);

# 11. Summary & Key Decisions
| Decision | Choice | Reason |
| --- | --- | --- |
| Token storage | Memory (Zustand) | Safer than localStorage vs XSS |
| Token refresh | Axios interceptor + queue | Transparent to all API callers |
| Server state | TanStack Query | Built-in cache, loading, error states |
| Global state | Zustand | Simpler than Redux for this scale |
| Cart persistence | Zustand + persist middleware | Survive page refresh, no backend needed |
| Form validation | Zod + RHF | Type-safe, colocated schema |
| Styling | Tailwind CSS | Fast, consistent, dark-mode ready |

This case study covers the core FE patterns for BanhCuon. Sections for Admin Dashboard, Review Module, Notifications, and i18n (Vietnamese / English) can be added as v2 extensions.

*— End of BanhCuon FE Case Study v1.0 —*