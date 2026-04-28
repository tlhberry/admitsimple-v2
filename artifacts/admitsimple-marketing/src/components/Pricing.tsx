import { motion } from "framer-motion";
import { Check, Zap, Server } from "lucide-react";
import { Button } from "@/components/ui/button";

const seatTypes = [
  { role: "Admin", price: 149 },
  { role: "Admissions", price: 99 },
  { role: "BD Rep", price: 69 },
];

const saasFeatures = [
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
];

const perpetualFeatures = [
  "Full source code — yours forever",
  "Hosted on your own servers",
  "No recurring software fees, ever",
  "Complete data sovereignty",
  "Ongoing server management included",
  "Custom feature development",
  "AI & CRM consulting retainer",
  "Signed BAA included",
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-gray-50 border-t border-gray-100 overflow-x-hidden">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl">

        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Two ways to get started
          </h2>
          <p className="text-base md:text-lg text-gray-500 max-w-xl mx-auto">
            Subscribe month-to-month and cancel anytime — or buy the whole platform outright and own it forever.
          </p>
        </div>

        <div className="flex flex-col gap-6">

          {/* ── Option 1: SaaS ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-[#2d3748] border border-[#5BC8DC]/25 overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-[#5BC8DC]/4 pointer-events-none" />

            {/* Badge */}
            <div className="absolute top-0 right-0 bg-[#5BC8DC] text-[#1a2233] text-xs font-bold px-4 py-1.5 rounded-bl-2xl">
              Most Popular
            </div>

            <div className="relative z-10 p-6 md:p-10">
              {/* Title row */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-[#5BC8DC]/15 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4.5 h-4.5 text-[#5BC8DC]" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white">Standard SaaS</h3>
              </div>
              <p className="text-white/50 text-sm mb-8">
                Fully hosted by us. Set up in minutes. Cancel anytime.
              </p>

              {/* Free trial callout */}
              <div className="rounded-2xl bg-[#5BC8DC]/10 border border-[#5BC8DC]/20 px-5 py-4 mb-8 text-center">
                <div className="text-[#5BC8DC] text-3xl font-bold mb-1">Free for 30 days</div>
                <p className="text-white/45 text-sm">No credit card required to start</p>
              </div>

              {/* Per-seat pricing */}
              <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">Then pay per seat</p>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {seatTypes.map((seat) => (
                  <div key={seat.role} className="rounded-2xl bg-white/6 border border-white/10 p-4 text-center">
                    <div className="text-[#5BC8DC] text-2xl font-bold leading-none mb-1">
                      ${seat.price}
                    </div>
                    <div className="text-white/40 text-[11px]">/mo</div>
                    <div className="text-white/70 text-xs font-medium mt-2">{seat.role}</div>
                  </div>
                ))}
              </div>

              {/* Example bill */}
              <div className="rounded-xl bg-white/5 border border-white/8 px-4 py-3 mb-8 flex flex-wrap items-center justify-between gap-2">
                <span className="text-white/45 text-xs">Example: 1 Admin + 4 Admissions + 2 BD Reps</span>
                <span className="text-[#5BC8DC] font-bold text-sm whitespace-nowrap">$683 / mo</span>
              </div>

              {/* Features */}
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 mb-8">
                {saasFeatures.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-[#5BC8DC]/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-[#5BC8DC]" />
                    </div>
                    <span className="text-white/65 text-sm">{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Button
                asChild
                size="lg"
                className="w-full bg-[#5BC8DC] text-[#1a2233] hover:bg-[#4ab5ca] font-bold h-13 text-base rounded-xl shadow-lg shadow-[#5BC8DC]/20"
              >
                <a href="/app/signup">Start Free — No Card Required</a>
              </Button>
            </div>
          </motion.div>

          {/* ── Option 2: Perpetual License ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl bg-white border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="p-6 md:p-10">
              {/* Title row */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Server className="w-4.5 h-4.5 text-gray-600" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">Perpetual License</h3>
              </div>
              <p className="text-gray-500 text-sm mb-8">
                Buy the platform outright. We host it on your servers, build what you need, and stay on as your CRM and AI consultant.
              </p>

              {/* Price callout */}
              <div className="rounded-2xl bg-gray-50 border border-gray-200 px-5 py-4 mb-8 text-center">
                <div className="text-gray-900 text-3xl font-bold mb-1">$10,000</div>
                <p className="text-gray-400 text-sm">one-time · no recurring software fee, ever</p>
              </div>

              {/* Features */}
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 mb-8">
                {perpetualFeatures.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-primary" />
                    </div>
                    <span className="text-gray-600 text-sm">{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Button
                asChild
                size="lg"
                className="w-full bg-gray-900 text-white hover:bg-gray-800 font-bold h-13 text-base rounded-xl"
              >
                <a href="#demo">Talk to Us About Full Ownership</a>
              </Button>
            </div>
          </motion.div>

        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          All plans include a signed BAA. AI usage billed at cost through your Anthropic account — no markup.
        </p>
      </div>
    </section>
  );
}
