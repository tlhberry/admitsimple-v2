import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const seatTypes = [
  { role: "Admin", price: 99, desc: "Full platform access + user management" },
  { role: "Admissions", price: 70, desc: "Pipeline, inquiries, SMS & scheduling" },
  { role: "BD Rep", price: 50, desc: "Accounts, contacts & activity tracking" },
];

const enterpriseTiers = [
  {
    name: "Done-For-You Setup",
    tagline: "We build and configure it for your facility.",
    price: "$5K–$10K",
    priceSub: "one-time implementation + optional annual retainer",
    highlight: false,
    badge: null,
    features: [
      "Full platform built to your workflow",
      "Team training included",
      "Custom pipeline stage configuration",
      "CRM data migration from your current tool",
      "Ongoing annual support retainer",
      "Signed BAA included",
    ],
    cta: "Talk to Us",
    href: "#demo",
    signupHref: null,
  },
  {
    name: "Perpetual License",
    tagline: "Buy the source code. Own it forever.",
    price: "One-Time Fee",
    priceSub: "no recurring software costs — ever",
    highlight: true,
    badge: "Most Control",
    features: [
      "Full source code ownership",
      "Deploy to your own AWS / Azure VPC",
      "Absolute data sovereignty",
      "Modify and extend as needed",
      "No per-user or per-seat fees — ever",
      "1 year of updates and support",
      "Signed BAA included",
    ],
    cta: "Discuss Perpetual License",
    href: "#demo",
    signupHref: null,
  },
  {
    name: "Enterprise / Franchise",
    tagline: "Multi-site operators and PE-backed groups.",
    price: "Flat Enterprise Fee",
    priceSub: "one deal covers all your facilities",
    highlight: false,
    badge: null,
    features: [
      "Unlimited facilities under one license",
      "Centralized reporting across sites",
      "Dedicated implementation team",
      "Custom AI fine-tuning on your data",
      "Executive-level reporting dashboard",
      "Priority support + SLA",
    ],
    cta: "Contact Us",
    href: "#demo",
    signupHref: null,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Start free. Scale as you grow.</h2>
          <p className="text-lg text-gray-600">
            Try AdmitSimple free for 30 days — no credit card required. Pay only for the seats you use. Or buy the whole platform outright and never pay again.
          </p>
        </div>

        {/* SaaS / Standard plan — full-width feature card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto mb-10 rounded-3xl border border-[#5BC8DC]/30 bg-[#2d3748] shadow-xl overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-[#5BC8DC]/5 pointer-events-none" />
          <div className="absolute top-0 right-0 bg-[#5BC8DC] text-[#1a2233] text-xs font-bold px-5 py-1.5 rounded-bl-2xl">
            Most Popular
          </div>

          <div className="relative z-10 p-8 md:p-10">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-[#5BC8DC]" />
                  <h3 className="text-2xl font-bold text-white">Standard SaaS</h3>
                </div>
                <p className="text-white/55 text-sm">Fully hosted. We handle the infrastructure. Start in minutes.</p>
              </div>
              <div className="text-right">
                <div className="text-[#5BC8DC] text-3xl font-bold">Free for 30 days</div>
                <p className="text-white/40 text-xs mt-1">then pay only for active seats · cancel anytime</p>
              </div>
            </div>

            {/* Seat pricing grid */}
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {seatTypes.map((seat) => (
                <div key={seat.role} className="rounded-2xl bg-white/6 border border-white/10 p-5">
                  <div className="text-[#5BC8DC] text-2xl font-bold mb-0.5">${seat.price}<span className="text-sm font-medium text-white/40">/mo</span></div>
                  <div className="text-white font-semibold text-sm mb-1">per {seat.role}</div>
                  <div className="text-white/45 text-xs leading-relaxed">{seat.desc}</div>
                </div>
              ))}
            </div>

            {/* Example bill */}
            <div className="rounded-xl bg-white/4 border border-white/8 px-5 py-4 mb-8 flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">Example bill</span>
              <span className="text-white/70 text-sm">1 Admin + 4 Admissions + 2 BD Reps</span>
              <span className="text-[#5BC8DC] font-bold text-sm ml-auto">$479 / month</span>
            </div>

            {/* Feature list */}
            <div className="grid sm:grid-cols-2 gap-x-10 gap-y-2.5 mb-8">
              {[
                "All 8 pipeline stages",
                "AI intake parsing + task generation",
                "SMS inbox + inbound call routing",
                "Insurance verification tracker",
                "Bed board + patient census",
                "Business development CRM",
                "Analytics + custom reports",
                "Automatic platform updates",
                "Signed BAA included",
                "HIPAA-compliant infrastructure",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#5BC8DC]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-[#5BC8DC]" />
                  </div>
                  <span className="text-white/70 text-sm">{f}</span>
                </div>
              ))}
            </div>

            <Button
              asChild
              size="lg"
              className="bg-[#5BC8DC] text-[#1a2233] hover:bg-[#4ab5ca] font-bold h-12 px-10 text-base shadow-lg shadow-[#5BC8DC]/20 rounded-xl"
            >
              <a href="/app/signup">Start Free Trial — No Credit Card Required</a>
            </Button>
          </div>
        </motion.div>

        {/* Enterprise / ownership tiers */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {enterpriseTiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`rounded-3xl p-8 border relative overflow-hidden flex flex-col ${
                tier.highlight
                  ? "bg-[#2d3748] border-white/10 shadow-xl text-white"
                  : "bg-white border-gray-200 shadow-sm text-gray-900"
              }`}
            >
              {tier.badge && (
                <div className="absolute top-0 right-0 bg-[#5BC8DC] text-[#1a2233] text-xs font-bold px-4 py-1 rounded-bl-xl">
                  {tier.badge}
                </div>
              )}
              {tier.highlight && (
                <div className="absolute inset-0 bg-[#5BC8DC]/5 pointer-events-none" />
              )}

              <div className="mb-6 relative z-10">
                <h3 className={`text-xl font-bold mb-1 ${tier.highlight ? "text-white" : "text-gray-900"}`}>
                  {tier.name}
                </h3>
                <p className={`text-sm ${tier.highlight ? "text-white/55" : "text-gray-500"}`}>
                  {tier.tagline}
                </p>
              </div>

              <div className="mb-6 relative z-10">
                <div className={`text-2xl font-bold ${tier.highlight ? "text-[#5BC8DC]" : "text-gray-900"}`}>
                  {tier.price}
                </div>
                <p className={`text-xs mt-1 ${tier.highlight ? "text-white/45" : "text-gray-400"}`}>
                  {tier.priceSub}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-grow relative z-10">
                {tier.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <div className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                      tier.highlight ? "bg-[#5BC8DC]/20 text-[#5BC8DC]" : "bg-primary/10 text-primary"
                    }`}>
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span className={`text-sm ${tier.highlight ? "text-white/75" : "text-gray-600"}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={`w-full h-11 text-sm font-semibold relative z-10 ${
                  tier.highlight
                    ? "bg-[#5BC8DC] text-[#1a2233] hover:bg-[#4ab5ca]"
                    : "bg-gray-900 text-white hover:bg-gray-800"
                }`}
              >
                <a href={tier.href}>{tier.cta}</a>
              </Button>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-10">
          All plans include a signed BAA. AI usage billed at cost through your Anthropic account — no markup.
        </p>
      </div>
    </section>
  );
}
