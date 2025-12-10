// ============================================
// SFIYA.AI - RAZORPAY PAYMENT SYSTEM
// Phase 1 - Subscriptions, Orders, Webhooks
// ============================================

import Razorpay from "razorpay";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Request, Response } from "express";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================
// GET SUBSCRIPTION PLANS
// ============================================

export async function getPlansHandler(req: Request, res: Response) {
  try {
    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("status", "active");

    if (error) throw error;

    res.json({
      success: true,
      plans: plans,
    });
  } catch (error) {
    console.error("Get plans error:", error);
    res.status(500).json({ error: "Failed to fetch plans" });
  }
}

// ============================================
// CREATE RAZORPAY ORDER (One-time Payment)
// ============================================

export async function createOrderHandler(req: Request, res: Response) {
  try {
    const { plan_id, user_id } = req.body;

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Amount in paise (INR)
    const amountInPaise = Math.round(plan.price_inr * 100);

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `order_${user_id}_${Date.now()}`,
      notes: {
        user_id,
        plan_id,
        plan_name: plan.name,
      },
    });

    // Store order in database
    const { data: dbOrder, error: dbError } = await supabase
      .from("payments")
      .insert([
        {
          user_id,
          subscription_id: null,
          razorpay_order_id: order.id,
          amount: plan.price_inr,
          currency: "INR",
          payment_status: "pending",
          description: `Subscription: ${plan.name}`,
          metadata: {
            plan_id,
            plan_name: plan.name,
          },
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        razorpay_key_id: process.env.RAZORPAY_KEY_ID,
        user_email: user.email,
        user_name: user.full_name,
      },
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
}

// ============================================
// VERIFY PAYMENT & ACTIVATE SUBSCRIPTION
// ============================================

export async function verifyPaymentHandler(req: Request, res: Response) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    // Verify signature
    const hmac = crypto.createHmac(
      "sha256",
      process.env.RAZORPAY_KEY_SECRET!
    );
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Fetch payment details
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    // Get order from database
    const { data: dbPayment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .single();

    if (paymentError || !dbPayment) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Update payment status
    await supabase
      .from("payments")
      .update({
        razorpay_payment_id,
        razorpay_signature,
        payment_status: "completed",
      })
      .eq("id", dbPayment.id);

    // Get plan details
    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", dbPayment.metadata.plan_id)
      .single();

    if (plan) {
      // Create subscription
      const startDate = new Date();
      const renewalDate = new Date(startDate);
      renewalDate.setMonth(renewalDate.getMonth() + 1);

      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .insert([
          {
            user_id: dbPayment.user_id,
            plan_id: plan.id,
            plan_name: plan.name,
            subscription_status: "active",
            start_date: startDate.toISOString(),
            renewal_date: renewalDate.toISOString(),
            expiry_date: renewalDate.toISOString(),
            auto_renew: true,
          },
        ])
        .select()
        .single();

      // Update user plan
      await supabase
        .from("users")
        .update({
          current_plan: plan.name.toLowerCase(),
          subscription_status: "active",
        })
        .eq("id", dbPayment.user_id);

      // Log webhook event
      await logWebhookEvent({
        user_id: dbPayment.user_id,
        webhook_type: "payment_verified",
        platform: "razorpay",
        request_body: { razorpay_order_id, razorpay_payment_id },
        status_code: 200,
        is_processed: true,
      });
    }

    res.json({
      success: true,
      message: "Payment verified and subscription activated",
      payment_id: razorpay_payment_id,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ error: "Payment verification failed" });
  }
}

// ============================================
// RAZORPAY WEBHOOK HANDLER
// ============================================

export async function razorpayWebhookHandler(req: Request, res: Response) {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    // Verify webhook signature
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(JSON.stringify(req.body));
    const generated_signature = hmac.digest("hex");

    if (generated_signature !== signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`Razorpay webhook received: ${event}`);

    // Handle different event types
    switch (event) {
      case "payment.authorized":
        await handlePaymentAuthorized(payload);
        break;

      case "payment.failed":
        await handlePaymentFailed(payload);
        break;

      case "subscription.activated":
        await handleSubscriptionActivated(payload);
        break;

      case "subscription.paused":
        await handleSubscriptionPaused(payload);
        break;

      case "subscription.cancelled":
        await handleSubscriptionCancelled(payload);
        break;

      case "subscription.resumed":
        await handleSubscriptionResumed(payload);
        break;

      default:
        console.log(`Unhandled event: ${event}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

// ============================================
// WEBHOOK HANDLERS
// ============================================

async function handlePaymentAuthorized(payload: any) {
  const payment = payload.payment.entity;

  console.log(`Payment authorized: ${payment.id}`);

  const { data: dbPayment } = await supabase
    .from("payments")
    .select("*")
    .eq("razorpay_payment_id", payment.id)
    .single();

  if (dbPayment) {
    await supabase
      .from("payments")
      .update({ payment_status: "completed" })
      .eq("id", dbPayment.id);
  }
}

async function handlePaymentFailed(payload: any) {
  const payment = payload.payment.entity;

  console.log(`Payment failed: ${payment.id}`);

  const { data: dbPayment } = await supabase
    .from("payments")
    .select("*")
    .eq("razorpay_payment_id", payment.id)
    .single();

  if (dbPayment) {
    await supabase
      .from("payments")
      .update({ payment_status: "failed" })
      .eq("id", dbPayment.id);
  }
}

async function handleSubscriptionActivated(payload: any) {
  const subscription = payload.subscription.entity;

  console.log(`Subscription activated: ${subscription.id}`);

  const { data: dbSubscription } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("razorpay_subscription_id", subscription.id)
    .single();

  if (dbSubscription) {
    await supabase
      .from("user_subscriptions")
      .update({
        subscription_status: "active",
        razorpay_subscription_id: subscription.id,
      })
      .eq("id", dbSubscription.id);

    // Trigger webhook event
    await logWebhookEvent({
      user_id: dbSubscription.user_id,
      webhook_type: "subscription_activated",
      platform: "razorpay",
      request_body: subscription,
      status_code: 200,
      is_processed: true,
    });
  }
}

async function handleSubscriptionPaused(payload: any) {
  const subscription = payload.subscription.entity;

  console.log(`Subscription paused: ${subscription.id}`);

  const { data: dbSubscription } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("razorpay_subscription_id", subscription.id)
    .single();

  if (dbSubscription) {
    await supabase
      .from("user_subscriptions")
      .update({ subscription_status: "paused" })
      .eq("id", dbSubscription.id);
  }
}

async function handleSubscriptionCancelled(payload: any) {
  const subscription = payload.subscription.entity;

  console.log(`Subscription cancelled: ${subscription.id}`);

  const { data: dbSubscription } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("razorpay_subscription_id", subscription.id)
    .single();

  if (dbSubscription) {
    await supabase
      .from("user_subscriptions")
      .update({ subscription_status: "cancelled" })
      .eq("id", dbSubscription.id);

    // Downgrade user to free plan
    await supabase
      .from("users")
      .update({
        current_plan: "free",
        subscription_status: "cancelled",
      })
      .eq("id", dbSubscription.user_id);
  }
}

async function handleSubscriptionResumed(payload: any) {
  const subscription = payload.subscription.entity;

  console.log(`Subscription resumed: ${subscription.id}`);

  const { data: dbSubscription } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("razorpay_subscription_id", subscription.id)
    .single();

  if (dbSubscription) {
    await supabase
      .from("user_subscriptions")
      .update({ subscription_status: "active" })
      .eq("id", dbSubscription.id);
  }
}

// ============================================
// HELPER: LOG WEBHOOK EVENT
// ============================================

async function logWebhookEvent(webhookData: any) {
  try {
    await supabase.from("webhook_logs").insert([webhookData]);
  } catch (error) {
    console.error("Failed to log webhook:", error);
  }
}

// ============================================
// CANCEL SUBSCRIPTION
// ============================================

export async function cancelSubscriptionHandler(req: Request, res: Response) {
  try {
    const { subscription_id } = req.body;
    const user_id = req.user?.user_id;

    // Get subscription
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("id", subscription_id)
      .eq("user_id", user_id)
      .single();

    if (subError || !subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    if (subscription.razorpay_subscription_id) {
      // Cancel in Razorpay
      await razorpay.subscriptions.cancel(
        subscription.razorpay_subscription_id
      );
    }

    // Update in database
    await supabase
      .from("user_subscriptions")
      .update({ subscription_status: "cancelled" })
      .eq("id", subscription_id);

    // Downgrade user
    await supabase
      .from("users")
      .update({
        current_plan: "free",
        subscription_status: "cancelled",
      })
      .eq("id", user_id);

    res.json({
      success: true,
      message: "Subscription cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
}

// ============================================
// GET USER SUBSCRIPTION STATUS
// ============================================

export async function getUserSubscriptionHandler(req: Request, res: Response) {
  try {
    const user_id = req.user?.user_id;

    const { data: subscription, error } = await supabase
      .from("user_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("user_id", user_id)
      .eq("subscription_status", "active")
      .single();

    if (error) {
      return res.json({
        subscription: null,
        plan: null,
        status: "inactive",
      });
    }

    res.json({
      success: true,
      subscription,
      plan: subscription.subscription_plans,
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
}

export { razorpay };
