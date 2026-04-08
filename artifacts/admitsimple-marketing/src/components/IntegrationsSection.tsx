import { CheckCircle, Clock } from "lucide-react";

const LIVE_INTEGRATIONS = [
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

const COMING_SOON = [
  {
    name: "Kipu EMR",
    desc: "Push admitted patients to EMR",
    color: "#2563EB",
    initials: "Ki",
  },
  {
    name: "Google Analytics",
    desc: "Track lead source attribution",
    color: "#F59E0B",
    initials: "GA",
  },
  {
    name: "Zapier",
    desc: "Connect any tool via automation",
    color: "#FF4A00",
    initials: "Zp",
  },
  {
    name: "Meta Ads",
    desc: "Sync lead forms from Facebook/Instagram",
    color: "#1877F2",
    initials: "M",
  },
  {
    name: "Google Ads",
    desc: "Track call conversions from paid search",
    color: "#4285F4",
    initials: "G",
  },
  {
    name: "Mailchimp",
    desc: "Alumni re-engagement campaigns",
    color: "#FFE01B",
    initials: "Mc",
    dark: true,
  },
  {
    name: "DocuSign",
    desc: "E-sign consent & financial agreements",
    color: "#1B2B54",
    initials: "DS",
  },
  {
    name: "Availity",
    desc: "Real-time insurance eligibility checks",
    color: "#00875A",
    initials: "Av",
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
            AdmitSimple connects the tools your team already uses. Live integrations are built and working today. Coming soon integrations are on our roadmap.
          </p>
        </div>

        {/* Live integrations */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Live Today</h3>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LIVE_INTEGRATIONS.map((item) => (
              <div
                key={item.name}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-[#5BC8DC]/40 hover:shadow-md transition-all group"
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
        </div>

        {/* Coming soon */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Coming Soon</h3>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COMING_SOON.map((item) => (
              <div
                key={item.name}
                className="bg-white border border-gray-100 rounded-2xl p-6 opacity-75 hover:opacity-90 transition-opacity"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-sm font-bold"
                  style={{
                    backgroundColor: item.color,
                    color: item.dark ? "#1a1a1a" : "white",
                  }}
                >
                  {item.initials}
                </div>
                <h4 className="font-bold text-gray-700 mb-1">{item.name}</h4>
                <p className="text-sm text-gray-400 leading-snug">{item.desc}</p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-500 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  Coming Soon
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <p className="text-gray-500 text-sm">
            Need an integration that's not listed?{" "}
            <a href="/contact" className="text-[#5BC8DC] font-semibold hover:underline">
              Tell us what you use
            </a>{" "}
            and we'll evaluate it for the roadmap.
          </p>
        </div>
      </div>
    </section>
  );
}
