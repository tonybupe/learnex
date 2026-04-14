import AppShell from "@/components/layout/AppShell"
import { useState } from "react"
import { useAuthStore } from "@/features/auth/auth.store"
import { useNavigate } from "react-router-dom"
import {
  Sparkles, Check, X, Zap, Crown, Shield, BookOpen,
  Phone, CreditCard, Building, ChevronRight, Copy,
  CheckCircle2, AlertCircle, Loader2
} from "lucide-react"

// ── Plan definitions ───────────────────────────────────────────────
const PLANS = [
  {
    id: "free", name: "Free", monthlyPrice: 0, yearlyPrice: 0,
    color: "#6b7280", icon: "📚", badge: null,
    description: "Get started with basic lesson creation.",
    features: [
      "Up to 5 lessons per month",
      "Template-based content only",
      "Class discussion (30 students)",
      "Basic analytics",
    ],
    missing: [
      "No AI content generation",
      "No image/video suggestions",
      "No presentation slides",
      "No quiz generation",
    ],
    cta: "Current Plan", ctaDisabled: true,
  },
  {
    id: "starter", name: "Starter AI", monthlyPrice: 150, yearlyPrice: 1440,
    color: "#38bdf8", icon: "⚡", badge: "POPULAR",
    description: "AI-powered lesson creation for active teachers.",
    features: [
      "Unlimited lessons",
      "AI lesson content generation",
      "YouTube & resource suggestions",
      "Image & diagram search links",
      "Presentation slide outlines",
      "Key terms glossary",
      "Up to 100 students per class",
      "Priority email support",
    ],
    missing: [],
    cta: "Get Started", ctaDisabled: false,
  },
  {
    id: "professional", name: "Professional", monthlyPrice: 350, yearlyPrice: 3360,
    color: "#cb26e4", icon: "👑", badge: "BEST VALUE",
    description: "Full AI suite for professional educators.",
    features: [
      "Everything in Starter AI",
      "Advanced Claude AI (more detail)",
      "AI quiz generation from lesson",
      "AI assignment creation",
      "Video script generation",
      "Unlimited students",
      "Detailed learner analytics",
      "Dedicated support",
    ],
    missing: [],
    cta: "Go Professional", ctaDisabled: false,
  },
  {
    id: "institution", name: "Institution", monthlyPrice: 1200, yearlyPrice: 11520,
    color: "#f59e0b", icon: "🏫", badge: "SCHOOL PLAN",
    description: "For schools, colleges and training institutions.",
    features: [
      "Everything in Professional",
      "Up to 20 teacher accounts",
      "School-wide analytics",
      "Curriculum alignment tools",
      "Bulk lesson import/export",
      "Custom branding",
      "Onboarding & training session",
      "SLA support",
    ],
    missing: [],
    cta: "Contact Sales", ctaDisabled: false,
  },
]

// ── Mobile Money providers ────────────────────────────────────────
const MOBILE_MONEY = [
  { id: "airtel", name: "Airtel Money", color: "#ef4444", logo: "🔴", ussd: "*778#", prefix: "097/098" },
  { id: "mtn",    name: "MTN Money",   color: "#f59e0b", logo: "🟡", ussd: "*303#", prefix: "096/076" },
  { id: "zamtel", name: "Kazang",      color: "#22c55e", logo: "🟢", ussd: "*799#", prefix: "095/075" },
]

const BANK_OPTIONS = [
  { name: "Zanaco",  account: "1234567890123" },
  { name: "FNB Zambia", account: "6280012345678" },
  { name: "Standard Chartered", account: "0100234567" },
]

// ── Payment Modal ──────────────────────────────────────────────────
function PaymentModal({
  plan, yearly, onClose
}: {
  plan: typeof PLANS[0]; yearly: boolean; onClose: () => void
}) {
  const [method, setMethod] = useState<"mobile"|"card"|"bank">("mobile")
  const [provider, setProvider] = useState(MOBILE_MONEY[0])
  const [phone, setPhone] = useState("")
  const [step, setStep] = useState<"select"|"confirm"|"processing"|"done">("select")
  const [otp, setOtp] = useState("")
  const [copied, setCopied] = useState("")

  const price = yearly ? plan.yearlyPrice : plan.monthlyPrice
  const period = yearly ? "year" : "month"

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(""), 2000)
  }

  const processPayment = async () => {
    setStep("processing")
    // Simulate payment processing
    await new Promise(r => setTimeout(r, 2500))
    setStep("done")
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: "var(--card)", borderRadius: 20, width: "100%", maxWidth: 480, border: "1px solid var(--border)", boxShadow: "0 32px 80px rgba(0,0,0,0.3)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: `linear-gradient(135deg, ${plan.color}15, var(--card))` }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>{plan.icon} {plan.name}</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>ZMW {price.toLocaleString()} / {period}</div>
          </div>
          <button onClick={onClose} style={{ background: "var(--bg2)", border: "none", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
            <X size={16} />
          </button>
        </div>

        {step === "done" ? (
          /* ── Success ── */
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "2px solid var(--success)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle2 size={32} style={{ color: "var(--success)" }} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900 }}>Payment Received!</h3>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 20px" }}>
              Your {plan.name} plan is now active. Check your email for a receipt.
            </p>
            <button className="btn btn-primary" onClick={onClose} style={{ width: "100%" }}>
              Start Creating Lessons
            </button>
          </div>
        ) : step === "processing" ? (
          /* ── Processing ── */
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", animation: "spin 1s linear infinite" }}>
              <Loader2 size={32} style={{ color: "var(--accent)" }} />
            </div>
            <h3 style={{ margin: "0 0 8px" }}>Processing Payment...</h3>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>Please wait while we confirm your payment.</p>
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            {step === "select" && (
              <>
                {/* Payment method tabs */}
                <div style={{ display: "flex", gap: 6, marginBottom: 20, padding: 5, borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)" }}>
                  {[
                    { key: "mobile", label: "📱 Mobile Money", icon: <Phone size={14} /> },
                    { key: "card",   label: "💳 Card",         icon: <CreditCard size={14} /> },
                    { key: "bank",   label: "🏦 Bank",         icon: <Building size={14} /> },
                  ].map(m => (
                    <button key={m.key} type="button"
                      onClick={() => setMethod(m.key as any)}
                      style={{ flex: 1, padding: "8px 6px", borderRadius: 9, border: "none", background: method === m.key ? "var(--card)" : "transparent", color: method === m.key ? "var(--accent)" : "var(--muted)", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", boxShadow: method === m.key ? "var(--shadow2)" : "none", transition: "all 0.15s" }}>
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Mobile Money */}
                {method === "mobile" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Select provider</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                      {MOBILE_MONEY.map(p => (
                        <button key={p.id} type="button" onClick={() => setProvider(p)}
                          style={{ padding: "12px 8px", borderRadius: 12, border: `2px solid ${provider.id === p.id ? p.color : "var(--border)"}`, background: provider.id === p.id ? `${p.color}10` : "var(--bg2)", cursor: "pointer", textAlign: "center", transition: "all 0.15s", fontFamily: "inherit" }}>
                          <div style={{ fontSize: 22, marginBottom: 4 }}>{p.logo}</div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: provider.id === p.id ? p.color : "var(--text)" }}>{p.name}</div>
                          <div style={{ fontSize: 10, color: "var(--muted)" }}>{p.prefix}</div>
                        </button>
                      ))}
                    </div>

                    <div className="form-field">
                      <label className="form-label">Mobile Number</label>
                      <input className="audit-control" value={phone} onChange={e => setPhone(e.target.value)}
                        placeholder={`e.g. ${provider.prefix.split("/")[0]}1234567`}
                        maxLength={10} />
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>You will receive a payment prompt on this number</div>
                    </div>

                    {/* USSD option */}
                    <div style={{ padding: 14, borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Or pay via USSD</div>
                      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.8 }}>
                        1. Dial <strong style={{ color: "var(--text)" }}>{provider.ussd}</strong> on your {provider.name} line<br/>
                        2. Select <strong style={{ color: "var(--text)" }}>Pay Bill / Business</strong><br/>
                        3. Enter Business No: <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <strong style={{ color: "var(--accent)" }}>123456</strong>
                          <button onClick={() => copyText("123456", "biz")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", display: "flex", alignItems: "center" }}>
                            {copied === "biz" ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                          </button>
                        </span><br/>
                        4. Amount: <strong style={{ color: "var(--accent)" }}>K{price}</strong><br/>
                        5. Reference: <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <strong style={{ color: "var(--accent)" }}>LRNX-STARTER</strong>
                          <button onClick={() => copyText("LRNX-STARTER", "ref")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", display: "flex", alignItems: "center" }}>
                            {copied === "ref" ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                          </button>
                        </span>
                      </div>
                    </div>

                    <button className="btn btn-primary" style={{ padding: "12px", fontSize: 14 }}
                      onClick={() => phone.length >= 9 ? setStep("confirm") : alert("Enter your mobile number")}
                      disabled={phone.length < 9}>
                      Send Payment Prompt → K{price}
                    </button>
                  </div>
                )}

                {/* Card */}
                {method === "card" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ padding: 16, borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)", textAlign: "center" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>VISA / Mastercard</div>
                      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                        Card payments processed securely via our payment partner.<br/>
                        Contact us to set up card payments.
                      </div>
                    </div>
                    <a href="mailto:billing@learnex.edu.zm?subject=Card Payment - Learnex AI Plan"
                      className="btn btn-primary" style={{ textAlign: "center", textDecoration: "none", padding: "12px" }}>
                      Contact Billing Team
                    </a>
                  </div>
                )}

                {/* Bank */}
                {method === "bank" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Bank Transfer Details</div>
                    {BANK_OPTIONS.map((b, i) => (
                      <div key={i} style={{ padding: 14, borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)" }}>
                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>🏦 {b.name}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                          Account Name: <strong>Learnex Education Ltd</strong><br/>
                          Account No: <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <strong style={{ color: "var(--accent)" }}>{b.account}</strong>
                            <button onClick={() => copyText(b.account, b.name)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", display: "flex", alignItems: "center" }}>
                              {copied === b.name ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                            </button>
                          </span><br/>
                          Branch: Lusaka Main<br/>
                          Reference: <strong style={{ color: "var(--accent)" }}>LRNX-{plan.id.toUpperCase()}</strong>
                        </div>
                      </div>
                    ))}
                    <div style={{ padding: 12, borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", fontSize: 12, color: "#f59e0b", display: "flex", gap: 8 }}>
                      <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                      Send proof of payment to billing@learnex.edu.zm with your account email. Activation within 24 hours.
                    </div>
                    <button className="btn btn-primary" style={{ padding: "12px" }}
                      onClick={() => { window.open("mailto:billing@learnex.edu.zm?subject=Bank Transfer Proof - " + plan.name, "_blank") }}>
                      Send Payment Proof
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Confirm step */}
            {step === "confirm" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ padding: 16, borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>Payment Summary</div>
                  {[
                    { label: "Plan", value: plan.name },
                    { label: "Amount", value: `ZMW ${price.toLocaleString()}` },
                    { label: "Period", value: period },
                    { label: "Provider", value: provider.name },
                    { label: "Phone", value: phone },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>{r.label}</span>
                      <span style={{ fontWeight: 700 }}>{r.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ padding: 14, borderRadius: 12, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", fontSize: 13, color: "var(--accent2)", lineHeight: 1.6 }}>
                  📱 A payment prompt will be sent to <strong>{phone}</strong>. Approve it on your phone to complete.
                </div>

                <div className="form-field">
                  <label className="form-label">Enter OTP (if prompted)</label>
                  <input className="audit-control" value={otp} onChange={e => setOtp(e.target.value)} placeholder="e.g. 123456" maxLength={6} />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn" style={{ flex: 1 }} onClick={() => setStep("select")}>← Back</button>
                  <button className="btn btn-primary" style={{ flex: 2, padding: "12px" }} onClick={processPayment}>
                    Confirm Payment · K{price}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Plan Card ─────────────────────────────────────────────────────
function PlanCard({ plan, yearly, onSelect }: { plan: typeof PLANS[0]; yearly: boolean; onSelect: () => void }) {
  const price = yearly ? plan.yearlyPrice : plan.monthlyPrice
  const monthlyEquiv = yearly && plan.yearlyPrice > 0 ? Math.round(plan.yearlyPrice / 12) : price
  const isBest = plan.badge === "BEST VALUE"

  return (
    <div style={{
      borderRadius: 18, border: `2px solid ${isBest ? plan.color : "var(--border)"}`,
      background: isBest ? `color-mix(in srgb, ${plan.color} 4%, var(--card))` : "var(--card)",
      padding: 24, display: "flex", flexDirection: "column", gap: 18,
      position: "relative", boxShadow: isBest ? `0 8px 32px ${plan.color}20` : "var(--shadow2)",
      transition: "transform 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 40px ${plan.color}25` }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = isBest ? `0 8px 32px ${plan.color}20` : "var(--shadow2)" }}>

      {plan.badge && (
        <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: plan.color, color: "white", fontSize: 10, fontWeight: 900, padding: "4px 14px", borderRadius: 999, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
          {plan.badge}
        </div>
      )}

      {/* Header */}
      <div>
        <div style={{ fontSize: 28, marginBottom: 8 }}>{plan.icon}</div>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>{plan.name}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.4 }}>{plan.description}</div>
      </div>

      {/* Price */}
      <div>
        {price === 0 ? (
          <div style={{ fontSize: 32, fontWeight: 900, color: "var(--muted)" }}>Free</div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: plan.color }}>ZMW</span>
              <span style={{ fontSize: 34, fontWeight: 900, color: plan.color }}>{price.toLocaleString()}</span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>/{yearly ? "yr" : "mo"}</span>
            </div>
            {yearly && price > 0 && (
              <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 700, marginTop: 2 }}>
                ≈ K{monthlyEquiv}/month · Save 20%
              </div>
            )}
          </div>
        )}
      </div>

      {/* Features */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {plan.features.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, alignItems: "flex-start" }}>
              <Check size={14} style={{ color: plan.color, flexShrink: 0, marginTop: 2 }} />
              <span>{f}</span>
            </div>
          ))}
          {plan.missing.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, alignItems: "flex-start" }}>
              <X size={14} style={{ color: "var(--danger)", flexShrink: 0, marginTop: 2 }} />
              <span style={{ color: "var(--muted)" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button disabled={plan.ctaDisabled} onClick={onSelect}
        style={{
          padding: "12px", borderRadius: 12, border: "none", cursor: plan.ctaDisabled ? "default" : "pointer",
          background: plan.ctaDisabled ? "var(--bg2)" : isBest ? plan.color : `${plan.color}15`,
          color: plan.ctaDisabled ? "var(--muted)" : isBest ? "white" : plan.color,
          fontWeight: 800, fontSize: 14, fontFamily: "inherit", transition: "all 0.15s",
          border: plan.ctaDisabled ? "1px solid var(--border)" : `1px solid ${plan.color}40`,
        }}>
        {plan.cta}
      </button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [yearly, setYearly] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null)

  const AI_FEATURES = [
    { icon: "✍️", title: "Rich AI Lesson Notes", desc: "Claude AI generates comprehensive lesson content with headings, examples, key terms and review questions" },
    { icon: "🎥", title: "YouTube Video Suggestions", desc: "Get curated educational video searches perfectly matched to your lesson topic" },
    { icon: "🖼️", title: "Image & Diagram Links", desc: "Direct links to Google Image searches for diagrams, charts and visual aids" },
    { icon: "📊", title: "Presentation Outlines", desc: "Auto-generated slide outlines ready to use in PowerPoint or Google Slides" },
    { icon: "📚", title: "Resource Links", desc: "Wikipedia, Khan Academy, and web resources automatically linked to your topic" },
    { icon: "🧪", title: "Quiz Generation", desc: "AI creates quiz questions and assignments from your lesson content (Professional+)" },
  ]

  if (user?.role === "learner") {
    return (
      <AppShell>
        <div style={{ maxWidth: 520, margin: "80px auto", textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📚</div>
          <h2 style={{ margin: "0 0 12px" }}>AI Plans for Teachers</h2>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            AI content tools are for teachers. As a learner, you benefit from AI-enhanced lessons created by your teachers automatically.
          </p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>← Go Back</button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      {selectedPlan && (
        <PaymentModal plan={selectedPlan} yearly={yearly} onClose={() => setSelectedPlan(null)} />
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px 60px" }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 16px", borderRadius: 999, background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", marginBottom: 16 }}>
            <Sparkles size={13} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>Powered by Claude AI · Anthropic</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: "0 0 12px", background: "linear-gradient(135deg, var(--accent), var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Supercharge Your Teaching
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted)", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.6 }}>
            Generate complete lesson notes, diagrams, videos and presentations in seconds with Claude AI. Prices in Zambian Kwacha (ZMW).
          </p>

          {/* Billing toggle */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 0, padding: 4, borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)" }}>
            <button type="button" onClick={() => setYearly(false)}
              style={{ padding: "8px 20px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: !yearly ? "var(--card)" : "transparent", color: !yearly ? "var(--text)" : "var(--muted)", boxShadow: !yearly ? "var(--shadow2)" : "none", fontFamily: "inherit" }}>
              Monthly
            </button>
            <button type="button" onClick={() => setYearly(true)}
              style={{ padding: "8px 20px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: yearly ? "var(--card)" : "transparent", color: yearly ? "var(--text)" : "var(--muted)", boxShadow: yearly ? "var(--shadow2)" : "none", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
              Yearly
              <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, background: "var(--success)", color: "white", fontWeight: 900 }}>-20%</span>
            </button>
          </div>
        </div>

        {/* ── Plans Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 56 }}>
          {PLANS.map(plan => (
            <PlanCard key={plan.id} plan={plan} yearly={yearly}
              onSelect={() => {
                if (plan.id === "institution") { window.open("mailto:sales@learnex.edu.zm?subject=Institution Plan Inquiry", "_blank") }
                else if (!plan.ctaDisabled) { setSelectedPlan(plan) }
              }} />
          ))}
        </div>

        {/* ── AI Features ── */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ textAlign: "center", fontSize: 24, fontWeight: 900, marginBottom: 6 }}>🤖 What Claude AI Does For You</h2>
          <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 14, marginBottom: 28 }}>Powered by Anthropic's Claude — one of the world's most advanced AI models</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {AI_FEATURES.map((f, i) => (
              <div key={i} className="card hover-lift" style={{ padding: 20, display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 5 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Payment Methods ── */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ textAlign: "center", fontWeight: 800, marginBottom: 6, fontSize: 18 }}>💳 Payment Methods</h3>
          <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>All major Zambian payment methods accepted</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { icon: "🔴", name: "Airtel Money", color: "#ef4444", desc: "Dial *778#" },
              { icon: "🟡", name: "MTN Money",   color: "#f59e0b", desc: "Dial *303#" },
              { icon: "🟢", name: "Kazang",       color: "#22c55e", desc: "Dial *799#" },
              { icon: "💳", name: "Visa/Mastercard", color: "#38bdf8", desc: "Online card" },
              { icon: "🏦", name: "Bank Transfer",   color: "#8b5cf6", desc: "Any Zambian bank" },
              { icon: "📧", name: "Invoice",         color: "#f59e0b", desc: "For institutions" },
            ].map((m, i) => (
              <div key={i} style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${m.color}25`, background: `${m.color}06`, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{m.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: m.color }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
            Questions? Email <a href="mailto:billing@learnex.edu.zm" style={{ color: "var(--accent)" }}>billing@learnex.edu.zm</a>
            &nbsp;· Cancel anytime · Receipts via email · Secure payments
          </div>
        </div>
      </div>
    </AppShell>
  )
}