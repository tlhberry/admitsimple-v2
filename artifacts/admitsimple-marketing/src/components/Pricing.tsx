import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Transparent Pricing. No AI Markups.</h2>
          <p className="text-lg text-gray-600">
            Choose between our hosted SaaS or buying the source code outright. Either way, you bring your own Anthropic API key and pay for AI at cost.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm relative overflow-hidden flex flex-col"
          >
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Hosted SaaS</h3>
              <p className="text-gray-500 text-sm h-10">We host and maintain the software for you. Multi-tenant architecture.</p>
            </div>
            
            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">$499</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Plus your Anthropic API usage</p>
            </div>

            <ul className="space-y-4 mb-8 flex-grow">
              {[
                "Unlimited Users",
                "All 8 Pipeline Stages",
                "AI Parsing & Suggestions",
                "Signed BAA Included",
                "Automatic Updates",
                "Standard Support"
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-gray-600 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button asChild className="w-full bg-gray-900 text-white hover:bg-gray-800 h-12 text-base font-semibold">
              <a href="#demo">Request a Demo</a>
            </Button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-[#2d3748] rounded-3xl p-8 border border-white/10 shadow-xl relative overflow-hidden flex flex-col text-white"
          >
            <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-bl-xl">
              Most Control
            </div>
            
            <div className="mb-8 relative z-10">
              <h3 className="text-2xl font-bold mb-2">Perpetual License</h3>
              <p className="text-white/60 text-sm h-10">Buy the source code. Deploy to your own AWS. Total data sovereignty.</p>
            </div>
            
            <div className="mb-8 relative z-10">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$25,000</span>
                <span className="text-white/60">one-time</span>
              </div>
              <p className="text-sm text-white/60 mt-2">No recurring software fees</p>
            </div>

            <ul className="space-y-4 mb-8 flex-grow relative z-10">
              {[
                "Full Source Code Access",
                "Deploy to your AWS VPC",
                "Absolute Data Sovereignty",
                "Modify the code as needed",
                "No per-user licensing fees",
                "Includes 1-year updates & support"
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-white/80 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold relative z-10">
              <a href="#demo">Discuss Perpetual License</a>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
