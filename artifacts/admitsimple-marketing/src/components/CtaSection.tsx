import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Clock, CreditCard } from "lucide-react";

export default function CtaSection() {
  return (
    <section className="py-20 bg-white border-t border-gray-100 overflow-x-hidden">
      <div className="w-full px-4 md:px-6 max-w-2xl mx-auto text-center">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Your admissions team deserves better tools.
          </h2>
          <p className="text-gray-500 text-base md:text-lg mb-10 max-w-md mx-auto">
            Get your team set up in minutes. No IT department, no long contracts, no credit card needed to start.
          </p>

          <Button
            asChild
            size="lg"
            className="bg-[#5BC8DC] text-[#1a2233] hover:bg-[#4ab5ca] font-bold h-14 px-10 text-lg rounded-xl shadow-xl shadow-[#5BC8DC]/20 w-full sm:w-auto"
          >
            <a href="/app/signup">
              Start Free for 30 Days
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
          </Button>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-5 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#5BC8DC]" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#5BC8DC]" />
              <span>Set up in under 5 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#5BC8DC]" />
              <span>HIPAA-compliant from day one</span>
            </div>
          </div>
        </motion.div>

        {/* Perpetual license — quiet footnote for the right buyer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 pt-10 border-t border-gray-100"
        >
          <p className="text-gray-400 text-sm">
            Need full customization — your code, your servers, your rules?{" "}
            <a
              href="mailto:austin@admitsimple.com"
              className="text-gray-600 font-medium hover:text-[#5BC8DC] underline underline-offset-2 transition-colors"
            >
              Ask us about our perpetual license →
            </a>
          </p>
        </motion.div>

      </div>
    </section>
  );
}
