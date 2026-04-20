import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const tiers = [
  {
    name: "Done-For-You Setup",
    tagline: "We build and configure it for your facility.",
    price: "$5K–$10K",
    priceSub: "one-time implementation + small annual retainer",
    highlight: false,
    badge: null,
    features: [
      "Full platform built to your workflow",
      "Team training included",
      "Custom pipeline stage configuration",
      "CRM data migration from your current tool",
      "Ongoing annual support retainer",
      "Signed BAA included"
    ],
    cta: "Talk to Us",
    href: "#demo"
  },
  {
    name: "Hosted SaaS",
    tagline: "We host, maintain, and update it for you.",
    price: "$499",
    priceSub: "per month · cancel anytime",
    highlight: false,
    badge: null,
    features: [
      "Unlimited users",
      "All 8 pipeline stages",
      "AI parsing and task generation",
      "SMS inbox + inbound call routing",
      "Automatic platform updates",
      "Signed BAA included"
    ],
    cta: "Request a Demo",
    href: "#demo"
  },
  {
    name: "Perpetual License",
    tagline: "Buy the source code. Own it forever.",
    price: "One-Time Fee",
    priceSub: "no recurring software costs, ever",
    highlight: true,
    badge: "Most Control",
    features: [
      "Full source code ownership",
      "Deploy to your own AWS VPC",
      "Absolute data sovereignty",
      "Modify and extend as you need",
      "No per-user or per-seat fees",
      "1 year of updates and support"
    ],
    cta: "Discuss Perpetual License",
    href: "#demo"
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
      "Priority support + SLA"
    ],
    cta: "Contact Us",
    href: "#demo"
  }
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Flexible pricing. No markups.</h2>
          <p className="text-lg text-gray-600">
            Own the platform outright, subscribe month-to-month, let us set it up for you, or license across your entire portfolio. We fit how you operate.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {tiers.map((tier, i) => (
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
          All plans include a signed BAA. AI usage billed directly through your Anthropic account — no markup.
        </p>
      </div>
    </section>
  );
}
