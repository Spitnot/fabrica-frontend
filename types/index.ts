// ─── AUTH ─────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'customer';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
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
  multiplicador: number;
  activo: boolean;
  created_at: string;
  precios?: TarifaPrecio[];
}

// ─── CUSTOMER ENUMS ───────────────────────────────────────────────────────────
export type TipoFiscal    = 'NIF/CIF' | 'VAT Number' | 'EIN' | 'Tax ID';
export type TipoEmpresa   = 'SL' | 'SA' | 'LLC' | 'Ltd' | 'GmbH' | 'SAS' | 'AG' | 'Autónomo' | 'Otro';
export type TipoCliente   = 'distribuidor' | 'mayorista' | 'tienda_fisica' | 'ecommerce' | 'cadena' | 'marketplace';
export type FormaPago     = 'transferencia' | 'sepa' | 'carta_credito' | 'pago_anticipado';
export type CondicionesPago = 'prepago' | '30dias' | '60dias' | '90dias';

// ─── CUSTOMER NESTED TYPES ────────────────────────────────────────────────────
export interface DireccionFiscal {
  street: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
}

export interface CondicionesLegales {
  acepta_condiciones: boolean;
  acepta_privacidad: boolean;
  consentimiento_comunicaciones: boolean;
  declaracion_cumplimiento: boolean;
}

export interface CondicionesComerciales {
  forma_pago?: FormaPago;
  condiciones_pago?: CondicionesPago;
  notas_especiales?: string;
}

// ─── CUSTOMER ────────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  auth_user_id: string;

  // Legal identity
  company_name: string;
  nombre_comercial?: string;
  tipo_empresa?: TipoEmpresa;
  nif_cif: string;
  tipo_fiscal?: TipoFiscal;
  numero_eori?: string;
  fecha_constitucion?: string;

  // Contact
  contacto_nombre: string;
  email: string;
  telefono?: string;

  // Addresses
  direccion_fiscal?: DireccionFiscal;
  direccion_envio: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };

  // Commercial profile
  tipo_cliente?: TipoCliente;
  zona_distribucion?: string;
  marcas_comercializadas?: string;
  volumen_estimado?: string;
  num_puntos_venta?: number;

  // Legal / GDPR
  condiciones_legales?: CondicionesLegales;

  // Internal (dashboard only)
  condiciones_comerciales?: CondicionesComerciales;
  estado: 'active' | 'inactive';
  tarifa_id?: string;
  descuento_pct: number;
  tarifa?: Tarifa;

  created_at: string;
}

// ─── ORDER ITEM ───────────────────────────────────────────────────────────────
export interface OrderItem {
  id: string;
  order_id: string;
  sku: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  peso_unitario: number;
  peso_total_linea: number;
}

// ─── ORDER ───────────────────────────────────────────────────────────────────
export interface Order {
  id: string;
  customer_id: string;
  status: OrderStatus;
  total_productos: number;
  peso_total: number;
  coste_envio_estimado?: number;
  coste_envio_final?: number;
  packlink_shipment_id?: string;
  tracking_url?: string;
  created_at: string;
  customer?: Customer;
  order_items?: OrderItem[];
}

// ─── SHOPIFY PRODUCT ──────────────────────────────────────────────────────────
export interface Product {
  sku: string;
  nombre_producto: string;
  variante?: string;
  precio_mayorista: number;
  peso_kg: number;
  imagen_url?: string;
}

// ─── DRAFT ───────────────────────────────────────────────────────────────────
export interface DraftItem {
  sku: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  peso_unitario: number;
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
