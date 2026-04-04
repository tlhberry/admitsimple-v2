import { useState, useEffect } from "react";
import { MessageSquare, X, Phone, Shield, Heart, Award, ChevronRight } from "lucide-react";

export default function ChatbotDemo() {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen font-sans" style={{ fontFamily: "'Inter', sans-serif", background: "#f8fafc" }}>

      {/* Fake website nav */}
      <nav style={{ background: "#1a2744", padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#5BC8DC", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Heart size={18} color="#fff" />
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>Serenity Ridge Recovery</span>
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          {["Treatment", "Insurance", "About", "Contact"].map(l => (
            <span key={l} style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, cursor: "pointer" }}>{l}</span>
          ))}
        </div>
        <a href="tel:18005551234" style={{ display: "flex", alignItems: "center", gap: 8, background: "#5BC8DC", color: "#0d1117", padding: "8px 18px", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          <Phone size={15} /> (800) 555-1234
        </a>
      </nav>

      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg, #1a2744 0%, #0f172a 100%)", padding: "80px 40px", textAlign: "center", color: "#fff" }}>
        <p style={{ color: "#5BC8DC", fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
          JCAHO Accredited · In-Network with Most Major Insurance
        </p>
        <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.15, marginBottom: 20, maxWidth: 700, margin: "0 auto 20px" }}>
          Recovery Starts With<br />One Conversation
        </h1>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 18, maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.6 }}>
          Our compassionate team is here 24/7. Check your insurance coverage in 60 seconds — no commitment required.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setOpen(true)}
            style={{ background: "#5BC8DC", color: "#0d1117", border: "none", padding: "16px 32px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer" }}
          >
            Check My Insurance Coverage →
          </button>
          <a href="tel:18005551234" style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "16px 28px", borderRadius: 12, fontSize: 15, fontWeight: 500, textDecoration: "none" }}>
            <Phone size={16} /> Call Now — Free Consultation
          </a>
        </div>
      </section>

      {/* Trust badges */}
      <section style={{ background: "#fff", padding: "40px", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 48, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { icon: Shield, label: "In-Network with 200+ Insurance Plans" },
            { icon: Award, label: "JCAHO Gold Seal of Approval" },
            { icon: Heart, label: "Evidence-Based Treatment Programs" },
            { icon: Phone, label: "24/7 Admissions Support" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, color: "#475569" }}>
              <Icon size={20} color="#5BC8DC" />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section style={{ padding: "64px 40px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: 30, fontWeight: 700, textAlign: "center", color: "#0f172a", marginBottom: 48 }}>
          Comprehensive Addiction Treatment
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
          {[
            { title: "Medical Detox", desc: "Safe, supervised withdrawal with 24/7 medical monitoring" },
            { title: "Residential (30-90 Day)", desc: "Immersive healing in a structured, supportive environment" },
            { title: "Partial Hospitalization", desc: "Intensive day treatment while living at home or nearby" },
            { title: "Intensive Outpatient", desc: "Flexible scheduling for work and family commitments" },
          ].map(({ title, desc }) => (
            <div key={title} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 28 }}>
              <div style={{ width: 40, height: 40, background: "#eff9fb", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Heart size={20} color="#5BC8DC" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, marginBottom: 16 }}>{desc}</p>
              <span style={{ fontSize: 13, color: "#5BC8DC", fontWeight: 600, cursor: "pointer" }}>
                Learn more <ChevronRight size={13} style={{ display: "inline" }} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section style={{ background: "linear-gradient(135deg, #0f172a, #1a2744)", padding: "60px 40px", textAlign: "center", color: "#fff" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>Ready to check your insurance?</h2>
        <p style={{ color: "rgba(255,255,255,0.65)", marginBottom: 32, fontSize: 16 }}>
          It takes about 60 seconds. Our team handles everything — we'll contact your insurance directly.
        </p>
        <button
          onClick={() => setOpen(true)}
          style={{ background: "#5BC8DC", color: "#0d1117", border: "none", padding: "16px 36px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer" }}
        >
          Check My Coverage — It's Free →
        </button>
      </section>

      {/* Footer */}
      <footer style={{ background: "#0f172a", color: "rgba(255,255,255,0.4)", padding: "32px 40px", textAlign: "center", fontSize: 13 }}>
        © 2025 Serenity Ridge Recovery · HIPAA Compliant · Joint Commission Accredited<br />
        <span style={{ marginTop: 8, display: "block" }}>
          <span style={{ color: "#5BC8DC", fontSize: 11 }}>⬆ This is a demo preview — the site above simulates a real treatment center website</span>
        </span>
      </footer>

      {/* ── Chatbot floating button + iframe ── */}

      {/* Notification badge */}
      {!open && pulse && (
        <div style={{
          position: "fixed", bottom: 96, right: 24,
          background: "#1a2744", color: "#fff", padding: "10px 16px",
          borderRadius: 12, fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)", zIndex: 9998,
          maxWidth: 220, lineHeight: 1.4,
          animation: "slideIn 0.3s ease",
        }}>
          👋 Wondering if you're covered? Check in 60 sec →
          <div style={{ position: "absolute", bottom: -8, right: 26, width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid #1a2744" }} />
        </div>
      )}

      {/* Chat iframe */}
      <div style={{
        position: "fixed", bottom: 92, right: 24,
        width: 380, height: 580,
        maxWidth: "calc(100vw - 48px)",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 12px 48px rgba(0,0,0,0.4)",
        zIndex: 9997,
        display: open ? "block" : "none",
        border: "1px solid rgba(255,255,255,0.08)",
        transition: "opacity 0.2s",
      }}>
        <iframe
          src="/chatbot-widget"
          title="Insurance Verification Chat"
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        />
      </div>

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 24, right: 24,
          width: 58, height: 58, borderRadius: "50%",
          background: open ? "#475569" : "#5BC8DC",
          border: "none", cursor: "pointer", zIndex: 9999,
          boxShadow: "0 4px 20px rgba(91,200,220,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.2s, transform 0.2s",
          transform: open ? "scale(0.95)" : "scale(1)",
        }}
        title={open ? "Close chat" : "Check Insurance Coverage"}
      >
        {open
          ? <X size={22} color="#fff" />
          : <MessageSquare size={22} color="#0d1117" />}
      </button>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        h1, h2, h3 { font-family: inherit; }
      `}</style>
    </div>
  );
}
