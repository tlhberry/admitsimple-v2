import { motion } from "framer-motion";
import { Sparkles, FileText, Bot, Zap, Cpu, ChevronRight } from "lucide-react";

const aiFeatures = [
  {
    icon: Sparkles,
    title: "Stage Suggestions",
    description: "Claude reads every inquiry and suggests exactly which pipeline stage it belongs in."
  },
  {
    icon: FileText,
    title: "Referral Parsing",
    description: "Upload a 30-page PDF from a hospital. Claude extracts demographics, clinical history, and generates a structured profile."
  },
  {
    icon: Zap,
    title: "Action Generation",
    description: "The AI task board automatically generates follow-up actions based on the patient's current state."
  },
  {
    icon: Bot,
    title: "24/7 Chatbot",
    description: "A website chatbot that captures leads around the clock and feeds them directly into the 'New Inquiry' column."
  }
];

const analysisLines = [
  { label: "Diagnosis", value: "Opioid Use Disorder, severe", confidence: 98 },
  { label: "Insurance", value: "Blue Cross PPO — Active", confidence: 94 },
  { label: "Risk Level", value: "High — immediate intake recommended", confidence: 91 },
  { label: "Suggested Stage", value: "Pre-Assessment", confidence: 97 },
];

const tasks = [
  "Schedule clinical pre-assessment call",
  "Request prior authorization from BCBS",
  "Send intake paperwork via SMS",
];

export default function AiSection() {
  return (
    <section id="ai" className="py-24 bg-[#2d3748] text-white relative overflow-hidden">
      <div className="absolute right-0 top-0 w-1/2 h-full bg-[#5BC8DC]/5 rounded-l-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5BC8DC]/15 text-[#5BC8DC] text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Direct AI Integration</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              AI that actually works in this workflow.
            </h2>

            <p className="text-lg text-white/65 mb-8">
              Most platforms charge a premium for AI features. AdmitSimple lets you plug in your own Anthropic API key. You pay for exactly what you use, directly to Anthropic.
            </p>

            <div className="space-y-6">
              {aiFeatures.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex gap-4"
                >
                  <div className="shrink-0 w-10 h-10 rounded-full bg-white/8 flex items-center justify-center text-[#5BC8DC]">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold mb-1">{feature.title}</h3>
                    <p className="text-white/55 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right — Coded Claude analysis mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="rounded-2xl border border-white/10 shadow-2xl bg-[#1e2535] overflow-hidden">
              {/* Title bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#181f2e] border-b border-white/8">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                <span className="ml-3 text-[11px] text-white/30 font-mono">Claude Analysis — Marcus T.</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#5BC8DC] animate-pulse" />
                  <span className="text-[10px] text-[#5BC8DC]">Processing</span>
                </div>
              </div>

              {/* Patient header */}
              <div className="px-4 pt-4 pb-3 border-b border-white/6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#5BC8DC]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#5BC8DC]">MT</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Marcus T., 34</p>
                  <p className="text-[11px] text-white/40">Referral received — PDF uploaded 2 min ago</p>
                </div>
                <div className="ml-auto text-[10px] bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full font-medium">High Priority</div>
              </div>

              {/* Analysis results */}
              <div className="px-4 py-4 space-y-3">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Claude Analysis Results</p>
                {analysisLines.map((line, i) => (
                  <motion.div
                    key={line.label}
                    initial={{ opacity: 0, x: 8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="bg-white/4 rounded-lg px-3 py-2.5 border border-white/6"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <span className="text-[10px] text-white/40 font-medium uppercase tracking-wide">{line.label}</span>
                      <span className="text-[10px] text-[#5BC8DC] font-semibold flex-shrink-0">{line.confidence}% confident</span>
                    </div>
                    <p className="text-xs text-white/80 font-medium">{line.value}</p>
                    <div className="mt-2 h-1 bg-white/8 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${line.confidence}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                        className="h-full bg-[#5BC8DC] rounded-full"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Generated tasks */}
              <div className="px-4 pb-4">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-2">Generated Action Items</p>
                <div className="space-y-1.5">
                  {tasks.map((task, i) => (
                    <motion.div
                      key={task}
                      initial={{ opacity: 0, y: 4 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.7 + i * 0.08 }}
                      className="flex items-center gap-2 bg-[#5BC8DC]/8 border border-[#5BC8DC]/15 rounded-lg px-3 py-2"
                    >
                      <ChevronRight className="w-3 h-3 text-[#5BC8DC] flex-shrink-0" />
                      <span className="text-[11px] text-white/75">{task}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-[#181f2e] border-t border-white/6 flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[#5BC8DC]" />
                <span className="text-[11px] text-white/40">Powered by Claude claude-opus-4-5 · Your Anthropic key · $0.003 used</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
