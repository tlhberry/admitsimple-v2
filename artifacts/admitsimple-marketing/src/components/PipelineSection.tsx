import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const stages = [
  { name: "New Inquiry", desc: "Inbound calls, SMS, and web chat leads" },
  { name: "Initial Contact", desc: "First connection made with patient/family" },
  { name: "Insurance Verification", desc: "VOB processing and financial clearing" },
  { name: "Pre-Assessment", desc: "Clinical and medical review" },
  { name: "Scheduled to Admit", desc: "Travel booked, arrival planned" },
  { name: "Admitted", desc: "Patient has arrived at facility" },
  { name: "Discharged", desc: "Successful completion of program" },
  { name: "Did Not Admit", desc: "Archived with reason for non-admit" }
];

export default function PipelineSection() {
  return (
    <section id="pipeline" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              The 8-Stage Clinical Pipeline
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              We mapped the exact reality of an admissions department. Move patients through a purpose-built Kanban board that tracks every call, SMS, and clinical document automatically.
            </p>
            
            <div className="space-y-3">
              {stages.map((stage, i) => (
                <div key={i} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{stage.name}</h4>
                    <p className="text-sm text-gray-500">{stage.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent rounded-2xl transform rotate-3" />
            <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-2xl bg-white p-2">
              <img 
                src="/images/pipeline.png" 
                alt="Admissions Pipeline Kanban Board" 
                className="w-full h-auto rounded-lg border border-gray-100"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
