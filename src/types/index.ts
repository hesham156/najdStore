import { UserRole, OrderStatus, PaymentMethod, PaymentStatus, DeliveryMethod, TicketStatus, TicketPriority, DiscountType } from "@prisma/client";

export type { UserRole, OrderStatus, PaymentMethod, PaymentStatus, DeliveryMethod, TicketStatus, TicketPriority, DiscountType };

/** A Salla-style custom field the customer filled, carried on the cart line. */
export interface CartCustomField {
  key: string;
  label: string;
  type: string;
  /** Human-readable value(s): select label(s), text, filename/URL, date… */
  value: string;
  /** Additive price contributed by this field (already included in line price). */
  priceAdd: number;
}

export interface CartItem {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  image?: string;
  quantity: number;
  slug: string;
  variantLabel?: string; // e.g. "شهر واحد" | "3 شهور" | "الكمية: 100 · التصميم: بتصميمكم"
  variantId?: string;    // id of a ProductVariant (matrix pricing) when applicable
  /** Custom product fields the customer filled (parallel to the matrix system). */
  customFields?: CartCustomField[];
}

/* ── Multi-option products (Salla-style matrix pricing) ── */
export interface OptionValueData {
  id: string;
  labelAr: string;
  label?: string;
  image?: string | null;
}
export interface ProductOptionData {
  id: string;
  nameAr: string;
  required: boolean;
  values: OptionValueData[];
}
export interface MatrixVariant {
  id: string;
  optionValueIds: string[];
  label?: string | null;
  price: number;
  comparePrice?: number | null;
  stockCount: number;
  isActive: boolean;
}

export interface ProductWithCategory {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  description?: string | null;
  descriptionAr?: string | null;
  // price may be Prisma Decimal (serialized to string via JSON) or plain number
  price: number | string;
  comparePrice?: number | string | null;
  image?: string | null;
  images: string[];
  categoryId: string;
  deliveryMethod: DeliveryMethod;
  isActive: boolean;
  isFeatured: boolean;
  features: string[];
  featuresAr?: string[];
  duration?: string | null;
  tags: string[];
  stockCount: number;
  /**
   * Whether `stockCount` means anything for this product.
   *
   * Prisma returns it with every product query, but it used to be absent from
   * this type — so the storefront read `stockCount === 0` on its own and
   * declared every untracked product sold out, which is the default state for
   * most of the catalogue.
   */
  trackStock?: boolean;
  createdAt: Date;
  variants?: ProductVariant[]; // parsed from tags at runtime
  category: {
    id: string;
    name: string;
    nameAr: string;
    slug: string;
    icon?: string | null;
    color?: string | null;
  };
}

export interface ProductVariant {
  label: string;   // e.g. "شهر واحد"
  price: number;   // e.g. 29
  comparePrice?: number;
}

export interface OrderWithDetails {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  items: OrderItemWithProduct[];
  payment?: PaymentDetails | null;
}

export interface OrderItemWithProduct {
  id: string;
  quantity: number;
  price: number | string;
  deliveredData?: string | null;
  deliveredAt?: Date | null;
  variantLabel?: string | null;
  customFields?: CartCustomField[] | null;
  subscriptionStartDate?: Date | string | null;
  subscriptionEndDate?: Date | string | null;
  autoRenew?: boolean;
  product: {
    id: string;
    name: string;
    nameAr: string;
    image?: string | null;
    deliveryMethod?: DeliveryMethod;
  };
}

export interface PaymentDetails {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number | string;
  proofImage?: string | null;
  transactionId?: string | null;
  notes?: string | null;
  adminNotes?: string | null;
  reviewedAt?: Date | null;
  createdAt: Date;
}

export interface TicketWithMessages {
  id: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  orderId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
  messages: TicketMessageType[];
}

export interface TicketMessageType {
  id: string;
  message: string;
  isStaff: boolean;
  createdAt: Date;
  userId: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  pendingOrders: number;
  deliveredOrders: number;
  openTickets: number;
  lowStockProducts: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
