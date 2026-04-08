import { CheckCircle } from "lucide-react";

const INTEGRATIONS = [
  {
    name: "Twilio",
    desc: "SMS inbox + inbound voice calls",
    logo: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <circle cx="20" cy="20" r="20" fill="#F22F46" />
        <circle cx="13.5" cy="13.5" r="3.5" fill="white" />
        <circle cx="26.5" cy="13.5" r="3.5" fill="white" />
        <circle cx="13.5" cy="26.5" r="3.5" fill="white" />
        <circle cx="26.5" cy="26.5" r="3.5" fill="white" />
      </svg>
    ),
  },
  {
    name: "Anthropic Claude",
    desc: "AI pipeline, task board & chatbot",
    logo: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <circle cx="20" cy="20" r="20" fill="#D97757" />
        <text x="20" y="26" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="system-ui">A</text>
      </svg>
    ),
  },
  {
    name: "Amazon Web Services",
    desc: "HIPAA VPC hosting & RDS",
    logo: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <circle cx="20" cy="20" r="20" fill="#232F3E" />
        <text x="20" y="26" textAnchor="middle" fill="#FF9900" fontSize="11" fontWeight="bold" fontFamily="system-ui">AWS</text>
      </svg>
    ),
  },
  {
    name: "PostgreSQL",
    desc: "HIPAA-encrypted patient data",
    logo: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <circle cx="20" cy="20" r="20" fill="#336791" />
        <text x="20" y="26" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="system-ui">PG</text>
      </svg>
    ),
  },
];

export default function IntegrationsSection() {
  return (
    <section id="integrations" className="py-24 bg-[#f8fafc]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-[#5BC8DC]/10 border border-[#5BC8DC]/30 text-[#3aa8bc] text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
            Integrations
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Works with your stack
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            AdmitSimple is built on the tools your team trusts — connected, configured, and ready on day one.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INTEGRATIONS.map((item) => (
            <div
              key={item.name}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-[#5BC8DC]/40 hover:shadow-md transition-all"
            >
              <div className="mb-4">{item.logo}</div>
              <h4 className="font-bold text-gray-900 mb-1">{item.name}</h4>
              <p className="text-sm text-gray-500 leading-snug">{item.desc}</p>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <CheckCircle className="w-3.5 h-3.5" />
                Live
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            Need a specific integration?{" "}
            <a href="/contact" className="text-[#5BC8DC] font-semibold hover:underline">
              Let us know
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
