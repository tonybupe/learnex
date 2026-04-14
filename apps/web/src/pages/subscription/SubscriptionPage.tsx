import AppShell from "@/components/layout/AppShell"
import { useState } from "react"
import { useAuthStore } from "@/features/auth/auth.store"
import { useNavigate } from "react-router-dom"
import { Sparkles, Check, Zap, Crown, Star, BookOpen, Video, Image, FileText, BarChart2, Shield } from "lucide-react"

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "ZMW",
    period: "month",
    color: "var(--muted)",
    icon: <BookOpen size={24} />,
    badge: null,
    description: "Perfect for getting started with basic lesson creation.",
    features: [
      "Create up to 5 lessons/month",
      "Basic text lesson content",
      "Template-based content only",
      "Class discussion (up to 30 students)",
      "Basic analytics",
      "Community support",
    ],
    limits: [
      "No AI content generation",
      "No media search suggestions",
      "No presentation slides",
      "No diagram generation",
    ],
    cta: "Current Plan",
    disabled: true,
  },
  {
    id: "starter",
    name: "Starter AI",
    price: 150,
    currency: "ZMW",
    period: "month",
    color: "#38bdf8",
    icon: <Zap size={24} />,
    badge: "POPULAR",
    description: "AI-powered lesson creation for active teachers.",
    features: [
      "Unlimited lessons",
      "AI lesson content generation",
      "YouTube & resource suggestions",
      "Image & diagram search",
      "Presentation slide outlines",
      "Key terms glossary",
      "Up to 100 students per class",
      "Priority support",
    ],
    limits: [],
    cta: "Subscribe — K150/month",
    disabled: false,
  },
  {
    id: "professional",
    name: "Professional AI",
    price: 350,
    currency: "ZMW",
    period: "month",
    color: "#cb26e4",
    icon: <Crown size={24} />,
    badge: "BEST VALUE",
    description: "Full AI suite for professional educators and institutions.",
    features: [
      "Everything in Starter AI",
      "Advanced AI with GPT-4 quality",
      "Auto-generate full lesson slides",
      "AI quiz generation from lesson",
      "AI assignment creation",
      "Video script generation",
      "Unlimited students",
      "White-label lesson sharing",
      "Detailed learner analytics",
      "Dedicated support",
    ],
    limits: [],
    cta: "Subscribe — K350/month",
    disabled: false,
  },
  {
    id: "institution",
    name: "Institution",
    price: 1200,
    currency: "ZMW",
    period: "month",
    color: "#f59e0b",
    icon: <Shield size={24} />,
    badge: "SCHOOL PLAN",
    description: "For schools, colleges and training institutions.",
    features: [
      "Everything in Professional AI",
      "Up to 20 teacher accounts",
      "School-wide analytics dashboard",
      "Curriculum alignment tools",
      "Bulk lesson import/export",
      "API access",
      "Custom branding",
      "Onboarding & training",
      "SLA support",
    ],
    limits: [],
    cta: "Contact Sales",
    disabled: false,
  },
]

const AI_FEATURES = [
  { icon: <FileText size={20} />, title: "Rich Lesson Notes", desc: "AI generates structured lesson content with headings, bullet points, key terms and examples" },
  { icon: <Image size={20} />, title: "Image & Diagram Search", desc: "Get curated image searches and diagram suggestions relevant to your lesson topic" },
  { icon: <Video size={20} />, title: "Video Suggestions", desc: "Discover YouTube videos and educational resources perfectly matched to your content" },
  { icon: <Sparkles size={20} />, title: "Presentation Slides", desc: "Auto-generated slide outlines ready to import into PowerPoint or Google Slides" },
  { icon: <BookOpen size={20} />, title: "Key Terms Glossary", desc: "Automatically extract and define important terms from your lesson content" },
  { icon: <BarChart2 size={20} />, title: "Quiz Generation", desc: "AI creates quiz questions based on your lesson content (Professional+)" },
]

function PlanCard({ plan, current }: { plan: typeof PLANS[0]; current: boolean }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubscribe = async () => {
    if (plan.disabled || plan.id === "institution") {
      if (plan.id === "institution") window.open("mailto:sales@learnex.edu.zm?subject=Institution Plan Inquiry", "_blank")
      return
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setSuccess(true)
    setLoading(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div style={{
      borderRadius: 20, border: `2px solid ${current || plan.badge === "BEST VALUE" ? plan.color : "var(--border)"}`,
      background: plan.badge === "BEST VALUE" ? `color-mix(in srgb, ${plan.color} 5%, var(--card))` : "var(--card)",
      padding: 28, display: "flex", flexDirection: "column", gap: 20, position: "relative",
      boxShadow: plan.badge === "BEST VALUE" ? `0 8px 32px ${plan.color}25` : "var(--shadow2)",
      transition: "transform 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 40px ${plan.color}30` }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow2)" }}>

      {/* Badge */}
      {plan.badge && (
        <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: plan.color, color: "white", fontSize: 10, fontWeight: 900, padding: "4px 14px", borderRadius: 999, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
          {plan.badge}
        </div>
      )}
      {current && (
        <div style={{ position: "absolute", top: -12, right: 20, background: "var(--success)", color: "white", fontSize: 10, fontWeight: 900, padding: "4px 12px", borderRadius: 999 }}>
          CURRENT
        </div>
      )}

      {/* Header */}
      <div>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: `${plan.color}18`, display: "flex", alignItems: "center", justifyContent: "center", color: plan.color, marginBottom: 12 }}>
          {plan.icon}
        </div>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>{plan.name}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{plan.description}</div>
      </div>

      {/* Price */}
      <div>
        {plan.price === 0 ? (
          <div style={{ fontSize: 36, fontWeight: 900, color: "var(--muted)" }}>Free</div>
        ) : (
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: plan.color }}>ZMW</span>
            <span style={{ fontSize: 36, fontWeight: 900, color: plan.color }}>{plan.price.toLocaleString()}</span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>/{plan.period}</span>
          </div>
        )}
      </div>

      {/* Features */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Includes</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {plan.features.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13 }}>
              <Check size={15} style={{ color: plan.color, flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: "var(--text)" }}>{f}</span>
            </div>
          ))}
          {plan.limits.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13 }}>
              <span style={{ color: "var(--danger)", flexShrink: 0, marginTop: 1, fontSize: 15 }}>✕</span>
              <span style={{ color: "var(--muted)" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleSubscribe}
        disabled={plan.disabled || loading}
        style={{
          padding: "14px 20px", borderRadius: 12, border: "none", cursor: plan.disabled ? "default" : "pointer",
          background: plan.disabled ? "var(--bg2)" : plan.badge === "BEST VALUE" ? plan.color : `${plan.color}18`,
          color: plan.disabled ? "var(--muted)" : plan.badge === "BEST VALUE" ? "white" : plan.color,
          fontWeight: 800, fontSize: 14, transition: "all 0.15s", fontFamily: "inherit",
          border: plan.disabled ? "1px solid var(--border)" : `1px solid ${plan.color}40`,
        }}>
        {success ? "✅ Processing..." : loading ? "Please wait..." : plan.cta}
      </button>
    </div>
  )
}

export default function SubscriptionPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [billingPeriod, setBillingPeriod] = useState<"month"|"year">("month")

  if (user?.role === "learner") {
    return (
      <AppShell>
        <div style={{ maxWidth: 600, margin: "60px auto", textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📚</div>
          <h2 style={{ margin: "0 0 12px" }}>AI Tools for Teachers</h2>
          <p style={{ color: "var(--muted)", marginBottom: 24 }}>AI subscriptions are available for teachers and institutions. As a learner, you benefit from AI-enhanced lessons created by your teachers.</p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999, background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", marginBottom: 16 }}>
            <Sparkles size={14} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>AI-Powered Teaching Tools</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: "0 0 12px", background: "linear-gradient(135deg, var(--accent), var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Supercharge Your Teaching
          </h1>
          <p style={{ fontSize: 16, color: "var(--muted)", maxWidth: 560, margin: "0 auto 24px" }}>
            Generate rich lesson content, diagrams, videos and presentations in seconds. Prices in Zambian Kwacha.
          </p>

          {/* Billing toggle */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 0, padding: 4, borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)" }}>
            <button onClick={() => setBillingPeriod("month")}
              style={{ padding: "8px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: billingPeriod === "month" ? "var(--card)" : "transparent", color: billingPeriod === "month" ? "var(--text)" : "var(--muted)", boxShadow: billingPeriod === "month" ? "var(--shadow2)" : "none", fontFamily: "inherit" }}>
              Monthly
            </button>
            <button onClick={() => setBillingPeriod("year")}
              style={{ padding: "8px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: billingPeriod === "year" ? "var(--card)" : "transparent", color: billingPeriod === "year" ? "var(--text)" : "var(--muted)", boxShadow: billingPeriod === "year" ? "var(--shadow2)" : "none", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
              Yearly <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "var(--success)", color: "white", fontWeight: 800 }}>-20%</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 60 }}>
          {PLANS.map(plan => (
            <PlanCard key={plan.id} plan={{
              ...plan,
              price: billingPeriod === "year" && plan.price > 0 ? Math.round(plan.price * 12 * 0.8) : plan.price,
              period: billingPeriod === "year" && plan.price > 0 ? "year" : plan.period,
            }} current={plan.id === "free"} />
          ))}
        </div>

        {/* AI Features showcase */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, textAlign: "center", marginBottom: 8 }}>🤖 What AI Can Do For You</h2>
          <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 14, marginBottom: 32 }}>Every AI plan unlocks these powerful teaching tools</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {AI_FEATURES.map((f, i) => (
              <div key={i} className="card hover-lift" style={{ padding: 20, display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "color-mix(in srgb, var(--accent) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment methods */}
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>💳 Payment Methods Accepted</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            {["Airtel Money", "MTN Mobile Money", "Zambia National Commercial Bank", "VISA/Mastercard", "Bank Transfer"].map(m => (
              <span key={m} className="chip" style={{ fontSize: 13 }}>{m}</span>
            ))}
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 16, marginBottom: 0 }}>
            All payments secured · Cancel anytime · Receipts sent to your email
          </p>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 8, marginBottom: 0 }}>
            For payments and billing support: <a href="mailto:billing@learnex.edu.zm" style={{ color: "var(--accent)" }}>billing@learnex.edu.zm</a>
          </p>
        </div>
      </div>
    </AppShell>
  )
}