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

export function getPaymentProvider(): PaymentProvider {
  switch (serverEnv.paymentProvider) {
    case "hosted_form":
      return new HostedFormProvider();
    // case "cashfree": return new CashfreeProvider();  // full API (needs keys)
    // case "stripe":   return new StripeProvider();
    default:
      return new PlaceholderProvider();
  }
}
