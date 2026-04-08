import { Phone, Clock, FileText, CheckCircle, Shield, SendHorizontal, XCircle, Mic, UserCheck, Users } from "lucide-react";

export default function InboundCallSection() {
  return (
    <section className="py-24 bg-[#1a2233] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-[#5BC8DC]/5 pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 relative">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">
              <Phone className="w-3.5 h-3.5" />
              Live Inbound Call System
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Phone rings.<br />
              <span className="text-[#5BC8DC]">Form opens instantly.</span>
            </h2>

            <p className="text-white/65 text-lg mb-8 leading-relaxed">
              The moment a call comes in through your Twilio number, AdmitSimple surfaces a live intake form for any available rep to claim. No switching tabs, no digging for a notepad. Just answer and start documenting.
            </p>

            <div className="space-y-5 mb-10">
              {[
                {
                  icon: Phone,
                  color: "text-rose-400",
                  bg: "bg-rose-500/10 border-rose-500/20",
                  title: "Instant call alert",
                  desc: "A pulsing banner appears on every rep's screen simultaneously. First to claim it takes the call — no dropped leads.",
                },
                {
                  icon: FileText,
                  color: "text-[#5BC8DC]",
                  bg: "bg-[#5BC8DC]/10 border-[#5BC8DC]/20",
                  title: "Live intake form locks to you",
                  desc: "The form is yours the moment you claim the call. Other reps see it as locked, preventing duplicate work.",
                },
                {
                  icon: Mic,
                  color: "text-violet-400",
                  bg: "bg-violet-500/10 border-violet-500/20",
                  title: "Type while you talk",
                  desc: "Capture name, DOB, insurance info, referral source, and clinical notes in real time. Everything saves automatically.",
                },
                {
                  icon: CheckCircle,
                  color: "text-emerald-400",
                  bg: "bg-emerald-500/10 border-emerald-500/20",
                  title: "One-tap post-call workflow",
                  desc: 'When the call ends, "What\'s Next?" appears — send a VOB, refer out to another facility, or mark Did Not Admit with an auto follow-up message.',
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1 text-sm">{item.title}</h3>
                    <p className="text-white/55 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-white/80 text-sm leading-relaxed italic">
                "Returning callers are automatically matched to their existing inquiry. No need to search — the record opens right where you left off."
              </p>
            </div>
          </div>

          {/* Right: visual mock */}
          <div className="relative flex flex-col gap-4">

            {/* Incoming call banner */}
            <div className="rounded-2xl overflow-hidden border border-rose-500/30 shadow-2xl shadow-rose-500/10">
              <div className="h-1.5 bg-rose-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-rose-400 animate-pulse" />
              </div>
              <div className="bg-[#1a2035] px-5 py-4 flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping" />
                  <div className="relative w-12 h-12 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-rose-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/15 border border-rose-500/25 px-2 py-0.5 rounded-full">Incoming Call</span>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full">Existing</span>
                  </div>
                  <p className="text-lg font-bold text-white font-mono tracking-tight">(512) 847-3921</p>
                  <p className="text-xs text-slate-400">Marcus T. · via Admissions Line</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="flex items-center gap-1.5 h-10 px-4 bg-rose-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-600/30">
                    <Users className="w-4 h-4" />
                    Claim
                  </button>
                </div>
              </div>
            </div>

            {/* Live intake form */}
            <div className="bg-[#1e2740] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Live Intake — Marcus T.</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-mono">02:47</span>
                </div>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3">
                {[
                  { label: "Patient Name", value: "Marcus Taylor" },
                  { label: "Date of Birth", value: "03/14/1988" },
                  { label: "Phone", value: "(512) 847-3921" },
                  { label: "Insurance", value: "Blue Cross PPO" },
                  { label: "Member ID", value: "BCB4821930" },
                  { label: "Referral Source", value: "Google Search" },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-[10px] text-white/40 font-medium uppercase tracking-wide mb-1">{f.label}</p>
                    <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90">{f.value}</div>
                  </div>
                ))}
                <div className="col-span-2">
                  <p className="text-[10px] text-white/40 font-medium uppercase tracking-wide mb-1">Clinical Notes</p>
                  <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 leading-relaxed">
                    Patient reports 3-year history, seeking residential. PPO insurance confirmed active. Requesting same-day intake if bed available...
                    <span className="inline-block w-0.5 h-4 bg-[#5BC8DC] ml-0.5 animate-pulse align-middle" />
                  </div>
                </div>
              </div>
              <div className="px-5 pb-4">
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Auto-saving every 5 seconds</span>
                </div>
              </div>
            </div>

            {/* What's next modal (collapsed preview) */}
            <div className="bg-[#1e2740] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-3 border-b border-white/10">
                <h3 className="text-sm font-bold text-white">What's Next?</h3>
                <p className="text-xs text-white/40">Call ended — choose a next step</p>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#5BC8DC]/10 border border-[#5BC8DC]/20 text-center">
                  <Shield className="w-5 h-5 text-[#5BC8DC]" />
                  <span className="text-xs font-semibold text-[#5BC8DC]">Send VOB</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <SendHorizontal className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">Refer Out</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span className="text-xs font-semibold text-rose-400">Did Not Admit</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
