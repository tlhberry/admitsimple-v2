import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Cpu, Phone, MessageSquare, User } from "lucide-react";

const pipelineStages = [
  { label: "New Inquiry", count: 4, color: "bg-blue-500" },
  { label: "Initial Contact", count: 3, color: "bg-purple-500" },
  { label: "Insurance Verification", count: 2, color: "bg-yellow-500" },
  { label: "Pre-Assessment", count: 3, color: "bg-orange-500" },
];

const cards = [
  { name: "Marcus T.", time: "2h ago", stage: "New Inquiry", tag: "PPO Insurance", icon: Phone },
  { name: "Sarah L.", time: "4h ago", stage: "Pre-Assessment", tag: "AI: Ready to admit", icon: User, aiFlag: true },
  { name: "James R.", time: "1d ago", stage: "Insurance Verification", tag: "Medicaid", icon: MessageSquare },
];

export default function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center pt-32 bg-[#2d3748] text-white">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#5BC8DC]/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left — Copy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#5BC8DC] mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>HIPAA-Compliant</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-6">
            The Admissions CRM{" "}
            <span className="text-[#5BC8DC]">Powered by Claude.</span>{" "}
            Owned by You.
          </h1>

          <p className="text-lg md:text-xl text-white/65 mb-8 leading-relaxed max-w-xl">
            Stop paying markups on AI. AdmitSimple gives your treatment center an 8-stage clinical admissions pipeline with direct Anthropic integration. Pay Claude directly — no middlemen.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              size="lg"
              className="h-13 px-8 text-base bg-[#5BC8DC] text-[#1a2233] hover:bg-[#4ab5ca] font-semibold shadow-xl shadow-[#5BC8DC]/20 rounded-xl"
            >
              <a href="#demo">
                Request a Demo
                <ArrowRight className="ml-2 w-4 h-4" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 px-8 text-base border-white/15 text-white/80 hover:bg-white/8 bg-transparent rounded-xl"
            >
              <a href="#pipeline">Explore the Pipeline</a>
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-white/45">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#5BC8DC]/70" />
              <span>Bring your own Anthropic key</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#5BC8DC]/70" />
              <span>AWS HIPAA Infrastructure</span>
            </div>
          </div>
        </motion.div>

        {/* Right — Coded Pipeline Mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          {/* App frame */}
          <div className="rounded-2xl border border-white/10 shadow-2xl bg-[#1e2535] overflow-hidden">
            {/* Titlebar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-[#181f2e]">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              <span className="ml-3 text-[11px] text-white/30 font-mono">AdmitSimple — Admissions Pipeline</span>
            </div>

            {/* Pipeline columns */}
            <div className="p-4 grid grid-cols-2 gap-3">
              {pipelineStages.map((stage, i) => (
                <motion.div
                  key={stage.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="bg-white/4 rounded-lg p-3 border border-white/6"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                      <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wide">{stage.label}</span>
                    </div>
                    <span className="text-[10px] bg-white/10 text-white/50 rounded-full px-1.5 py-0.5">{stage.count}</span>
                  </div>
                  {/* Placeholder cards */}
                  {Array.from({ length: Math.min(stage.count, 2) }).map((_, j) => (
                    <div key={j} className="h-7 rounded-md bg-white/5 mb-1.5 border border-white/5 flex items-center px-2 gap-2">
                      <div className="w-3 h-3 rounded-full bg-white/15 flex-shrink-0" />
                      <div className="h-1.5 bg-white/15 rounded-full flex-1" />
                    </div>
                  ))}
                </motion.div>
              ))}
            </div>

            {/* Bottom inquiry list */}
            <div className="px-4 pb-4 space-y-2">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-2">Recent Inquiries</p>
              {cards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.name}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.12 }}
                    className="flex items-center gap-3 bg-white/4 rounded-lg px-3 py-2 border border-white/6"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#5BC8DC]/15 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3 h-3 text-[#5BC8DC]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-white/85 truncate">{card.name}</span>
                        {card.aiFlag && (
                          <span className="text-[9px] bg-[#5BC8DC]/20 text-[#5BC8DC] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">AI</span>
                        )}
                      </div>
                      <span className="text-[10px] text-white/40 truncate">{card.tag}</span>
                    </div>
                    <span className="text-[10px] text-white/30 flex-shrink-0">{card.time}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Floating Claude notification */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.1 }}
            className="absolute -bottom-5 -left-5 bg-[#1e2535] border border-[#5BC8DC]/30 rounded-xl p-3.5 shadow-2xl flex items-center gap-3 z-10"
          >
            <div className="w-9 h-9 rounded-full bg-[#5BC8DC]/15 flex items-center justify-center text-[#5BC8DC] flex-shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Claude Analysis Complete</p>
              <p className="text-[11px] text-white/55">Suggested stage: Pre-Assessment</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#5BC8DC] animate-pulse ml-1 flex-shrink-0" />
          </motion.div>

          {/* Floating call badge */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 1.3 }}
            className="absolute -top-4 -right-4 bg-[#1e2535] border border-white/10 rounded-xl px-3.5 py-2.5 shadow-xl flex items-center gap-2.5 z-10"
          >
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <Phone className="w-3.5 h-3.5 text-white/60" />
            <span className="text-xs text-white/70 font-medium">Inbound call routing</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
