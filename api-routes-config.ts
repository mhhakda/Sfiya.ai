// ============================================
// SFIYA.AI - NEXT.JS API ROUTES SETUP
// Phase 1 - Endpoints Configuration
// ============================================

// File: pages/api/auth/signup.ts

import { signUpHandler } from "@/lib/auth";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await signUpHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// File: pages/api/auth/verify-email.ts

import { verifyEmailHandler } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await verifyEmailHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// File: pages/api/auth/login.ts

import { loginHandler } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await loginHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// File: pages/api/auth/login-otp.ts

import { loginWithOTPHandler } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await loginWithOTPHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// File: pages/api/auth/verify-login-otp.ts

import { verifyLoginOTPHandler } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await verifyLoginOTPHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// File: pages/api/auth/forgot-password.ts

import { forgotPasswordHandler } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await forgotPasswordHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// File: pages/api/auth/reset-password.ts

import { resetPasswordHandler } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await resetPasswordHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// File: pages/api/payments/plans.ts

import { getPlansHandler } from "@/lib/payment";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await getPlansHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// File: pages/api/payments/create-order.ts

import { createOrderHandler } from "@/lib/payment";
import { verifyTokenMiddleware } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Verify token (middleware)
    await new Promise((resolve, reject) => {
      verifyTokenMiddleware(req as any, res as any, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    await createOrderHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Unauthorized" });
  }
}

// ============================================
// File: pages/api/payments/verify.ts

import { verifyPaymentHandler } from "@/lib/payment";
import { verifyTokenMiddleware } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await new Promise((resolve, reject) => {
      verifyTokenMiddleware(req as any, res as any, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    await verifyPaymentHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// File: pages/api/payments/webhook.ts

import { razorpayWebhookHandler } from "@/lib/payment";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await razorpayWebhookHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

// ============================================
// File: pages/api/payments/subscription.ts

import { getUserSubscriptionHandler } from "@/lib/payment";
import { verifyTokenMiddleware } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await new Promise((resolve, reject) => {
      verifyTokenMiddleware(req as any, res as any, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    await getUserSubscriptionHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// File: pages/api/payments/cancel.ts

import { cancelSubscriptionHandler } from "@/lib/payment";
import { verifyTokenMiddleware } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await new Promise((resolve, reject) => {
      verifyTokenMiddleware(req as any, res as any, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    await cancelSubscriptionHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// NEXT.JS.API ROUTES SUMMARY - Phase 1
// ============================================

/**
 * AUTHENTICATION ENDPOINTS:
 * 
 * POST /api/auth/signup
 *   Body: { email, full_name, user_type }
 *   Response: { user_id, message }
 * 
 * POST /api/auth/verify-email
 *   Body: { email, otp, password }
 *   Response: { token, user }
 * 
 * POST /api/auth/login
 *   Body: { email, password }
 *   Response: { token, user }
 * 
 * POST /api/auth/login-otp
 *   Body: { email }
 *   Response: { message }
 * 
 * POST /api/auth/verify-login-otp
 *   Body: { email, otp }
 *   Response: { token, user }
 * 
 * POST /api/auth/forgot-password
 *   Body: { email }
 *   Response: { message }
 * 
 * POST /api/auth/reset-password
 *   Body: { email, otp, new_password }
 *   Response: { message }
 */

/**
 * PAYMENT ENDPOINTS:
 * 
 * GET /api/payments/plans
 *   Response: { plans: [...] }
 * 
 * POST /api/payments/create-order
 *   Headers: { Authorization: "Bearer <token>" }
 *   Body: { plan_id, user_id }
 *   Response: { order: {...} }
 * 
 * POST /api/payments/verify
 *   Headers: { Authorization: "Bearer <token>" }
 *   Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *   Response: { message, payment_id }
 * 
 * POST /api/payments/webhook
 *   Raw Razorpay webhook payload
 *   Response: { success: true }
 * 
 * GET /api/payments/subscription
 *   Headers: { Authorization: "Bearer <token>" }
 *   Response: { subscription, plan }
 * 
 * POST /api/payments/cancel
 *   Headers: { Authorization: "Bearer <token>" }
 *   Body: { subscription_id }
 *   Response: { message }
 */
