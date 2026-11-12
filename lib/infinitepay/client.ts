/**
 * TREVO ONE — OFFICIAL INFINITEPAY (CLOUDWALK) CLIENT
 *
 * Official API endpoints:
 * - POST https://api.checkout.infinitepay.io/links
 * - POST https://api.checkout.infinitepay.io/payment_check
 *
 * Provides real API calls in PRODUCTION and a safe deterministic simulation
 * engine in SIMULATION mode to allow full end-to-end testing without real bank charges.
 */

import type {
  InfinitePayConfig,
  InfinitePayCreateLinkRequest,
  InfinitePayCreateLinkResponse,
  InfinitePayPaymentCheckRequest,
  InfinitePayPaymentCheckResponse,
} from "./types";

const INFINITEPAY_API_BASE = "https://api.checkout.infinitepay.io";
const REQUEST_TIMEOUT_MS = 15000;

export class InfinitePayClient {
  /**
   * Creates a hosted checkout payment link on InfinitePay
   */
  static async createLink(
    config: InfinitePayConfig,
    request: InfinitePayCreateLinkRequest
  ): Promise<InfinitePayCreateLinkResponse> {
    if (!config.enabled) {
      return {
        success: false,
        url: "",
        slug: "",
        error: "A integração com a InfinitePay está desativada para esta consultoria.",
      };
    }

    if (!config.handle || !config.handle.trim()) {
      return {
        success: false,
        url: "",
        slug: "",
        error: "Identificador InfiniteTag (handle) não configurado.",
      };
    }

    // PRODUCTION MODE GUARDS: Prevent simulation leaks
    if (config.environment === "PRODUCTION" || process.env.NODE_ENV === "production") {
      if (config.environment === "SIMULATION") {
        return {
          success: false,
          url: "",
          slug: "",
          error: "O modo de simulação está desabilitado no ambiente de produção.",
        };
      }
      if (!config.apiKey || !config.apiKey.trim() || config.apiKey.startsWith("sim_")) {
        return {
          success: false,
          url: "",
          slug: "",
          error: "Chave de API oficial da InfinitePay obrigatória para produção.",
        };
      }
    }

    // SIMULATION MODE
    if (config.environment === "SIMULATION" || !config.apiKey || config.apiKey.startsWith("sim_")) {
      const simulatedSlug = `sim_slug_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      // Simulated checkout URL directs the student safely to the return page with simulation flags
      const separator = request.redirect_url.includes("?") ? "&" : "?";
      const simulatedCheckoutUrl = `${request.redirect_url}${separator}simulated_checkout=1&slug=${simulatedSlug}&order_nsu=${encodeURIComponent(request.order_nsu)}`;

      return {
        success: true,
        url: simulatedCheckoutUrl,
        slug: simulatedSlug,
        status: "PENDING",
        order_nsu: request.order_nsu,
      };
    }

    // PRODUCTION MODE (Real CloudWalk API)
    const endpoint = `${INFINITEPAY_API_BASE}/links`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": config.apiKey.trim(),
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        const errorMsg = data?.message || data?.error || `Falha na API InfinitePay (HTTP ${res.status})`;
        return {
          success: false,
          url: "",
          slug: "",
          error: errorMsg,
        };
      }

      const checkoutUrl = data.url || data.checkout_url || data.link || "";
      const slug = data.slug || data.invoice_slug || "";

      return {
        success: true,
        url: checkoutUrl,
        slug,
        status: data.status || "PENDING",
        order_nsu: request.order_nsu,
      };
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      return {
        success: false,
        url: "",
        slug: "",
        error: isAbort
          ? "Tempo limite esgotado ao comunicar com a InfinitePay."
          : "Erro de conexão com o serviço de pagamento.",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Verifies payment status directly on InfinitePay using POST /payment_check
   * Required fields: handle, order_nsu, slug, transaction_nsu (when available)
   */
  static async paymentCheck(
    config: InfinitePayConfig,
    request: InfinitePayPaymentCheckRequest
  ): Promise<InfinitePayPaymentCheckResponse> {
    if (!config.enabled) {
      return {
        success: false,
        paid: false,
        error: "A integração com a InfinitePay está desativada para esta consultoria.",
      };
    }

    // PRODUCTION MODE GUARDS: Prevent simulation leaks
    if (config.environment === "PRODUCTION" || process.env.NODE_ENV === "production") {
      if (config.environment === "SIMULATION") {
        return {
          success: false,
          paid: false,
          error: "O modo de simulação está desabilitado no ambiente de produção.",
        };
      }
      if (!config.apiKey || !config.apiKey.trim() || config.apiKey.startsWith("sim_")) {
        return {
          success: false,
          paid: false,
          error: "Chave de API oficial da InfinitePay obrigatória para produção.",
        };
      }
      if (
        (request.slug && request.slug.startsWith("sim_")) ||
        (request.transaction_nsu && request.transaction_nsu.startsWith("sim_"))
      ) {
        return {
          success: false,
          paid: false,
          error: "Identificadores de simulação são proibidos no ambiente de produção.",
        };
      }
    }

    // SIMULATION MODE
    if (
      config.environment === "SIMULATION" ||
      !config.apiKey ||
      config.apiKey.startsWith("sim_") ||
      (request.slug && request.slug.startsWith("sim_"))
    ) {
      const isRefused = Boolean(request.slug?.includes("refused") || request.order_nsu?.includes("refused"));
      const isPending = Boolean(request.slug?.includes("pending") || request.order_nsu?.includes("pending"));
      const isDivergent = Boolean(request.slug?.includes("divergent") || request.order_nsu?.includes("divergent"));

      if (isRefused) {
        return {
          success: true,
          paid: false,
          amount: 10000,
          paid_amount: 0,
          installments: 1,
          capture_method: "credit_card",
          status: "REFUSED",
          error: "Cartão recusado pela operadora.",
        };
      }

      if (isPending) {
        return {
          success: true,
          paid: false,
          amount: 10000,
          paid_amount: 0,
          status: "PENDING",
        };
      }

      return {
        success: true,
        paid: true,
        amount: 10000,
        paid_amount: isDivergent ? 5000 : 10000,
        installments: 1,
        capture_method: "pix",
        transaction_nsu: `sim_tx_${Date.now()}`,
        receipt_url: "https://comprovante.infinitepay.io/simulado",
        status: "PAID",
      };
    }

    // PRODUCTION MODE (Real CloudWalk API)
    const endpoint = `${INFINITEPAY_API_BASE}/payment_check`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const payload: Record<string, string> = {
      handle: config.handle.trim(),
      order_nsu: request.order_nsu.trim(),
    };

    if (request.slug) {
      payload.slug = request.slug.trim();
    }
    if (request.transaction_nsu) {
      payload.transaction_nsu = request.transaction_nsu.trim();
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": config.apiKey.trim(),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        const errorMsg = data?.message || data?.error || `Falha na verificação InfinitePay (HTTP ${res.status})`;
        return {
          success: false,
          paid: false,
          error: errorMsg,
        };
      }

      // STRICT CONFIRMATION: Official CloudWalk API specification states confirmation
      // depends strictly on boolean success === true AND paid === true.
      // NEVER presume status text like "PAID" or "APPROVED".
      const isPaid = Boolean(data.success === true && data.paid === true);

      return {
        success: true,
        paid: isPaid,
        amount: typeof data.amount === "number" ? data.amount : undefined,
        paid_amount: typeof data.paid_amount === "number" ? data.paid_amount : undefined,
        installments: typeof data.installments === "number" ? data.installments : 1,
        capture_method: data.capture_method || "pix",
        transaction_nsu: data.transaction_nsu || request.transaction_nsu,
        receipt_url: data.receipt_url,
        status: data.status || (isPaid ? "PAID" : "PENDING"),
      };
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      return {
        success: false,
        paid: false,
        error: isAbort
          ? "Tempo limite esgotado ao verificar pagamento com a InfinitePay."
          : "Erro de rede ao verificar status do pagamento.",
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
