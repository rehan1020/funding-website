// Minimal ambient types for the Cashfree browser SDK, which ships no types.
// Only the surface we use (load + checkout) is declared.
declare module "@cashfreepayments/cashfree-js" {
  export interface CashfreeCheckoutOptions {
    paymentSessionId: string;
    redirectTarget?: "_self" | "_blank" | "_top" | "_modal";
    returnUrl?: string;
  }

  export interface CashfreeInstance {
    checkout(options: CashfreeCheckoutOptions): Promise<unknown> | void;
  }

  export function load(options: {
    mode: "production" | "sandbox";
  }): Promise<CashfreeInstance>;
}
