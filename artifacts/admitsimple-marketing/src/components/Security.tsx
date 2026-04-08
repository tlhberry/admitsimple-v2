import { motion } from "framer-motion";
import { Lock, Server, FileSignature, Database } from "lucide-react";

export default function Security() {
  return (
    <section id="security" className="py-24 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">HIPAA-compliant by architecture</h2>
          <p className="text-lg text-gray-600">
            Compliance isn't a checkbox. It's an engineering decision. We built AdmitSimple on a foundation of absolute security.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Database,
              title: "Encrypted Data",
              description: "AES-256 encryption at rest and TLS 1.3 in transit. Complete database isolation."
            },
            {
              icon: Server,
              title: "VPC Isolation",
              description: "Deployed within secure AWS VPCs. No public database access, strict security groups."
            },
            {
              icon: Lock,
              title: "Audit Logging",
              description: "CloudTrail and application-level logging of every PHI access and modification."
            },
            {
              icon: FileSignature,
              title: "Signed BAAs",
              description: "Business Associate Agreements provided on day one for all hosted clients."
            }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-900 mb-4">
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
