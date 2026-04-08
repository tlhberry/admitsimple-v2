import { motion } from "framer-motion";
import { Key, ShieldCheck, Building2, Lock, EyeOff, FileCheck } from "lucide-react";

const reasons = [
  {
    icon: Key,
    title: "Your Key. Your Account.",
    body: "When you plug in your own Anthropic API key, patient data travels directly from your server to Anthropic. No third party ever sits in the middle. AdmitSimple never sees your API key or the data flowing through it."
  },
  {
    icon: EyeOff,
    title: "Anthropic Does Not Train on API Data.",
    body: "Anthropic's terms explicitly prohibit using API inputs and outputs for model training. The clinical notes, demographics, and referral documents you process through Claude are never used to improve any model. Period."
  },
  {
    icon: Building2,
    title: "Data Lives in Your AWS Account.",
    body: "With the perpetual license, the entire platform runs inside your own AWS VPC. Patient data never leaves your cloud environment except for the specific API call to Anthropic, which is encrypted end-to-end with TLS 1.3."
  },
  {
    icon: ShieldCheck,
    title: "No AI Markup Layer.",
    body: "Most CRMs build a proprietary AI layer on top of a foundation model and charge a markup. That means PHI routes through their servers. AdmitSimple calls Anthropic directly. Zero extra hops. Zero extra exposure."
  },
  {
    icon: Lock,
    title: "Minimal Data Per Request.",
    body: "AdmitSimple sends only what is necessary for the specific task. A stage suggestion call sends inquiry text. A referral parse sends the document. Patient histories are never bulk-transmitted to the API."
  },
  {
    icon: FileCheck,
    title: "BAA Coverage on Every Layer.",
    body: "Anthropic provides Business Associate Agreements for API customers. AWS covers all HIPAA-eligible services under their BAA program. AdmitSimple provides a signed BAA to every client on day one."
  }
];

export default function ClaudeDataSafety() {
  return (
    <section id="data-safety" className="py-24 bg-[#1e2535] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#5BC8DC]/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#5BC8DC]/15 text-[#5BC8DC] text-sm font-medium mb-6">
            <Lock className="w-4 h-4" />
            <span>Claude and Your Patient Data</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-5">
            Why your data stays safe when you use Claude.
          </h2>
          <p className="text-lg text-white/65 leading-relaxed">
            Using AI with protected health information is a serious decision. Here is exactly why AdmitSimple's approach protects your patients and your facility.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white/4 border border-white/8 rounded-2xl p-6 hover:bg-white/6 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-[#5BC8DC]/15 flex items-center justify-center text-[#5BC8DC] mb-5">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-3">{item.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{item.body}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 mx-auto max-w-2xl bg-[#5BC8DC]/8 border border-[#5BC8DC]/20 rounded-2xl p-6 text-center">
          <p className="text-sm text-white/70 leading-relaxed">
            Still have compliance questions? Our team works with healthcare attorneys and compliance officers regularly.{" "}
            <a href="/contact" className="text-[#5BC8DC] font-semibold hover:underline">
              Reach out directly
            </a>{" "}
            and we will walk through your specific requirements.
          </p>
        </div>
      </div>
    </section>
  );
}
