import "server-only";
import crypto from "crypto";
import { serverEnv } from "@/lib/env";

// Gateway-agnostic payment interface. The concrete gateway is isolated behind
// this adapter. Swap PAYMENT_PROVIDER (env) to change gateway; route handlers
// never import a gateway SDK directly.

export interface CheckoutParams {
  submissionId: string;
  amount: number; // major units (rupees for INR) — Cashfree order_amount unit
  currency: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  successUrl: string;
  cancelUrl: string;
  /** Server-to-server webhook URL the gateway should call on status change. */
  notifyUrl?: string;
}

export interface CheckoutResult {
  /** Provider's reference id — persisted as payments.provider_ref (idempotency). */
  providerRef: string;
  /** Hosted-form / link providers: redirect the browser straight here. */
  redirectUrl?: string;
  /** Cashfree: hand this to the browser SDK (cashfree.checkout). */
  paymentSessionId?: string;
  /** Cashfree SDK mode, echoed to the client so it loads the right endpoint. */
  mode?: "production" | "sandbox";
}

export interface VerifiedWebhookEvent {
  providerRef: string;
  status: "succeeded" | "failed" | "pending";
  amount: number;
  currency: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  /**
   * Verify the webhook signature and parse the event. MUST throw if the
   * signature is invalid — no payment state is ever trusted without this.
   */
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedWebhookEvent>;
  /**
   * Server-side status reconciliation, keyed on providerRef. Used to confirm a
   * payment on the browser return_url without trusting the redirect itself.
   * Optional: providers without a status API omit it.
   */
  fetchStatus?(providerRef: string): Promise<VerifiedWebhookEvent | null>;
}

// --- Hosted-form adapter -----------------------------------------------------
// For a no-code hosted payment page (e.g. a Cashfree Payment Form link) where
// we have only the URL — no API keys, no server order creation, no webhook.
// The founder is redirected to the form; payment confirmation is MANUAL: an
// admin verifies the payment in the gateway dashboard and sets the submission
// to 'paid_priority' in the admin panel. Upgrading to the full API later is
// just swapping PAYMENT_PROVIDER + implementing a provider below.
class HostedFormProvider implements PaymentProvider {
  readonly name = "hosted_form";

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    // No gateway round-trip; redirect straight to the hosted form. We mint our
    // own ref (one priority payment per submission) so the pending payment row
    // is idempotent on retries.
    return {
      redirectUrl: serverEnv.paymentFormUrl,
      providerRef: `form_${params.submissionId}`,
    };
  }

  async verifyWebhook(_rawBody: string, _headers: Headers): Promise<VerifiedWebhookEvent> {
    // Hosted form has no signed webhook here; confirmation is manual.
    throw new Error("Hosted-form provider does not receive webhooks.");
  }
}

// --- Placeholder adapter -----------------------------------------------------
// Replace the internals of createCheckout / verifyWebhook with the chosen
// gateway's SDK calls. The signature-verification step is mandatory; the stub
// throws so an unconfigured deployment fails closed rather than open.
class PlaceholderProvider implements PaymentProvider {
  readonly name = serverEnv.paymentProvider;

  async createCheckout(_params: CheckoutParams): Promise<CheckoutResult> {
    throw new Error(
      `Payment provider "${this.name}" not yet implemented. ` +
        `Wire up createCheckout() in src/lib/payments/provider.ts.`
    );
  }

  async verifyWebhook(_rawBody: string, _headers: Headers): Promise<VerifiedWebhookEvent> {
    // A real implementation validates the HMAC/signature header against
    // serverEnv.paymentWebhookSecret before returning any parsed data.
    throw new Error(
      `Webhook verification for "${this.name}" not yet implemented. ` +
        `Wire up verifyWebhook() in src/lib/payments/provider.ts.`
    );
  }
}

// --- Cashfree adapter (full PG API) ------------------------------------------
// Uses the Orders API with a merchant-set order_id (= our provider_ref), so
// webhooks and the Get Order status API both match cleanly on that id. The
// browser opens Cashfree's hosted checkout via @cashfreepayments/cashfree-js
// using the payment_session_id. Payment is confirmed two ways, both verified
// server-side: (1) the signed webhook at /api/webhooks/payment, (2) a Get Order
// status check on the return_url. The browser redirect itself is never trusted.
const CASHFREE_API_VERSION = "2023-08-01";

class CashfreeProvider implements PaymentProvider {
  readonly name = "cashfree";

  private headers(): Record<string, string> {
    return {
      "content-type": "application/json",
      "x-api-version": CASHFREE_API_VERSION,
      "x-client-id": serverEnv.cashfreeAppId,
      "x-client-secret": serverEnv.cashfreeSecretKey,
    };
  }

  private orderId(submissionId: string): string {
    return `pri_${submissionId}`; // deterministic → one order per submission
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const orderId = this.orderId(params.submissionId);
    const digits = (params.customerPhone ?? "").replace(/\D/g, "");
    const phone = digits.length > 10 ? digits.slice(-10) : digits;

    const body = {
      order_id: orderId,
      order_amount: params.amount,
      order_currency: params.currency,
      customer_details: {
        customer_id: params.submissionId,
        customer_phone: phone || "0000000000",
        customer_email: params.customerEmail || undefined,
        customer_name: params.customerName || undefined,
      },
      order_meta: {
        return_url: params.successUrl,
        notify_url: params.notifyUrl,
      },
    };

    const res = await fetch(`${serverEnv.cashfreeApiBase}/orders`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Founder re-opened checkout: the order already exists. Reuse its session
      // rather than failing, so provider_ref stays stable (idempotent).
      const exists =
        res.status === 409 || /order_id.*exist|already/i.test(json?.message ?? "");
      if (exists) {
        const order = await this.fetchOrder(orderId);
        if (order?.payment_session_id) {
          return {
            providerRef: orderId,
            paymentSessionId: order.payment_session_id,
            mode: serverEnv.cashfreeMode,
          };
        }
      }
      throw new Error(`Cashfree create order failed: ${json?.message ?? res.status}`);
    }

    return {
      providerRef: orderId,
      paymentSessionId: json.payment_session_id,
      mode: serverEnv.cashfreeMode,
    };
  }

  private async fetchOrder(orderId: string): Promise<any | null> {
    const res = await fetch(
      `${serverEnv.cashfreeApiBase}/orders/${encodeURIComponent(orderId)}`,
      { headers: this.headers() }
    );
    if (!res.ok) return null;
    return res.json().catch(() => null);
  }

  async fetchStatus(providerRef: string): Promise<VerifiedWebhookEvent | null> {
    const order = await this.fetchOrder(providerRef);
    if (!order) return null;
    const map: Record<string, VerifiedWebhookEvent["status"]> = {
      PAID: "succeeded",
      EXPIRED: "failed",
      TERMINATED: "failed",
      ACTIVE: "pending",
    };
    return {
      providerRef,
      status: map[order.order_status] ?? "pending",
      amount: Number(order.order_amount ?? 0),
      currency: order.order_currency ?? "INR",
    };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedWebhookEvent> {
    const ts = headers.get("x-webhook-timestamp");
    const sig = headers.get("x-webhook-signature");
    if (!ts || !sig) throw new Error("Missing Cashfree webhook signature headers.");

    // HMAC-SHA256(timestamp + rawBody) with the Secret Key, base64. Computed on
    // the RAW body — parsing/reserialising would break the signature.
    const expected = crypto
      .createHmac("sha256", serverEnv.cashfreeSecretKey)
      .update(ts + rawBody)
      .digest("base64");
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new Error("Cashfree webhook signature mismatch.");
    }

    const evt: any = JSON.parse(rawBody);
    const order = evt?.data?.order ?? {};
    const payment = evt?.data?.payment ?? {};
    const statusMap: Record<string, VerifiedWebhookEvent["status"]> = {
      SUCCESS: "succeeded",
      FAILED: "failed",
      USER_DROPPED: "failed",
    };
    return {
      providerRef: order.order_id,
      status: statusMap[payment.payment_status] ?? "pending",
      amount: Number(order.order_amount ?? payment.payment_amount ?? 0),
      currency: order.order_currency ?? payment.payment_currency ?? "INR",
    };
  }
}

export function getPaymentProvider(): PaymentProvider {
  switch (serverEnv.paymentProvider) {
    case "cashfree":
      return new CashfreeProvider();
    case "hosted_form":
      return new HostedFormProvider();
    // case "stripe":   return new StripeProvider();
    default:
      return new PlaceholderProvider();
  }
}
