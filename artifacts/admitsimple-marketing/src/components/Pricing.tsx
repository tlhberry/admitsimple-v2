import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const seatTypes = [
  { role: "Admin", price: 149, desc: "Full access + user management" },
  { role: "Admissions", price: 99, desc: "Pipeline, SMS & scheduling" },
  { role: "BD Rep", price: 69, desc: "Accounts & activity tracking" },
];

const features = [
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

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-[#2d3748] border-t border-white/8 overflow-x-hidden">
      <div className="w-full px-4 md:px-6 max-w-2xl mx-auto">

        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Start free. No credit card.
          </h2>
          <p className="text-white/55 text-base max-w-md mx-auto">
            30 days on us. After that, pay only for the seats you use — cancel anytime.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-[#5BC8DC]/25 bg-[#1e2b3c] overflow-hidden"
        >
          <div className="p-6 md:p-10">

            {/* Free trial badge */}
            <div className="rounded-2xl bg-[#5BC8DC]/12 border border-[#5BC8DC]/20 p-5 mb-8 text-center">
              <div className="text-[#5BC8DC] text-4xl font-bold mb-1">Free for 30 days</div>
              <p className="text-white/45 text-sm">No credit card required · cancel anytime</p>
            </div>

            {/* Per-seat grid */}
            <p className="text-white/35 text-xs font-semibold uppercase tracking-widest mb-3 text-center">
              Then pay per active seat
            </p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {seatTypes.map((seat) => (
                <div key={seat.role} className="rounded-2xl bg-white/5 border border-white/8 p-4 text-center">
                  <div className="text-[#5BC8DC] text-2xl font-bold leading-none">${seat.price}</div>
                  <div className="text-white/35 text-[10px] mb-2">/mo per seat</div>
                  <div className="text-white text-xs font-semibold">{seat.role}</div>
                  <div className="text-white/40 text-[10px] mt-1 leading-tight hidden sm:block">{seat.desc}</div>
                </div>
              ))}
            </div>

            {/* Example */}
            <div className="rounded-xl bg-white/4 border border-white/6 px-4 py-3 mb-8 flex flex-wrap items-center justify-between gap-2">
              <span className="text-white/40 text-xs">Example: 1 Admin + 4 Admissions + 2 BD Reps</span>
              <span className="text-[#5BC8DC] font-bold text-sm whitespace-nowrap">$683 / mo</span>
            </div>

            {/* Features */}
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 mb-8">
              {features.map((f) => (
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
              <a href="/app/signup">Start Your Free Trial</a>
            </Button>

          </div>
        </motion.div>

        <p className="text-center text-xs text-white/30 mt-6">
          All plans include a signed BAA. AI billed at cost through your own Anthropic account — no markup.
        </p>
      </div>
    </section>
  );
}
