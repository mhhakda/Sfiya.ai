// ============================================
// SFIYA.AI - AUTHENTICATION SYSTEM
// Phase 1 - User Auth, OTP, JWT
// ============================================

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { Request, Response } from "express";

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Email Transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// ============================================
// OTP GENERATION & SENDING
// ============================================

async function generateAndSendOTP(email: string, otpType: string) {
  try {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    const { data, error } = await supabase.from("otp_tokens").insert([
      {
        email,
        otp_code: otp,
        otp_type: otpType,
        is_used: false,
        expires_at: expiresAt.toISOString(),
      },
    ]);

    if (error) throw error;

    // Send OTP via email
    await emailTransporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Your Sfiya.ai OTP Code",
      html: `
        <h1>Welcome to Sfiya.ai</h1>
        <p>Your OTP code is:</p>
        <h2 style="color: #2D866F; font-size: 32px; letter-spacing: 5px;">${otp}</h2>
        <p>This code expires in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    return { success: true, message: "OTP sent to email" };
  } catch (error) {
    console.error("OTP generation error:", error);
    throw error;
  }
}

// ============================================
// VERIFY OTP
// ============================================

async function verifyOTP(email: string, otpCode: string, otpType: string) {
  try {
    const { data, error } = await supabase
      .from("otp_tokens")
      .select("*")
      .eq("email", email)
      .eq("otp_code", otpCode)
      .eq("otp_type", otpType)
      .eq("is_used", false)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (error || !data) {
      throw new Error("Invalid or expired OTP");
    }

    // Mark OTP as used
    await supabase
      .from("otp_tokens")
      .update({ is_used: true })
      .eq("id", data.id);

    return { success: true };
  } catch (error) {
    console.error("OTP verification error:", error);
    throw error;
  }
}

// ============================================
// SIGN UP - EMAIL + OTP
// ============================================

export async function signUpHandler(req: Request, res: Response) {
  try {
    const { email, full_name, user_type } = req.body;

    // Validate input
    if (!email || !full_name || !user_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!["individual", "agency"].includes(user_type)) {
      return res.status(400).json({ error: "Invalid user type" });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Create user with pending status
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert([
        {
          email,
          full_name,
          user_type,
          status: "active",
          email_verified: false,
          current_plan: "free",
          subscription_status: "pending",
        },
      ])
      .select()
      .single();

    if (userError) throw userError;

    // Create default auto-reply settings
    await supabase.from("auto_reply_settings").insert([
      {
        user_id: user.id,
        default_tone: "polite",
        default_language: "english",
        auto_like_positive: true,
        ignore_spam: true,
        reply_to_comments: true,
        reply_to_dms: true,
      },
    ]);

    // Create default brand voice
    await supabase.from("brand_voice").insert([
      {
        user_id: user.id,
        brand_name: full_name,
        brand_values: [],
      },
    ]);

    // Send OTP for email verification
    await generateAndSendOTP(email, "email");

    res.status(201).json({
      success: true,
      message: "User created. OTP sent to email.",
      user_id: user.id,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Signup failed" });
  }
}

// ============================================
// VERIFY EMAIL & CREATE PASSWORD
// ============================================

export async function verifyEmailHandler(req: Request, res: Response) {
  try {
    const { email, otp, password } = req.body;

    // Verify OTP
    await verifyOTP(email, otp, "email");

    // Hash password
    const hashedPassword = crypto
      .createHash("sha256")
      .update(password + process.env.ENCRYPTION_KEY!)
      .digest("hex");

    // Update user
    const { data: user, error } = await supabase
      .from("users")
      .update({
        email_verified: true,
        password_hash: hashedPassword,
      })
      .eq("email", email)
      .select()
      .single();

    if (error) throw error;

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRE_TIME || "24h" }
    );

    res.json({
      success: true,
      message: "Email verified successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        user_type: user.user_type,
        current_plan: user.current_plan,
      },
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(400).json({ error: "Email verification failed" });
  }
}

// ============================================
// LOGIN - EMAIL + PASSWORD
// ============================================

export async function loginHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Get user
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if account is active
    if (user.status !== "active") {
      return res.status(403).json({ error: "Account is not active" });
    }

    // Verify password
    const hashedPassword = crypto
      .createHash("sha256")
      .update(password + process.env.ENCRYPTION_KEY!)
      .digest("hex");

    if (user.password_hash !== hashedPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id);

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRE_TIME || "24h" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        user_type: user.user_type,
        current_plan: user.current_plan,
        subscription_status: user.subscription_status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
}

// ============================================
// LOGIN WITH OTP (Passwordless)
// ============================================

export async function loginWithOTPHandler(req: Request, res: Response) {
  try {
    const { email } = req.body;

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Send OTP
    await generateAndSendOTP(email, "login");

    res.json({
      success: true,
      message: "OTP sent to email",
    });
  } catch (error) {
    console.error("OTP login error:", error);
    res.status(500).json({ error: "OTP request failed" });
  }
}

export async function verifyLoginOTPHandler(req: Request, res: Response) {
  try {
    const { email, otp } = req.body;

    await verifyOTP(email, otp, "login");

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "User not found" });
    }

    const token = jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRE_TIME || "24h" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        user_type: user.user_type,
        current_plan: user.current_plan,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(400).json({ error: "Invalid OTP" });
  }
}

// ============================================
// PASSWORD RESET
// ============================================

export async function forgotPasswordHandler(req: Request, res: Response) {
  try {
    const { email } = req.body;

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (!user) {
      // Don't reveal if user exists (security)
      return res.json({
        success: true,
        message: "If user exists, password reset email will be sent",
      });
    }

    await generateAndSendOTP(email, "password_reset");

    res.json({
      success: true,
      message: "Password reset OTP sent to email",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Password reset request failed" });
  }
}

export async function resetPasswordHandler(req: Request, res: Response) {
  try {
    const { email, otp, new_password } = req.body;

    await verifyOTP(email, otp, "password_reset");

    const hashedPassword = crypto
      .createHash("sha256")
      .update(new_password + process.env.ENCRYPTION_KEY!)
      .digest("hex");

    const { error } = await supabase
      .from("users")
      .update({ password_hash: hashedPassword })
      .eq("email", email);

    if (error) throw error;

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(400).json({ error: "Password reset failed" });
  }
}

// ============================================
// MIDDLEWARE - VERIFY JWT TOKEN
// ============================================

export async function verifyTokenMiddleware(
  req: Request & { user?: any },
  res: Response,
  next: any
) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ============================================
// GOOGLE OAUTH LOGIN (Future Implementation)
// ============================================

export async function googleCallbackHandler(req: Request, res: Response) {
  try {
    const { code } = req.query;

    // Exchange code for tokens (implement OAuth flow)
    // For now, this is a placeholder

    res.json({
      success: true,
      message: "Google OAuth integration coming soon",
    });
  } catch (error) {
    console.error("Google OAuth error:", error);
    res.status(500).json({ error: "Google OAuth failed" });
  }
}

// ============================================
// LOGOUT
// ============================================

export async function logoutHandler(req: Request, res: Response) {
  res.json({
    success: true,
    message: "Logged out successfully",
  });
}

export { verifyOTP, generateAndSendOTP };
