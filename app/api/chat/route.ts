import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const SYSTEM_PROMPT = `Tu es un expert en marchés financiers africains, spécialisé sur la BRVM (Bourse Régionale des Valeurs Mobilières) de la zone UEMOA.

Tu aides les investisseurs à prendre des décisions éclairées en :
- Analysant les tendances actuelles de la BRVM (BRVM Composite, BRVM 10)
- Identifiant les actions en hausse, en baisse, ou stables
- Recommandant des stratégies d'investissement adaptées au profil et budget
- Expliquant les performances sectorielles (banques, télécoms, agro-industrie, etc.)
- Surveillant les actualités économiques UEMOA

Use web search when needed to provide the most recent market data.
Repond en français. Be precise, structured, and well formatted.
Always indicate the date of retrieved data.
Remind that your analyses are not certified financial advice.
Format with **bold** for key points and lists for recommendations.`;

interface MessageItem {
  role: "user" | "assistant";
  content: string;
}

function isValidMessages(data: unknown): data is MessageItem[] {
  if (!Array.isArray(data)) return false;
  return data.every(
    (msg) =>
      typeof msg === "object" &&
      msg !== null &&
      ["user", "assistant"].includes((msg as Record<string, unknown>).role as string) &&
      typeof (msg as Record<string, unknown>).content === "string" &&
      ((msg as Record<string, unknown>).content as string).length < 10000
  );
}

// Simple in-memory rate limiter (use Redis in production)
const requestCounts = new Map<string, { count: number; reset: number }>();

function getRateLimitKey(req: NextRequest): string {
  // Use IP address or forwarded-for header
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(key: string, maxRequests = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const record = requestCounts.get(key);

  if (!record || now > record.reset) {
    requestCounts.set(key, { count: 1, reset: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Sanitize logs to prevent injection
function sanitizeForLog(str: string): string {
  return str.slice(0, 200).replace(/[^\x20-\x7E]/g, "?");
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const rateLimitKey = getRateLimitKey(req);

  // Rate limiting
  if (!checkRateLimit(rateLimitKey)) {
    console.warn(`[Rate limit exceeded] IP: ${sanitizeForLog(rateLimitKey)}`);
    return NextResponse.json(
      { error: { message: "Too many requests. Please try again later." } },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // CORS check - only accept from same origin
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && !origin.includes(host)) {
    console.warn(`[CORS violation] Origin: ${sanitizeForLog(origin)}, Host: ${host}`);
    return NextResponse.json(
      { error: { message: "CORS policy violation" } },
      { status: 403 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[Config] Missing GEMINI_API_KEY");
    return NextResponse.json(
      { error: { message: "API configuration error" } },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { messages } = body as Record<string, unknown>;

    // Validate messages format
    if (!isValidMessages(messages)) {
      console.warn(`[Validation] Invalid message format from ${sanitizeForLog(rateLimitKey)}`);
      return NextResponse.json(
        { error: { message: "Invalid message format" } },
        { status: 400 }
      );
    }

    // Limit message history to prevent abuse
    if (messages.length > 50) {
      console.warn(`[Abuse] Too many messages (${messages.length}) from ${sanitizeForLog(rateLimitKey)}`);
      return NextResponse.json(
        { error: { message: "Message history too long" } },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    const contentPreview = sanitizeForLog(
      lastMessage.content.slice(0, 50)
    );
    console.log(`[Request] ${rateLimitKey} - ${lastMessage.role}: ${contentPreview}...`);


    // Convert messages to Gemini format
    const geminiContents = [
      {
        role: "user",
        parts: [{ text: SYSTEM_PROMPT }],
      },
      ...messages.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })),
    ];

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            maxOutputTokens: 1500,
            temperature: 0.7,
          },
        }),
      }
    );

    const geminiData = await geminiRes.json();
    const duration = Date.now() - startTime;

    if (!geminiRes.ok) {
      console.error(
        `[Gemini] Error ${geminiRes.status} (${duration}ms):`,
        sanitizeForLog(JSON.stringify(geminiData))
      );
      return NextResponse.json(
        { error: { message: geminiData.error?.message || "API error" } },
        { status: geminiRes.status }
      );
    }

    // Transform Gemini response to match Anthropic format
    const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const data = {
      content: [{ type: "text", text: textContent }],
    };

    if (textContent) {
      console.log(`[Success] ${geminiRes.status} (${duration}ms) - ${rateLimitKey}`);
    } else {
      console.warn(`[Warning] Empty response from Gemini (${duration}ms)`);
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Error] ${duration}ms - ${sanitizeForLog(errorMsg)}`);
    
    return NextResponse.json(
      { error: { message: "Server error. Please try again later." } },
      { status: 500 }
    );
  }
}
