"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TickerItem {
  sym: string;
  val: string;
  chg: string;
  up: boolean;
}

// Rate limiter - max 5 requests per 60 seconds
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests = 5;
  private readonly windowMs = 60000;

  isAllowed(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter((t) => now - t < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }

  getRetryAfter(): number {
    if (this.requests.length === 0) return 0;
    return Math.ceil((this.requests[0] + this.windowMs - Date.now()) / 1000);
  }
}

// ── Static ticker data ─────────────────────────────────────────────────────────
const TICKER_DATA: TickerItem[] = [
  { sym: "SGBCI", val: "12 500", chg: "+1.2%", up: true },
  { sym: "SNTS", val: "6 450", chg: "+0.8%", up: true },
  { sym: "ETIT", val: "21 300", chg: "-0.5%", up: false },
  { sym: "BICC", val: "8 750", chg: "+2.1%", up: true },
  { sym: "PALM", val: "5 200", chg: "-1.3%", up: false },
  { sym: "ONATEL", val: "4 900", chg: "+0.3%", up: true },
  { sym: "SAPH", val: "3 100", chg: "+1.7%", up: true },
  { sym: "SDCC", val: "7 800", chg: "-0.9%", up: false },
  { sym: "SVOC", val: "2 650", chg: "+0.6%", up: true },
  { sym: "NSIA", val: "18 200", chg: "+1.4%", up: true },
];

const QUICK_ACTIONS = [
  { label: "Meilleures actions", q: "Quelles sont les meilleures actions à acheter sur la BRVM en ce moment ?" },
  { label: "Tendance du marché", q: "Donne-moi la tendance actuelle de la BRVM (BRVM Composite et BRVM 10)" },
  { label: "Secteurs performants", q: "Quels sont les secteurs les plus performants sur la BRVM ?" },
  { label: "Hausses du moment", q: "Quelles actions BRVM sont en forte hausse cette semaine ?" },
  { label: "Stratégie 500k FCFA", q: "Donne-moi une stratégie d'investissement conservatrice sur la BRVM avec 500 000 FCFA" },
  { label: "Dividendes", q: "Quels sont les dividendes à venir sur la BRVM ?" },
];

// ── Sanitization & validation ─────────────────────────────────────────────────────
function sanitizeHTML(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatText(text: string): string {
  // First, sanitize all input
  let safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  // Apply markdown-like formatting on sanitized text only
  return safe
    .replace(/\*\*(.*?)\*\*/g, (_, content) => `<strong>${sanitizeHTML(content)}</strong>`)
    .replace(/\*(.*?)\*/g, (_, content) => `<em>${sanitizeHTML(content)}</em>`)
    .replace(
      /`([^`]+)`/g,
      (_, code) => `<code style="background:var(--bg);padding:2px 5px;border-radius:3px;font-size:11px;color:var(--accent2)">${sanitizeHTML(code)}</code>`
    )
    .replace(
      /^#{1,3} (.+)$/gm,
      (_, heading) => `<strong style="font-family:Syne,sans-serif;font-size:14px;color:var(--text-bright);display:block;margin:8px 0 4px">${sanitizeHTML(heading)}</strong>`
    )
    .replace(/^[-•] (.+)$/gm, (_, item) => `<div style="padding-left:12px;margin:2px 0">▸ ${sanitizeHTML(item)}</div>`)
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

type APIContent = { type: string; text?: string }[];

function validateAPIResponse(data: unknown): { content: APIContent } | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  
  if (Array.isArray(obj.content)) {
    const content = obj.content.filter(
      (block) => typeof block === "object" && block !== null && (block as Record<string, unknown>).type === "text"
    ) as APIContent;
    if (content.length > 0) return { content };
  }
  
  if (typeof obj.error === "object" && obj.error !== null) {
    const err = obj.error as Record<string, unknown>;
    if (typeof err.message === "string") {
      return { content: [{ type: "text", text: `Erreur API : ${err.message}` }] };
    }
  }
  
  return null;
}

// ── Component ──────────────────────────────────────────────────────────────────
const rateLimiter = new RateLimiter();

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("brvm-messages");
      if (stored) {
        const parsed = JSON.parse(stored) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to load messages from localStorage", err);
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem("brvm-messages", JSON.stringify(messages));
      }
    } catch (err) {
      console.error("Failed to save messages to localStorage", err);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Clear old error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const inputRef = useRef(input);
  const loadingRef = useRef(loading);
  const messagesRef = useRef(messages);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const msg = (text ?? inputRef.current).trim();
      if (!msg || loadingRef.current) return;

      // Rate limit check
      if (!rateLimiter.isAllowed()) {
        const retryAfter = rateLimiter.getRetryAfter();
        setError(`Trop de requêtes. Réessaie dans ${retryAfter}s.`);
        return;
      }

      setError(null);
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setLoading(true);

      const newHistory: Message[] = [...messagesRef.current, { role: "user", content: msg }];
      setMessages(newHistory);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newHistory }),
          signal: controller.signal,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error?.message || `Erreur serveur (${res.status})`);
        }

        const validated = validateAPIResponse(data);
        if (!validated) {
          throw new Error("Réponse API invalide");
        }

        let fullText = "";
        for (const block of validated.content) {
          if (block.type === "text" && block.text) fullText += block.text;
        }

        setMessages([...newHistory, { role: "assistant", content: fullText }]);
      } catch (err) {
        let errorMsg = "Erreur de connexion. Vérifie ta connexion internet.";
        
        if (err instanceof Error) {
          if (err.name === "AbortError") {
            errorMsg = "La requête a pris trop de temps. Réessaie.";
          } else if (err.message.includes("Failed to fetch")) {
            errorMsg = "Erreur réseau. Vérifie ta connexion.";
          } else {
            errorMsg = err.message;
          }
        }

        setError(errorMsg);
        setMessages([
          ...newHistory,
          { role: "assistant", content: errorMsg },
        ]);
        
        // Log error for debugging
        console.error("API call failed:", err);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
        textareaRef.current?.focus();
      }
    },
    []
  );

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={styles.root}>
      {/* TICKER */}
      <div style={styles.tickerWrap}>
        <div style={styles.tickerInner}>
          {[...TICKER_DATA, ...TICKER_DATA].map((t, i) => (
            <span key={i} style={styles.tickerItem}>
              <span style={styles.tickerSym}>{t.sym}</span>
              <span style={styles.tickerVal}>{t.val}</span>
              <span style={{ ...styles.tickerChg, color: t.up ? "var(--accent)" : "var(--danger)" }}>{t.chg}</span>
            </span>
          ))}
        </div>
      </div>

      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.logoMark}>BRV</div>
        <div>
          <h1 style={styles.h1}>BRVM Advisor</h1>
          <p style={styles.subtext}>Bot d&apos;analyse &amp; investissement — Zone UEMOA</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={styles.statusLabel}>LIVE</span>
          <span style={styles.statusDot} />
        </div>
      </header>

      {/* QUICK ACTIONS */}
      <div style={styles.quickActions}>
        {QUICK_ACTIONS.map((qa) => (
          <button
            key={qa.label}
            style={styles.qaBtn}
            onClick={() => sendMessage(qa.q)}
            disabled={loading}
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div
          style={{
            background: "rgba(255, 69, 96, 0.1)",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            padding: "8px 12px",
            fontSize: 12,
            borderRadius: 4,
            margin: "0 24px",
          }}
        >
          {error}
        </div>
      )}

      {/* MESSAGES */}
      <div style={styles.messages}>
        {/* Welcome message */}
        <div style={{ display: "flex", gap: 12, animation: "fadeUp 0.3s ease" }}>
          <div style={{ ...styles.avatar, ...styles.avatarBot }}>AI</div>
          <div
            style={{ ...styles.bubble, ...styles.bubbleBot }}
            dangerouslySetInnerHTML={{
              __html: `<strong>Bonjour ! Je suis ton conseiller BRVM.</strong> <br><br>
Je surveille en temps réel les marchés de la Bourse Régionale des Valeurs Mobilières (Zone UEMOA) et j'utilise la recherche web pour t'apporter les données les plus fraîches.<br><br>
Je peux t'aider à :<br>
▸ Identifier les <strong>actions en tendance</strong><br>
▸ Analyser le <strong>BRVM Composite &amp; BRVM 10</strong><br>
▸ Trouver des <strong>opportunités d'investissement</strong><br>
▸ Construire une <strong>stratégie adaptée</strong> à ton budget<br><br>
<em style="color:var(--warn)">Rappel : ces analyses ne constituent pas des conseils financiers formels.</em><br><br>
Pose ta question ou utilise les raccourcis ci-dessus !`,
            }}
          />
        </div>

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 12,
              flexDirection: m.role === "user" ? "row-reverse" : "row",
              animation: "fadeUp 0.3s ease",
            }}
          >
            <div style={{ ...styles.avatar, ...(m.role === "assistant" ? styles.avatarBot : styles.avatarUser) }}>
              {m.role === "assistant" ? "AI" : "MOI"}
            </div>
            <div
              style={{ ...styles.bubble, ...(m.role === "assistant" ? styles.bubbleBot : styles.bubbleUser) }}
              dangerouslySetInnerHTML={{
                __html: m.role === "assistant" ? formatText(m.content) : m.content,
              }}
            />
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ ...styles.avatar, ...styles.avatarBot }}>AI</div>
            <div style={{ ...styles.bubble, ...styles.bubbleBot }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      background: "var(--accent)",
                      borderRadius: "50%",
                      animation: `blink 1.2s ${delay}s infinite`,
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 6, letterSpacing: "0.5px" }}>
                Recherche des données marché...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div style={styles.inputArea}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKey}
            placeholder="Ex : Quelle action BRVM acheter pour du long terme ?"
            rows={1}
            style={styles.textarea}
          />
          <div style={styles.disclaimer}>
            Données via recherche web en temps réel · Pas de conseil financier certifié
            <br />
            <span style={{ fontSize: 9, color: "var(--text-dim)" }}>Historique sauvegardé localement</span>
          </div>
        </div>
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{ ...styles.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 0.2; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
        }
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        button { cursor: pointer; }
        textarea:focus { border-color: var(--accent) !important; }
      `}</style>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
    background: "var(--bg)",
  },
  tickerWrap: {
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    padding: "6px 0",
    overflow: "hidden",
    flexShrink: 0,
  },
  tickerInner: {
    display: "inline-flex",
    gap: 32,
    animation: "scroll-left 40s linear infinite",
    whiteSpace: "nowrap",
    fontSize: 10,
    letterSpacing: "0.8px",
    fontFamily: "'Space Mono', monospace",
  },
  tickerItem: { display: "inline-flex", gap: 6 },
  tickerSym: { color: "var(--text-dim)" },
  tickerVal: { color: "var(--text-bright)" },
  tickerChg: { fontWeight: 700 },
  header: {
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    padding: "12px 24px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexShrink: 0,
  },
  logoMark: {
    width: 36,
    height: 36,
    border: "2px solid var(--accent)",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 14,
    color: "var(--accent)",
    letterSpacing: -1,
    boxShadow: "0 0 12px var(--glow)",
  },
  h1: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 15,
    color: "var(--text-bright)",
    letterSpacing: "0.5px",
  },
  subtext: { fontSize: 10, color: "var(--text-dim)", letterSpacing: "1px", textTransform: "uppercase", marginTop: 1 },
  statusLabel: { fontSize: 10, color: "var(--accent)", letterSpacing: "1px", textTransform: "uppercase" },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "var(--accent)",
    boxShadow: "0 0 8px var(--accent)",
    animation: "pulse 2s infinite",
  },
  quickActions: {
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    padding: "10px 24px",
    display: "flex",
    gap: 8,
    overflowX: "auto",
    flexShrink: 0,
  },
  qaBtn: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontFamily: "'Space Mono', monospace",
    fontSize: 10,
    padding: "6px 12px",
    borderRadius: 4,
    whiteSpace: "nowrap",
    letterSpacing: "0.5px",
    transition: "all 0.2s",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
    fontFamily: "'Syne', sans-serif",
  },
  avatarBot: {
    background: "linear-gradient(135deg, rgba(0,229,160,0.2), rgba(0,144,255,0.2))",
    border: "1px solid var(--accent)",
    color: "var(--accent)",
  },
  avatarUser: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    color: "var(--text-dim)",
  },
  bubble: {
    maxWidth: "75%",
    padding: "12px 16px",
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.7,
  },
  bubbleBot: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderTopLeftRadius: 2,
    color: "var(--text)",
  },
  bubbleUser: {
    background: "rgba(0,229,160,0.08)",
    border: "1px solid rgba(0,229,160,0.25)",
    borderTopRightRadius: 2,
    color: "var(--text-bright)",
  },
  inputArea: {
    background: "var(--surface)",
    borderTop: "1px solid var(--border)",
    padding: "16px 24px",
    display: "flex",
    gap: 12,
    alignItems: "flex-end",
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    width: "100%",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text-bright)",
    fontFamily: "'Space Mono', monospace",
    fontSize: 13,
    padding: "10px 14px",
    resize: "none",
    outline: "none",
    minHeight: 44,
    maxHeight: 120,
    lineHeight: 1.5,
    transition: "border-color 0.2s",
  },
  disclaimer: {
    fontSize: 10,
    color: "var(--text-dim)",
    letterSpacing: "0.5px",
  },
  sendBtn: {
    width: 44,
    height: 44,
    background: "var(--accent)",
    border: "none",
    borderRadius: 8,
    color: "#080c10",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.2s",
  },
};
