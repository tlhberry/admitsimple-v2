import { motion } from "framer-motion";
import { Sparkles, FileText, Bot, Zap } from "lucide-react";

const aiFeatures = [
  {
    icon: Sparkles,
    title: "Stage Suggestions",
    description: "Claude reads every inquiry and suggests exactly which pipeline stage it belongs in."
  },
  {
    icon: FileText,
    title: "Referral Parsing",
    description: "Upload a 30-page PDF from a hospital. Claude automatically extracts demographics, clinical history, and generates a structured profile."
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

export default function AiSection() {
  return (
    <section id="ai" className="py-24 bg-[#2d3748] text-white relative overflow-hidden">
      <div className="absolute right-0 top-0 w-1/2 h-full bg-primary/5 rounded-l-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Direct AI Integration</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              AI that actually works in this workflow.
            </h2>
            
            <p className="text-lg text-white/70 mb-8">
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
                  <div className="shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-primary">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{feature.title}</h3>
                    <p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#202735] p-2">
              <img 
                src="/images/ai-analysis.png" 
                alt="AI Patient Analysis Interface" 
                className="w-full h-auto rounded-lg border border-white/5"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
