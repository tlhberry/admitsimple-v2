import { motion } from "framer-motion";
import { Package, Wrench, Building2, BrainCircuit, Shield, Settings2 } from "lucide-react";

const features = [
  {
    icon: Package,
    title: "The Ownership Model",
    description: "Buy the source code once, own it forever. Deploy to your own AWS, modify it however you want, and never pay a recurring software fee again. Anti-SaaS by design."
  },
  {
    icon: Settings2,
    title: "8-Stage Clinical Pipeline",
    description: "New Inquiry → Initial Contact → Insurance Verification → Pre-Assessment → Scheduled → Admitted → Discharged → Did Not Admit. Every stage purpose-built for behavioral health."
  },
  {
    icon: Wrench,
    title: "Done-For-You Setup",
    description: "We build it for you, configure it to your exact workflow, and train your team. A $5–10K white-glove implementation plus a small annual support retainer. More consulting than SaaS."
  },
  {
    icon: Building2,
    title: "The Franchise Model",
    description: "Running multiple facilities or backed by private equity? One flat enterprise license covers every location. One deal replaces 5–10 separate software contracts."
  },
  {
    icon: BrainCircuit,
    title: "Train AI on Your Data",
    description: "A premium tier where your historical admissions data fine-tunes AI reporting and benchmarking. Your data becomes a competitive moat. Once trained — you'd never leave."
  },
  {
    icon: Shield,
    title: "HIPAA-Compliant Architecture",
    description: "AES-256 encryption, AWS VPC isolation, audit logging on every PHI access, and signed BAAs on day one. Compliance built in — not bolted on."
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Built for treatment centers. Flexible by design.</h2>
          <p className="text-lg text-gray-600">
            The old "pay us forever" SaaS model is dying. We built AdmitSimple to give treatment centers real flexibility — own it outright, subscribe, let us set it up, or run it across your whole portfolio.
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
