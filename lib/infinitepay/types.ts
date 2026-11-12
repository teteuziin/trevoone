/**
 * TREVO ONE — INFINITEPAY (CLOUDWALK) INTEGRATION TYPES
 *
 * Types and interfaces for commercial plans, student charges, InfinitePay links,
 * webhook processing, payment checks, and subscription activations.
 */

export type ConsultancyPlanStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type PlanBillingCycle =
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMIANNUALLY"
  | "YEARLY"
  | "CUSTOM";

export type PlanPaymentMethods = "PIX_AND_CARD" | "PIX_ONLY" | "CARD_ONLY";

export interface ConsultancyPlan {
  id: number;
  publicId: string;
  consultancyId: number;
  name: string;
  description: string | null;
  amountCents: number;
  currencyCode: string;
  durationDays: number | null;
  durationMonths: number | null;
  billingCycle: PlanBillingCycle;
  assuredInstallments: number; // 0 to 12: installments with fees absorbed by merchant
  isAvailableForPurchase: boolean;
  paymentMethods: PlanPaymentMethods;
  status: ConsultancyPlanStatus;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudentPlanSubscription {
  id: number;
  publicId: string;
  consultancyId: number;
  studentMembershipId: number;
  planId: number;
  chargeId: number | null;
  status: "ACTIVE" | "PAUSED" | "CANCELED" | "OVERDUE";
  startedAt: string;
  endsAt: string | null;
  planName?: string;
  planAmountCents?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InfinitePayConfig {
  consultancyId: number;
  handle: string; // InfiniteTag without $
  apiKey: string; // Secret key for backend calls
  enabled: boolean;
  environment: "SIMULATION" | "PRODUCTION";
}

export interface InfinitePayCreateLinkItem {
  quantity: number;
  price: number; // in cents
  description: string;
}

export interface InfinitePayCreateLinkRequest {
  handle: string;
  items: InfinitePayCreateLinkItem[];
  order_nsu: string; // charge public_id
  redirect_url: string;
  webhook_url: string;
  options?: {
    single_payment?: boolean;
    valid_until?: string;
    assured_installments?: number;
  };
}

export interface InfinitePayCreateLinkResponse {
  success: boolean;
  url: string;
  slug: string;
  status?: string;
  order_nsu?: string;
  error?: string;
}

export interface InfinitePayPaymentCheckRequest {
  handle: string;
  order_nsu: string;
  transaction_nsu?: string;
  slug?: string;
}

export interface InfinitePayPaymentCheckResponse {
  success: boolean;
  paid: boolean;
  amount?: number;
  paid_amount?: number;
  installments?: number;
  capture_method?: "pix" | "credit_card" | string;
  transaction_nsu?: string;
  receipt_url?: string;
  status?: string;
  error?: string;
}

export interface InfinitePayWebhookPayload {
  event_type?: string;
  invoice_slug: string;
  amount: number;
  paid_amount?: number;
  installments?: number;
  capture_method?: string;
  transaction_nsu?: string;
  order_nsu: string;
  receipt_url?: string;
  items?: InfinitePayCreateLinkItem[];
  status?: string;
}
