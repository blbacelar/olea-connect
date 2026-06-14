import { NextResponse } from "next/server";

import { getBillingSummary } from "@/lib/billing/server";
import {
  getBillingPortalConfigurationId,
  getStripe,
} from "@/lib/stripe/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const billing = await getBillingSummary();

    if (!billing) {
      return NextResponse.json(
        { error: "No organization subscription was found." },
        { status: 404 },
      );
    }
    if (billing.role !== "owner" && billing.role !== "admin") {
      return NextResponse.json(
        { error: "Only organization administrators can manage billing." },
        { status: 403 },
      );
    }
    if (!billing.customerId) {
      return NextResponse.json(
        { error: "Stripe billing is not ready for this membership yet." },
        { status: 409 },
      );
    }

    const origin = new URL(request.url).origin;
    const session = await getStripe().billingPortal.sessions.create({
      configuration: await getBillingPortalConfigurationId(),
      customer: billing.customerId,
      return_url: `${origin}/subscription`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Unable to create Stripe billing portal session", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to open billing management.",
      },
      { status: 500 },
    );
  }
}
