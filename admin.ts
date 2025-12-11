// admin.ts
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
): Promise<void> {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (decoded.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    req.user = decoded;
    next();
    return;
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
}

// ============================================
// GET ALL USERS (Admin)
// ============================================

export async function getAllUsersHandler(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    const { page = 1, limit = 50, status, user_type } = req.query;

    let query = supabase
      .from("users")
      .select("*, user_subscriptions(*)", { count: "exact" });

    if (status) {
      query = query.eq("status", status as string);
    }

    if (user_type) {
      query = query.eq("user_type", user_type as string);
    }

    const start = (Number(page) - 1) * Number(limit);
    const end = Number(page) * Number(limit);

    const { data: users, count, error } = await query
      .range(start, end)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase getAllUsers error:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    return res.json({
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
    return res.status(500).json({ error: "Failed to fetch users" });
  }
}

// ============================================
// GET USER DETAILS (Admin)
// ============================================

export async function getUserDetailsHandler(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: "Missing user_id parameter" });
    }

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

    if (error) {
      console.error("Supabase getUserDetails error:", error);
      return res.status(500).json({ error: "Failed to fetch user" });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user details error:", error);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
}

// ============================================
// UPDATE USER STATUS (Admin)
// ============================================

export async function updateUserStatusHandler(
  req: Request & { user?: any },
  res: Response
): Promise<Response> {
  try {
    const { user_id } = req.params ?? {};
    const { status } = req.body ?? {};

    // Basic validation
    if (!user_id) {
      return res.status(400).json({ error: "Missing user_id parameter" });
    }
    if (typeof status === "undefined") {
      return res.status(400).json({ error: "Missing status in request body" });
    }

    // Auth guard
    const adminId = req.user?.user_id;
    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized: admin user not found" });
    }

    // Update user in DB
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ status })
      .eq("id", user_id)
      .select()
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return res.status(500).json({ error: updateError.message || "Failed to update user status" });
    }

    // Log admin action (safe)
    const { error: logError } = await supabase.from("admin_actions").insert([
      {
        admin_id: adminId,
        action_type: "user_status_updated",
        target_user_id: user_id,
        description: `User status changed to ${status}`,
      },
    ]);

    if (logError) {
      console.error("Supabase admin_actions insert error:", logError);
      // still return success for the update but inform about logging failure
      return res.status(200).json({
        success: true,
        user: updatedUser ?? null,
        warning: "User updated but failed to log admin action",
      });
    }

    // Success
    return res.status(200).json({ success: true, user: updatedUser ?? null });
  } catch (err) {
    console.error("updateUserStatusHandler unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// BAN USER (Admin)
// ============================================

export async function banUserHandler(
  req: Request & { user?: any },
  res: Response
): Promise<Response> {
  try {
    const { user_id } = req.params;
    const { reason } = req.body ?? {};

    if (!user_id) {
      return res.status(400).json({ error: "Missing user_id parameter" });
    }

    // Auth guard
    const adminId = req.user?.user_id;
    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized: admin user not found" });
    }

    // Update user status
    const { error: updateError } = await supabase
      .from("users")
      .update({
        status: "banned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id);

    if (updateError) {
      console.error("Supabase ban user update error:", updateError);
      return res.status(500).json({ error: "Failed to ban user" });
    }

    // Cancel all subscriptions
    const { error: cancelError } = await supabase
      .from("user_subscriptions")
      .update({ subscription_status: "cancelled" })
      .eq("user_id", user_id);

    if (cancelError) {
      console.error("Supabase cancel subscriptions error:", cancelError);
      // continue — depending on your needs you could return an error here
    }

    // Deactivate all connected accounts
    const { error: deactivateError } = await supabase
      .from("connected_accounts")
      .update({ is_active: false })
      .eq("user_id", user_id);

    if (deactivateError) {
      console.error("Supabase deactivate accounts error:", deactivateError);
      // continue
    }

    // Log action (guarded)
    const { error: logError } = await supabase.from("admin_actions").insert([
      {
        admin_id: adminId,
        action_type: "user_banned",
        target_user_id: user_id,
        description: `User banned. Reason: ${reason}`,
      },
    ]);

    if (logError) {
      console.error("Failed to log admin action:", logError);
      // return success but warn
      return res.status(200).json({
        success: true,
        message: "User has been banned (but failed to log action)",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User has been banned",
    });
  } catch (error) {
    console.error("Ban user error:", error);
    return res.status(500).json({ error: "Failed to ban user" });
  }
}

// ============================================
// GET SUBSCRIPTION STATS (Admin)
// ============================================

export async function getSubscriptionStatsHandler(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    // Total active subscriptions
    const { data: activeSubCount, error: activeError } = await supabase
      .from("user_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("subscription_status", "active");

    if (activeError) {
      console.error("Supabase activeSubCount error:", activeError);
      return res.status(500).json({ error: "Failed to fetch subscription stats" });
    }

    // Revenue by plan
    const { data: revenueByPlan, error: revenueError } = await supabase
      .from("payments")
      .select("metadata->plan_name, sum(amount) as total_revenue, count(*) as count")
      .eq("payment_status", "completed")
      .group("metadata->plan_name");

    if (revenueError) {
      console.error("Supabase revenueByPlan error:", revenueError);
      // continue, return fallback below
    }

    // Monthly revenue
    const { data: monthlyRevenue, error: monthlyError } = await supabase
      .from("payments")
      .select("created_at, sum(amount) as total_revenue, count(*) as count")
      .eq("payment_status", "completed")
      .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .group("date_trunc('day', created_at)");

    if (monthlyError) {
      console.error("Supabase monthlyRevenue error:", monthlyError);
    }

    // Churn rate
    const { data: cancelled, error: cancelledError } = await supabase
      .from("user_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("subscription_status", "cancelled")
      .gte("updated_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (cancelledError) {
      console.error("Supabase cancelled error:", cancelledError);
    }

    return res.json({
      success: true,
      stats: {
        active_subscriptions: (activeSubCount as any[])?.length || 0,
        revenue_by_plan: revenueByPlan || [],
        monthly_revenue: monthlyRevenue || [],
        monthly_cancellations: (cancelled as any[])?.length || 0,
      },
    });
  } catch (error) {
    console.error("Get subscription stats error:", error);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
}

// ============================================
// GET REVENUE DASHBOARD (Admin)
// ============================================

export async function getRevenueHandler(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    const { period = "month" } = req.query;

    let dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (period === "year") {
      dateFilter = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    } else if (period === "week") {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // Total revenue
    const { data: totalRevenue, error: totalError } = await supabase
      .from("payments")
      .select("amount")
      .eq("payment_status", "completed")
      .gte("created_at", dateFilter.toISOString());

    if (totalError) {
      console.error("Supabase totalRevenue error:", totalError);
    }

    const total = (totalRevenue || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    // Revenue by payment method
    const { data: byMethod, error: byMethodError } = await supabase
      .from("payments")
      .select("payment_method, sum(amount) as total")
      .eq("payment_status", "completed")
      .gte("created_at", dateFilter.toISOString())
      .group("payment_method");

    if (byMethodError) {
      console.error("Supabase byMethod error:", byMethodError);
    }

    // Failed payments
    const { data: failedCount, error: failedError } = await supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "failed")
      .gte("created_at", dateFilter.toISOString());

    if (failedError) {
      console.error("Supabase failed payments error:", failedError);
    }

    return res.json({
      success: true,
      revenue: {
        total,
        by_method: byMethod || [],
        failed_payments: (failedCount as any[])?.length || 0,
        period,
      },
    });
  } catch (error) {
    console.error("Get revenue error:", error);
    return res.status(500).json({ error: "Failed to fetch revenue" });
  }
}

// ============================================
// UPDATE PLAN (Admin)
// ============================================

export async function updatePlanHandler(
  req: Request & { user?: any },
  res: Response
): Promise<Response> {
  try {
    const { plan_id } = req.params;
    const { name, price_inr, price_usd, features } = req.body ?? {};

    if (!plan_id) {
      return res.status(400).json({ error: "Missing plan_id parameter" });
    }

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

    if (error) {
      console.error("Supabase updatePlan error:", error);
      return res.status(500).json({ error: "Failed to update plan" });
    }

    // Auth guard
    const adminId = req.user?.user_id;
    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized: admin user not found" });
    }

    // Log action (guarded)
    const { error: logError } = await supabase.from("admin_actions").insert([
      {
        admin_id: adminId,
        action_type: "plan_updated",
        description: `Plan ${name} updated`,
      },
    ]);

    if (logError) {
      console.error("Failed to log plan update action:", logError);
      return res.status(200).json({
        success: true,
        plan,
        warning: "Plan updated but failed to log admin action",
      });
    }

    return res.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error("Update plan error:", error);
    return res.status(500).json({ error: "Failed to update plan" });
  }
}

// ============================================
// GET AI USAGE (Admin)
// ============================================

export async function getAIUsageHandler(
  req: Request,
  res: Response
): Promise<Response> {
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
      query = query.eq("user_id", user_id as string);
    }

    const { data: usage, error } = await query.group("user_id");

    if (error) {
      console.error("Supabase getAIUsage error:", error);
      return res.status(500).json({ error: "Failed to fetch AI usage" });
    }

    return res.json({
      success: true,
      usage,
      period,
    });
  } catch (error) {
    console.error("Get AI usage error:", error);
    return res.status(500).json({ error: "Failed to fetch AI usage" });
  }
}

// ============================================
// GET ADMIN LOGS (Admin)
// ============================================

export async function getAdminLogsHandler(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    const { page = 1, limit = 50 } = req.query;

    const start = (Number(page) - 1) * Number(limit);
    const end = Number(page) * Number(limit);

    const { data: logs, count, error } = await supabase
      .from("admin_actions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) {
      console.error("Supabase getAdminLogs error:", error);
      return res.status(500).json({ error: "Failed to fetch logs" });
    }

    return res.json({
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
    return res.status(500).json({ error: "Failed to fetch logs" });
  }
}

// ============================================
// GET PLATFORM STATS (Admin)
// ============================================

export async function getPlatformStatsHandler(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    // Users by platform
    const { data: byPlatform, error: byPlatformError } = await supabase
      .from("connected_accounts")
      .select("platform, count(*) as count")
      .group("platform");

    if (byPlatformError) {
      console.error("Supabase byPlatform error:", byPlatformError);
    }

    // Total connected accounts
    const { data: totalAccounts, error } = await supabase
      .from("connected_accounts")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Supabase totalAccounts error:", error);
      return res.status(500).json({ error: "Failed to fetch platform stats" });
    }

    // Active auto-replies today
    const { data: activeReplies } = await supabase
      .from("auto_replies")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return res.json({
      success: true,
      stats: {
        total_connected_accounts: (totalAccounts as any[])?.length || 0,
        accounts_by_platform: byPlatform || [],
        auto_replies_today: (activeReplies as any[])?.length || 0,
      },
    });
  } catch (error) {
    console.error("Get platform stats error:", error);
    return res.status(500).json({ error: "Failed to fetch platform stats" });
  }
}
