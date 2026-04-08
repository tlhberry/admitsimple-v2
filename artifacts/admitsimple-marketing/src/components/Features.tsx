import { motion } from "framer-motion";
import { Stethoscope, CheckCircle2, Shield, Settings2, Code2, Users } from "lucide-react";

const features = [
  {
    icon: Stethoscope,
    title: "Clinical Precision",
    description: "Built specifically for behavioral health and addiction treatment. Every field, status, and workflow maps to reality."
  },
  {
    icon: Settings2,
    title: "8-Stage Pipeline",
    description: "New Inquiry → Initial Contact → Insurance Verification → Pre-Assessment → Scheduled → Admitted → Discharged → Did Not Admit."
  },
  {
    icon: CheckCircle2,
    title: "VOB & Intake Forms",
    description: "Pre-screen intake forms and verification of benefits integrated directly into the patient's centralized profile."
  },
  {
    icon: Users,
    title: "Business Development",
    description: "Track referral sources, manage BD rep activity, and automatically parse referral documents with AI."
  },
  {
    icon: Code2,
    title: "Perpetual License Available",
    description: "Subscribe to our hosted multi-tenant SaaS, or buy the source code and deploy to your own AWS in 15 minutes."
  },
  {
    icon: Shield,
    title: "Complete Audit Trail",
    description: "Every click, view, and modification is logged for HIPAA compliance. Built-in CloudTrail audit logging."
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Built for the whole admissions journey</h2>
          <p className="text-lg text-gray-600">
            Generic CRMs require months of custom configuration. AdmitSimple works for treatment centers out of the box.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:border-primary/20 transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
