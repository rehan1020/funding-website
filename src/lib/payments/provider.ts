import "server-only";
import { serverEnv } from "@/lib/env";

// Gateway-agnostic payment interface. The concrete gateway is still TBD, so we
// isolate all provider-specific logic behind this adapter. Swap PAYMENT_PROVIDER
// (env) once the gateway is chosen; route handlers never import a gateway SDK
// directly.

export interface CheckoutParams {
  submissionId: string;
  amount: number; // minor units (e.g. paise/cents) or provider's expected unit
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  /** URL to redirect the founder to for hosted checkout. */
  redirectUrl: string;
  /** Provider's reference id — persisted as payments.provider_ref (idempotency). */
  providerRef: string;
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

export function getPaymentProvider(): PaymentProvider {
  switch (serverEnv.paymentProvider) {
    // case "stripe":   return new StripeProvider();
    // case "razorpay": return new RazorpayProvider();
    default:
      return new PlaceholderProvider();
  }
}
