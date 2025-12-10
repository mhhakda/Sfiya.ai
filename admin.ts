// ============================================
// SFIYA.AI - ADMIN PANEL SYSTEM
// Phase 1 - User Management & Analytics
// ============================================

import { createClient } from "@supabase/supabase-js";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================
// ADMIN MIDDLEWARE
// ============================================

export async function adminMiddleware(
  req: Request & { user?: any },
  res: Response,
  next: any
) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ============================================
// GET ALL USERS (Admin)
// ============================================

export async function getAllUsersHandler(req: Request, res: Response) {
  try {
    const { page = 1, limit = 50, status, user_type } = req.query;

    let query = supabase
      .from("users")
      .select("*, user_subscriptions(*)", { count: "exact" });

    if (status) {
      query = query.eq("status", status);
    }

    if (user_type) {
      query = query.eq("user_type", user_type);
    }

    const { data: users, count, error } = await query
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit))
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

// ============================================
// GET USER DETAILS (Admin)
// ============================================

export async function getUserDetailsHandler(req: Request, res: Response) {
  try {
    const { user_id } = req.params;

    const { data: user, error } = await supabase
      .from("users")
      .select(
        `
        *,
        user_subscriptions(*),
        connected_accounts(*),
        payments(*),
        analytics(*)
      `
      )
      .eq("id", user_id)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
}

// ============================================
// UPDATE USER STATUS (Admin)
// ============================================

export async function updateUserStatusHandler(req: Request, res: Response) {
  try {
    const { user_id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive", "banned", "suspended"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", user_id)
      .select()
      .single();

    if (error) throw error;

    // Log admin action
    await supabase.from("admin_actions").insert([
      {
        admin_id: req.user.user_id,
        action_type: "user_status_updated",
        target_user_id: user_id,
        description: `User status changed to ${status}`,
      },
    ]);

    res.json({
      success: true,
      message: `User status updated to ${status}`,
      user,
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({ error: "Failed to update user status" });
  }
}

// ============================================
// BAN USER (Admin)
// ============================================

export async function banUserHandler(req: Request, res: Response) {
  try {
    const { user_id } = req.params;
    const { reason } = req.body;

    // Update user status
    await supabase
      .from("users")
      .update({
        status: "banned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id);

    // Cancel all subscriptions
    await supabase
      .from("user_subscriptions")
      .update({ subscription_status: "cancelled" })
      .eq("user_id", user_id);

    // Deactivate all connected accounts
    await supabase
      .from("connected_accounts")
      .update({ is_active: false })
      .eq("user_id", user_id);

    // Log action
    await supabase.from("admin_actions").insert([
      {
        admin_id: req.user.user_id,
        action_type: "user_banned",
        target_user_id: user_id,
        description: `User banned. Reason: ${reason}`,
      },
    ]);

    res.json({
      success: true,
      message: "User has been banned",
    });
  } catch (error) {
    console.error("Ban user error:", error);
    res.status(500).json({ error: "Failed to ban user" });
  }
}

// ============================================
// GET SUBSCRIPTION STATS (Admin)
// ============================================

export async function getSubscriptionStatsHandler(req: Request, res: Response) {
  try {
    // Total active subscriptions
    const { data: activeSubCount, error: activeError } = await supabase
      .from("user_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("subscription_status", "active");

    // Revenue by plan
    const { data: revenueByPlan } = await supabase
      .from("payments")
      .select(
        "metadata->plan_name, sum(amount) as total_revenue, count(*) as count"
      )
      .eq("payment_status", "completed")
      .group("metadata->plan_name");

    // Monthly revenue
    const { data: monthlyRevenue } = await supabase
      .from("payments")
      .select(
        "created_at, sum(amount) as total_revenue, count(*) as count"
      )
      .eq("payment_status", "completed")
      .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
      .group("date_trunc('day', created_at)");

    // Churn rate
    const { data: cancelled } = await supabase
      .from("user_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("subscription_status", "cancelled")
      .gte("updated_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    res.json({
      success: true,
      stats: {
        active_subscriptions: activeSubCount?.length || 0,
        revenue_by_plan: revenueByPlan || [],
        monthly_revenue: monthlyRevenue || [],
        monthly_cancellations: cancelled?.length || 0,
      },
    });
  } catch (error) {
    console.error("Get subscription stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
}

// ============================================
// GET REVENUE DASHBOARD (Admin)
// ============================================

export async function getRevenueHandler(req: Request, res: Response) {
  try {
    const { period = "month" } = req.query;

    let dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (period === "year") {
      dateFilter = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    } else if (period === "week") {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // Total revenue
    const { data: totalRevenue } = await supabase
      .from("payments")
      .select("amount")
      .eq("payment_status", "completed")
      .gte("created_at", dateFilter.toISOString());

    const total = (totalRevenue || []).reduce((sum, p) => sum + p.amount, 0);

    // Revenue by payment method
    const { data: byMethod } = await supabase
      .from("payments")
      .select("payment_method, sum(amount) as total")
      .eq("payment_status", "completed")
      .gte("created_at", dateFilter.toISOString())
      .group("payment_method");

    // Failed payments
    const { data: failedCount, error: failedError } = await supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "failed")
      .gte("created_at", dateFilter.toISOString());

    res.json({
      success: true,
      revenue: {
        total,
        by_method: byMethod || [],
        failed_payments: failedCount?.length || 0,
        period,
      },
    });
  } catch (error) {
    console.error("Get revenue error:", error);
    res.status(500).json({ error: "Failed to fetch revenue" });
  }
}

// ============================================
// UPDATE PLAN (Admin)
// ============================================

export async function updatePlanHandler(req: Request, res: Response) {
  try {
    const { plan_id } = req.params;
    const { name, price_inr, price_usd, features } = req.body;

    const { data: plan, error } = await supabase
      .from("subscription_plans")
      .update({
        name,
        price_inr,
        price_usd,
        ...features,
        updated_at: new Date().toISOString(),
      })
      .eq("id", plan_id)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await supabase.from("admin_actions").insert([
      {
        admin_id: req.user.user_id,
        action_type: "plan_updated",
        description: `Plan ${name} updated`,
      },
    ]);

    res.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error("Update plan error:", error);
    res.status(500).json({ error: "Failed to update plan" });
  }
}

// ============================================
// GET AI USAGE (Admin)
// ============================================

export async function getAIUsageHandler(req: Request, res: Response) {
  try {
    const { user_id, period = "month" } = req.query;

    let dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (period === "year") {
      dateFilter = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    }

    let query = supabase
      .from("analytics")
      .select(
        "user_id, sum(ai_requests_made) as total_requests, sum(ai_tokens_used) as total_tokens"
      )
      .gte("date", dateFilter.toISOString());

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: usage, error } = await query.group("user_id");

    if (error) throw error;

    res.json({
      success: true,
      usage,
      period,
    });
  } catch (error) {
    console.error("Get AI usage error:", error);
    res.status(500).json({ error: "Failed to fetch AI usage" });
  }
}

// ============================================
// GET ADMIN LOGS (Admin)
// ============================================

export async function getAdminLogsHandler(req: Request, res: Response) {
  try {
    const { page = 1, limit = 50 } = req.query;

    const { data: logs, count, error } = await supabase
      .from("admin_actions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit));

    if (error) throw error;

    res.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get admin logs error:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
}

// ============================================
// GET PLATFORM STATS (Admin)
// ============================================

export async function getPlatformStatsHandler(req: Request, res: Response) {
  try {
    // Users by platform
    const { data: byPlatform } = await supabase
      .from("connected_accounts")
      .select("platform, count(*) as count")
      .group("platform");

    // Total connected accounts
    const { data: totalAccounts, error } = await supabase
      .from("connected_accounts")
      .select("*", { count: "exact", head: true });

    // Active auto-replies today
    const { data: activeReplies } = await supabase
      .from("auto_replies")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000));

    if (error) throw error;

    res.json({
      success: true,
      stats: {
        total_connected_accounts: totalAccounts?.length || 0,
        accounts_by_platform: byPlatform || [],
        auto_replies_today: activeReplies?.length || 0,
      },
    });
  } catch (error) {
    console.error("Get platform stats error:", error);
    res.status(500).json({ error: "Failed to fetch platform stats" });
  }
}

export { adminMiddleware };
