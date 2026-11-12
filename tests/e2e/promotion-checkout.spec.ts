import Stripe from "stripe";

import { createAuthenticatedStorageState } from "../fixtures/authenticated.fixture";
import { expect, test } from "../fixtures/test-data.fixture";

test.describe("@critical Stripe promotion checkout", () => {
  test.skip(
    process.env.PLAYWRIGHT_STRIPE_INTEGRATION_ENABLED !== "true",
    "Requires an explicitly enabled development Supabase and Stripe test account.",
  );

  test("opens a promotion-enabled Canopy checkout for a verified account", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("A base URL is required.");
    const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
    if (!stripeKey.startsWith("sk_test_") && !stripeKey.startsWith("rk_test_")) {
      throw new Error("This integration smoke requires a Stripe test key.");
    }
    if (new URL(process.env.TEST_SUPABASE_URL ?? "").hostname !== "tweeaxnawemykedrxsar.supabase.co") {
      throw new Error("This integration smoke is restricted to the development Supabase project.");
    }

    const owner = await testData.createOrganizationOwner({ planId: "canopy" });
    const { data: activation, error: activationError } = await testData.supabase
      .from("workspace_provisioning_requests")
      .insert({
        user_id: owner.userId,
        email: owner.email,
        full_name: owner.fullName,
        organization_name: owner.organizationName,
        province_or_region: "BC",
        plan_id: "canopy",
        billing_interval: "year",
        status: "pending_payment",
        founding_offer_requested: false,
      })
      .select("id")
      .single();
    if (activationError) throw activationError;
    testData.registerCleanup({
      label: `promotion checkout activation ${activation.id}`,
      run: async () => {
        const { error } = await testData.supabase
          .from("workspace_provisioning_requests")
          .delete()
          .eq("id", activation.id);
        if (error) throw error;
      },
    });

    const storageState = await createAuthenticatedStorageState(
      owner.email,
      owner.password,
      baseURL,
    );
    const context = await browser.newContext({ storageState });
    try {
      const response = await context.request.post(`${baseURL}/api/v1/provisioning/retry`);
      expect(response.status()).toBe(200);
      const result = await response.json();
      expect(result.status).toBe("pending_payment");
      expect(result.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//);

      const { data: pending, error: lookupError } = await testData.supabase
        .from("workspace_provisioning_requests")
        .select("checkout_session_id")
        .eq("id", activation.id)
        .single();
      if (lookupError) throw lookupError;
      const sessionId = pending.checkout_session_id;
      if (!sessionId) throw new Error("Stripe Checkout session was not recorded.");
      expect(sessionId).toMatch(/^cs_test_/);
      const checkoutPage = await context.newPage();
      await checkoutPage.goto(result.checkoutUrl);
      await expect(checkoutPage.getByRole("textbox", { name: "Add promotion code" })).toBeVisible();

      // Staging owns its own Stripe test key; the local CLI key cannot retrieve
      // or expire sessions in that account. Its sessions expire automatically.
      if (["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) {
        testData.registerCleanup({
          label: `promotion checkout session ${sessionId}`,
          run: async () => {
            const stripe = new Stripe(stripeKey);
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (session.status === "open") {
              await stripe.checkout.sessions.expire(sessionId);
            }
          },
        });

        const stripe = new Stripe(stripeKey);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        expect(session.allow_promotion_codes).toBe(true);
        expect(session.mode).toBe("subscription");
        expect(session.customer_email).toBe(owner.email);
        expect(session.amount_total).toBe(706000);
      }
    } finally {
      await context.close();
    }
  });
});
