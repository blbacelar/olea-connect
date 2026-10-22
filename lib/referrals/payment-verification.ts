import type Stripe from "stripe";

export async function hasVerifiedUnrefundedPayment(stripe: Stripe, invoiceId: string) {
  const payments = await stripe.invoicePayments
    .list({ invoice: invoiceId, status: "paid", limit: 100 })
    .autoPagingToArray({ limit: 100 });
  if (payments.length === 0) return false;

  for (const payment of payments) {
    const chargeReference = payment.payment.charge;
    let chargeId = typeof chargeReference === "string"
      ? chargeReference
      : chargeReference?.id;

    if (!chargeId && payment.payment.payment_intent) {
      const intentReference = payment.payment.payment_intent;
      const intentId = typeof intentReference === "string"
        ? intentReference
        : intentReference.id;
      const intent = await stripe.paymentIntents.retrieve(intentId);
      chargeId = typeof intent.latest_charge === "string"
        ? intent.latest_charge
        : intent.latest_charge?.id;
    }

    if (!chargeId) return false;
    const charge = await stripe.charges.retrieve(chargeId);
    if (charge.amount_refunded > 0 || charge.disputed) return false;
  }

  return true;
}
