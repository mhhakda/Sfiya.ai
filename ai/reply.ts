// ============================================
// SFIYA.AI - AI AUTO-REPLY SYSTEM
// Phase 1 - Comment Analysis & Reply Generation
// ============================================

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { Request, Response } from "express";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================
// SENTIMENT ANALYSIS
// ============================================

async function analyzeSentiment(text: string): Promise<{
  sentiment: "positive" | "negative" | "neutral" | "question" | "spam" | "hate";
  score: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are a sentiment analyzer. Analyze the given text and respond with ONLY a JSON object (no markdown, no extra text).
          
Format: {"sentiment": "positive|negative|neutral|question|spam|hate", "score": 0.0-1.0}

Guidelines:
- "positive": Compliments, appreciation, love, excited
- "negative": Criticism, angry, disappointed, sad
- "question": Asking something, seeking info
- "spam": Repetitive, promotional, unrelated
- "hate": Abusive, insulting, threatening
- "neutral": Normal comment, just passing by`,
          role: "system",
        },
        {
          role: "user",
          content: `Analyze this comment: "${text}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content);

    return {
      sentiment: parsed.sentiment || "neutral",
      score: parsed.score || 0.5,
    };
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    return { sentiment: "neutral", score: 0.5 };
  }
}

// ============================================
// GENERATE AI REPLY
// ============================================

async function generateReply(params: {
  comment_text: string;
  user_id: string;
  tone: string;
  language: string;
  sentiment: string;
}): Promise<string> {
  try {
    // Get user's brand voice
    const { data: brandVoice } = await supabase
      .from("brand_voice")
      .select("*")
      .eq("user_id", params.user_id)
      .single();

    const { data: settings } = await supabase
      .from("auto_reply_settings")
      .select("*")
      .eq("user_id", params.user_id)
      .single();

    // Build prompt with user's brand voice
    const systemPrompt = `You are an AI assistant generating replies for ${params.language || "English"}.

BRAND VOICE:
${brandVoice?.brand_name || "Creator"}
Values: ${JSON.stringify(brandVoice?.brand_values || [])}
Personality: ${JSON.stringify(brandVoice?.personality_traits || [])}

TONE TO USE: ${params.tone || "polite"}
Tone Examples:
- Hype: "YESS! This is exactly what I needed! 🔥"
- Funny: "Haha, you just made my day 😂"
- Formal: "Thank you for your feedback. We appreciate your input."
- Polite: "Thanks so much for the kind words! Really appreciate it 🙏"
- Angry: "Seriously? That's not cool at all."
- Savage: "Okay, that's fair. You win this round 😏"
- Roasting: "Well, well, well... you tried 😅"

SPECIAL INSTRUCTIONS:
${settings?.catchphrases ? `- Must include: ${settings.catchphrases.join(", ")}` : ""}
${settings?.signature_emojis ? `- Must use these emojis: ${settings.signature_emojis.join(", ")}` : ""}
${settings?.intro_line ? `- Start with: ${settings.intro_line}` : ""}
${settings?.outro_line ? `- End with: ${settings.outro_line}` : ""}

RULES:
✓ Keep reply SHORT (1-3 sentences max)
✓ Sound HUMAN, not robotic
✓ Match the TONE perfectly
✓ Match the LANGUAGE (${params.language})
✓ Never repeat generic responses
✓ Avoid all policy violations
${settings?.blacklisted_words ? `✗ NEVER use these words: ${settings.blacklisted_words.join(", ")}` : ""}`;

    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Generate a ${params.tone} reply in ${params.language} to this ${params.sentiment} comment: "${params.comment_text}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: parseInt(process.env.MAX_TOKENS_PER_REQUEST || "500"),
      frequency_penalty: 0.5, // Reduce repetition
    });

    return response.choices[0].message.content || "Thanks for the comment! 🙌";
  } catch (error) {
    console.error("Reply generation error:", error);
    return "Thanks for your comment! 🙌"; // Fallback
  }
}

// ============================================
// DETECT SALES LEADS
// ============================================

async function detectSalesLead(text: string): Promise<{
  is_lead: boolean;
  temperature: "hot" | "warm" | "cold";
}> {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `Detect if this is a potential sales lead. Respond with ONLY valid JSON.
Format: {"is_lead": true/false, "temperature": "hot|warm|cold"}

hot = Asking to buy, ready to transact, urgent
warm = Interested, asking questions, considering
cold = Not interested, just chatting`,
        },
        {
          role: "user",
          content: `Is this a sales lead? "${text}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content);

    return {
      is_lead: parsed.is_lead || false,
      temperature: parsed.temperature || "cold",
    };
  } catch (error) {
    console.error("Lead detection error:", error);
    return { is_lead: false, temperature: "cold" };
  }
}

// ============================================
// API: ANALYZE & GENERATE REPLY
// ============================================

export async function generateReplyHandler(req: Request, res: Response) {
  try {
    const { comment_id, user_id, comment_text, platform } = req.body;

    // Get user's auto-reply settings
    const { data: settings, error: settingsError } = await supabase
      .from("auto_reply_settings")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (settingsError || !settings) {
      return res.status(404).json({ error: "Settings not found" });
    }

    // Step 1: Analyze sentiment
    const { sentiment, score: sentiment_score } = await analyzeSentiment(
      comment_text
    );

    // Update comment with sentiment
    await supabase
      .from("comments")
      .update({
        sentiment,
        sentiment_score,
      })
      .eq("id", comment_id);

    // Step 2: Check if should reply
    if (sentiment === "spam" && settings.ignore_spam) {
      await supabase
        .from("comments")
        .update({ auto_reply_status: "ignored" })
        .eq("id", comment_id);

      return res.json({
        success: true,
        action: "ignored",
        reason: "Spam detected",
      });
    }

    if (sentiment === "hate" && settings.ignore_hate_comments) {
      await supabase
        .from("comments")
        .update({ auto_reply_status: "escalated" })
        .eq("id", comment_id);

      return res.json({
        success: true,
        action: "escalated",
        reason: "Hate comment - escalated to user",
      });
    }

    // Step 3: Auto-like if positive
    if (
      sentiment === "positive" &&
      settings.auto_like_positive &&
      platform === "instagram"
    ) {
      // Call Instagram API to like comment
      await supabase
        .from("comments")
        .update({ is_liked: true })
        .eq("id", comment_id);
    }

    // Step 4: Generate reply
    const reply_text = await generateReply({
      comment_text,
      user_id,
      tone: settings.default_tone || "polite",
      language: settings.default_language || "english",
      sentiment,
    });

    // Step 5: Store reply
    const { data: autoReply, error: replyError } = await supabase
      .from("auto_replies")
      .insert([
        {
          user_id,
          comment_id,
          reply_text,
          tone_used: settings.default_tone,
          language_used: settings.default_language,
          reply_status: "pending",
          created_by: "ai",
        },
      ])
      .select()
      .single();

    if (replyError) throw replyError;

    // Step 6: Detect sales leads
    const { is_lead, temperature } = await detectSalesLead(comment_text);

    if (is_lead) {
      await supabase
        .from("comments")
        .update({
          auto_reply_status: "replied",
          sentiment: `${sentiment}_lead_${temperature}`,
        })
        .eq("id", comment_id);
    }

    res.json({
      success: true,
      action: "replied",
      reply: {
        id: autoReply.id,
        text: reply_text,
        tone: settings.default_tone,
        language: settings.default_language,
        sentiment,
        is_sales_lead: is_lead,
        lead_temperature: temperature,
      },
    });
  } catch (error) {
    console.error("Reply generation error:", error);
    res.status(500).json({ error: "Failed to generate reply" });
  }
}

// ============================================
// API: UPDATE AUTO-REPLY SETTINGS
// ============================================

export async function updateAutoReplySettingsHandler(
  req: Request,
  res: Response
) {
  try {
    const { user_id } = req.user;
    const {
      default_tone,
      default_language,
      auto_like_positive,
      ignore_spam,
      ignore_hate_comments,
    } = req.body;

    const { data, error } = await supabase
      .from("auto_reply_settings")
      .update({
        default_tone,
        default_language,
        auto_like_positive,
        ignore_spam,
        ignore_hate_comments,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      settings: data,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
}

// ============================================
// API: UPDATE BRAND VOICE
// ============================================

export async function updateBrandVoiceHandler(req: Request, res: Response) {
  try {
    const { user_id } = req.user;
    const {
      brand_name,
      brand_values,
      personality_traits,
      catchphrases,
      signature_emojis,
      intro_line,
      outro_line,
    } = req.body;

    const { data, error } = await supabase
      .from("brand_voice")
      .update({
        brand_name,
        brand_values,
        personality_traits,
      })
      .eq("user_id", user_id)
      .select()
      .single();

    if (error) throw error;

    // Update settings with voice details
    await supabase
      .from("auto_reply_settings")
      .update({
        catchphrases,
        signature_emojis,
        intro_line,
        outro_line,
      })
      .eq("user_id", user_id);

    res.json({
      success: true,
      brand_voice: data,
    });
  } catch (error) {
    console.error("Update brand voice error:", error);
    res.status(500).json({ error: "Failed to update brand voice" });
  }
}

export { analyzeSentiment, generateReply, detectSalesLead };
