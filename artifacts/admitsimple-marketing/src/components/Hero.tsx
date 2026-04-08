import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Cpu } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center pt-20 bg-[#2d3748] text-white overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="container mx-auto px-4 md:px-6 relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary mb-6">
            <ShieldCheck className="w-4 h-4" />
            <span>HIPAA-Compliant by Architecture</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6">
            The Admissions CRM <br/>
            <span className="text-primary">Powered by Claude.</span><br/>
            Owned by You.
          </h1>
          
          <p className="text-lg md:text-xl text-white/70 mb-8 leading-relaxed max-w-xl">
            Stop paying markups on AI. AdmitSimple gives your treatment center an 8-stage clinical pipeline with direct Anthropic integration. Direct AI at cost. No middlemen.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="h-14 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-xl shadow-primary/20">
              <a href="#demo">
                Request a Demo
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base border-white/20 text-white hover:bg-white/10 bg-transparent">
              <a href="#pipeline">
                Explore the Pipeline
              </a>
            </Button>
          </div>
          
          <div className="mt-12 flex items-center gap-6 text-sm text-white/50">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary/70" />
              <span>Bring your own API key</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary/70" />
              <span>Signed BAAs Included</span>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#202735] p-2">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none" />
            <img 
              src="/images/dashboard-hero.png" 
              alt="AdmitSimple Dashboard Interface" 
              className="w-full h-auto rounded-lg border border-white/5"
            />
          </div>
          
          {/* Floating UI Elements */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="absolute -bottom-6 -left-6 bg-[#202735] border border-white/10 rounded-lg p-4 shadow-xl flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Claude Analysis Complete</p>
              <p className="text-xs text-white/60">Suggested stage: Pre-Assessment</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
