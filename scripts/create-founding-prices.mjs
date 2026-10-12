import Stripe from "stripe";

const plans = {
  seedling: { annual: [118000, 18000], quarterly: [32500, 5000] },
  roots: { annual: [353000, 53000], quarterly: [97500, 15000] },
  canopy: { annual: [706000, 106000], quarterly: [195000, 30000] },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
const execute = process.argv.includes("--execute");
const results = [];

async function getOrCreatePrice(tier, cycle, productId, amount) {
  const lookupKey = `olea_2026_${tier}_${cycle}_standard`;
  const existing = (await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 })).data[0];
  const recurring = cycle === "annual"
    ? { interval: "year", interval_count: 1 }
    : { interval: "month", interval_count: 3 };
  if (existing) {
    if (existing.unit_amount !== amount || existing.currency !== "cad" ||
        existing.recurring?.interval !== recurring.interval ||
        existing.recurring.interval_count !== recurring.interval_count ||
        existing.product !== productId) {
      throw new Error(`Existing ${lookupKey} does not match the approved catalog.`);
    }
    return existing.id;
  }
  if (!execute) return "TO_CREATE";
  const price = await stripe.prices.create({
    currency: "cad",
    product: productId,
    unit_amount: amount,
    recurring,
    lookup_key: lookupKey,
    metadata: { olea_tier: tier, olea_cycle: cycle, catalog_version: "2026-10-09" },
  }, { idempotencyKey: lookupKey });
  return price.id;
}

async function getOrCreateCoupon(tier, cycle, productId, amountOff) {
  const id = `olea_founding_2026_${tier}_${cycle}`;
  let coupon;
  try {
    coupon = await stripe.coupons.retrieve(id);
  } catch (error) {
    if (error.statusCode !== 404) throw error;
  }
  if (coupon) {
    if (coupon.deleted || coupon.currency !== "cad" || coupon.amount_off !== amountOff ||
        coupon.duration !== "repeating" || coupon.duration_in_months !== 24 ||
        (coupon.applies_to && !coupon.applies_to.products.includes(productId))) {
      throw new Error(`Existing ${id} does not match the approved founding offer.`);
    }
    return coupon.id;
  }
  if (!execute) return "TO_CREATE";
  const created = await stripe.coupons.create({
    id,
    name: `Olea founding ${tier} ${cycle}`,
    currency: "cad",
    amount_off: amountOff,
    duration: "repeating",
    duration_in_months: 24,
    applies_to: { products: [productId] },
    metadata: { catalog_version: "2026-10-09" },
  }, { idempotencyKey: id });
  return created.id;
}

for (const [tier, cycles] of Object.entries(plans)) {
  const currentAnnualId = process.env[`STRIPE_PRICE_${tier.toUpperCase()}_ANNUAL`];
  if (!currentAnnualId) throw new Error(`Missing annual product source for ${tier}.`);
  const currentAnnual = await stripe.prices.retrieve(currentAnnualId);
  const productId = typeof currentAnnual.product === "string"
    ? currentAnnual.product
    : currentAnnual.product.id;
  for (const [cycle, [amount, discount]] of Object.entries(cycles)) {
    const priceId = await getOrCreatePrice(tier, cycle, productId, amount);
    const couponId = await getOrCreateCoupon(tier, cycle, productId, discount);
    results.push({ tier, cycle, standardCad: amount / 100, foundingCad: (amount - discount) / 100, priceId, couponId });
  }
}

console.log(JSON.stringify({ mode: execute ? "created-or-verified" : "dry-run", live: (process.env.STRIPE_SECRET_KEY ?? "").includes("_live_"), results }, null, 2));
