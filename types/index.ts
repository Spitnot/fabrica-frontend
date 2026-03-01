// ─── AUTH ─────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'customer';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole; // viene de user_metadata.role
}

// ─── ORDER STATUS ─────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'draft'
  | 'confirmado'
  | 'produccion'
  | 'listo_envio'
  | 'enviado'
  | 'cancelado';

// ─── TARIFA ───────────────────────────────────────────────────────────────────
export interface TarifaPrecio {
  tarifa_id: string;
  sku: string;
  precio: number;
}

export interface Tarifa {
  id: string;
  nombre: string;
  descripcion?: string;
  multiplicador: number;           // fallback: shopify_price × multiplicador
  activo: boolean;
  created_at: string;
  hidden_products: string[];       // Shopify product IDs hidden for this tier
  minimum_order_value: number;     // minimum order total in EUR (0 = no minimum)
  pack_size: number;               // quantity must be multiple of this (1 = no restriction)
  precios?: TarifaPrecio[];        // incluido cuando se pide el detalle
}

// ─── CUSTOMER ────────────────────────────────────────────────────────────────
// Refleja la tabla `customers` del backend
export interface Customer {
  id: string;                      // UUID
  auth_user_id: string;            // referencia a auth.users
  company_name: string;
  contacto_nombre: string;
  email: string;
  telefono?: string;
  direccion_envio: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
  nif_cif: string;
  estado: 'active' | 'inactive';
  tarifa_id?: string;
  descuento_pct: number;           // 0–100, descuento adicional sobre la tarifa
  tarifa?: Tarifa;                 // join opcional
  created_at: string;
}

// ─── ORDER ITEM ───────────────────────────────────────────────────────────────
// Refleja la tabla `order_items` del backend
// peso siempre en KG (el backend convierte desde Shopify)
export interface OrderItem {
  id: string;
  order_id: string;
  sku: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;         // congelado al añadir
  peso_unitario: number;           // KG, congelado al añadir
  peso_total_linea: number;        // generado por DB (cantidad * peso_unitario)
}

// ─── ORDER ───────────────────────────────────────────────────────────────────
// Refleja la tabla `orders` del backend
export interface Order {
  id: string;                      // UUID — identificador principal
  customer_id: string;
  status: OrderStatus;
  total_productos: number;
  peso_total: number;              // KG
  coste_envio_estimado?: number;
  coste_envio_final?: number;
  packlink_shipment_id?: string;
  tracking_url?: string;           // solo URL, sin tracking_number separado
  created_at: string;
  // joins opcionales (cuando se hace select con customer)
  customer?: Customer;
  order_items?: OrderItem[];
}

// ─── SHOPIFY PRODUCT ──────────────────────────────────────────────────────────
// Respuesta de GET /api/products (catálogo completo)
// peso siempre en KG (convertido por el backend)
export interface Product {
  sku: string;
  nombre_producto: string;
  variante?: string;
  precio_mayorista: number;
  peso_kg: number;                 // siempre KG
  imagen_url?: string;
}

// ─── DRAFT (estado local al crear pedido) ─────────────────────────────────────
// Solo existe en el cliente, nunca se persiste hasta confirmar
export interface DraftItem {
  sku: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  peso_unitario: number;           // KG
}

export interface CreateOrderPayload {
  customer_id: string;
  items: DraftItem[];
  coste_envio_estimado?: number;
}

// ─── API RESPONSES ────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
