import { Router } from "express";
import Stripe from "stripe";
import { db } from "@workspace/db";
import { companies, users } from "@workspace/db/schema";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { getCompanyId } from "../lib/getCompanyId";

const router = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2025-03-31.basil" });
}

// Seat prices per role (monthly)
const SEAT_PRICES = {
  admin: { priceEnvKey: "STRIPE_PRICE_ADMIN", label: "Admin", amount: 14900 },
  admissions: { priceEnvKey: "STRIPE_PRICE_ADMISSIONS", label: "Admissions", amount: 9900 },
  bd: { priceEnvKey: "STRIPE_PRICE_BD_REP", label: "BD Rep", amount: 6900 },
} as const;

type SeatRole = keyof typeof SEAT_PRICES;

async function getSeatCounts(companyId: number) {
  const roles: SeatRole[] = ["admin", "admissions", "bd"];
  const counts: Record<SeatRole, number> = { admin: 0, admissions: 0, bd: 0 };
  for (const role of roles) {
    const [row] = await db
      .select({ n: count() })
      .from(users)
      .where(and(eq(users.companyId, companyId), eq(users.role, role), eq(users.isActive, true)));
    counts[role] = Number(row?.n ?? 0);
  }
  return counts;
}

// ── GET /api/billing/status ────────────────────────────────────────────────────
router.get("/billing/status", requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    if (!company) { res.status(404).json({ error: "Company not found" }); return; }

    const seats = await getSeatCounts(companyId);
    const monthlyTotal =
      seats.admin * SEAT_PRICES.admin.amount +
      seats.admissions * SEAT_PRICES.admissions.amount +
      seats.bd * SEAT_PRICES.bd.amount;

    const now = new Date();
    const trialEndsAt = company.trialEndsAt ?? new Date(company.createdAt!.getTime() + 30 * 24 * 60 * 60 * 1000);
    const trialDaysLeft = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const trialExpired = now > trialEndsAt;

    res.json({
      subscriptionStatus: company.subscriptionStatus,
      trialEndsAt: trialEndsAt.toISOString(),
      trialDaysLeft,
      trialExpired,
      hasSubscription: !!company.stripeSubscriptionId,
      seats,
      monthlyTotal,
      seatPrices: {
        admin: SEAT_PRICES.admin.amount,
        admissions: SEAT_PRICES.admissions.amount,
        bd: SEAT_PRICES.bd.amount,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/billing/checkout — create Stripe checkout session ───────────────
router.post("/billing/checkout", requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const stripe = getStripe();
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    if (!company) { res.status(404).json({ error: "Company not found" }); return; }

    const sess = req.session as any;
    const adminEmail: string = sess.email ?? "";

    const seats = await getSeatCounts(companyId);

    // Build line items — only include roles with ≥1 active seat
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    for (const [role, info] of Object.entries(SEAT_PRICES) as [SeatRole, typeof SEAT_PRICES[SeatRole]][]) {
      const qty = seats[role];
      const priceId = process.env[info.priceEnvKey];
      if (!priceId) {
        res.status(500).json({ error: `Stripe price not configured for ${role} seats. Set ${info.priceEnvKey}.` });
        return;
      }
      if (qty > 0) {
        lineItems.push({ price: priceId, quantity: qty });
      }
    }

    // If no seats at all (edge case), bill 1 admin seat minimum
    if (lineItems.length === 0) {
      const adminPriceId = process.env[SEAT_PRICES.admin.priceEnvKey];
      if (!adminPriceId) { res.status(500).json({ error: "STRIPE_PRICE_ADMIN not configured" }); return; }
      lineItems.push({ price: adminPriceId, quantity: 1 });
    }

    // Calculate remaining trial days
    const now = new Date();
    const trialEndsAt = company.trialEndsAt ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const trialSecondsLeft = Math.max(0, Math.floor((trialEndsAt.getTime() - now.getTime()) / 1000));

    // Get or create Stripe customer
    let customerId = company.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: adminEmail,
        name: company.name,
        metadata: { companyId: String(companyId), slug: company.slug },
      });
      customerId = customer.id;
      await db.update(companies)
        .set({ stripeCustomerId: customerId })
        .where(eq(companies.id, companyId));
    }

    const baseUrl = process.env.APP_URL ?? `https://${process.env.REPLIT_DOMAINS?.split(",")[0] ?? "admitsimple.com"}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: lineItems,
      subscription_data: trialSecondsLeft > 0
        ? { trial_end: Math.floor(trialEndsAt.getTime() / 1000) }
        : undefined,
      success_url: `${baseUrl}/app/settings?tab=billing&checkout=success`,
      cancel_url: `${baseUrl}/app/settings?tab=billing`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      metadata: { companyId: String(companyId) },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: err.message ?? "Failed to create checkout session" });
  }
});

// ── POST /api/billing/portal — Stripe customer portal ─────────────────────────
router.post("/billing/portal", requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const stripe = getStripe();
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    if (!company?.stripeCustomerId) {
      res.status(400).json({ error: "No billing account found. Set up billing first." });
      return;
    }

    const baseUrl = process.env.APP_URL ?? `https://${process.env.REPLIT_DOMAINS?.split(",")[0] ?? "admitsimple.com"}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: `${baseUrl}/app/settings?tab=billing`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: err.message ?? "Failed to open billing portal" });
  }
});

// ── POST /api/stripe/webhook — raw body, must be registered before express.json() ──
// Exported separately so it can be registered in app.ts before express.json()
export async function handleStripeWebhook(req: import("express").Request, res: import("express").Response) {
  const stripe = getStripe();
  const sig = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    res.status(400).json({ error: "Missing signature or webhook secret" });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, Array.isArray(sig) ? sig[0] : sig, secret);
  } catch (err: any) {
    res.status(400).json({ error: `Webhook signature failed: ${err.message}` });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = parseInt(session.metadata?.companyId ?? "0");
        if (companyId && session.subscription) {
          await db.update(companies).set({
            stripeSubscriptionId: String(session.subscription),
            subscriptionStatus: "active",
            plan: "active",
          }).where(eq(companies.id, companyId));
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const [company] = await db.select({ id: companies.id })
          .from(companies).where(eq(companies.stripeSubscriptionId, sub.id));
        if (company) {
          const status = sub.status === "active" || sub.status === "trialing" ? "active"
            : sub.status === "past_due" ? "past_due"
            : sub.status === "canceled" ? "canceled"
            : sub.status;
          await db.update(companies).set({ subscriptionStatus: status }).where(eq(companies.id, company.id));
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const [company] = await db.select({ id: companies.id })
          .from(companies).where(eq(companies.stripeSubscriptionId, sub.id));
        if (company) {
          await db.update(companies).set({ subscriptionStatus: "canceled", plan: "canceled" }).where(eq(companies.id, company.id));
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const [company] = await db.select({ id: companies.id })
            .from(companies).where(eq(companies.stripeSubscriptionId, String(invoice.subscription)));
          if (company) {
            await db.update(companies).set({ subscriptionStatus: "past_due" }).where(eq(companies.id, company.id));
          }
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const [company] = await db.select({ id: companies.id })
            .from(companies).where(eq(companies.stripeSubscriptionId, String(invoice.subscription)));
          if (company) {
            await db.update(companies).set({ subscriptionStatus: "active" }).where(eq(companies.id, company.id));
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error("[Stripe Webhook] Handler error:", err);
  }

  res.status(200).json({ received: true });
}

export default router;
