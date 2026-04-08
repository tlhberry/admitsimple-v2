import { motion } from "framer-motion";
import { Phone, MessageSquare, FileText, Calendar, CheckCircle, XCircle, ClipboardList, Stethoscope } from "lucide-react";

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

const stageColors = [
  "bg-blue-500", "bg-indigo-500", "bg-yellow-500", "bg-orange-500",
  "bg-teal-500", "bg-green-500", "bg-emerald-600", "bg-gray-400"
];

const stageIcons = [Phone, MessageSquare, FileText, Stethoscope, Calendar, CheckCircle, ClipboardList, XCircle];

const kanbanColumns = [
  { label: "New Inquiry", color: "border-blue-400", dot: "bg-blue-400", cards: ["Marcus T.", "Lisa K.", "Ray D."] },
  { label: "Pre-Assessment", color: "border-orange-400", dot: "bg-orange-400", cards: ["Sarah L.", "Tom P."] },
  { label: "Scheduled", color: "border-teal-400", dot: "bg-teal-400", cards: ["Anna M."] },
  { label: "Admitted", color: "border-green-400", dot: "bg-green-400", cards: ["David R.", "Kim S."] },
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

            <div className="space-y-2">
              {stages.map((stage, i) => {
                const Icon = stageIcons[i];
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full ${stageColors[i]} flex items-center justify-center`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-gray-900 text-sm">{stage.name}</span>
                      <span className="text-gray-400 text-xs ml-2">— {stage.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Coded Kanban mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[#5BC8DC]/8 to-transparent rounded-2xl transform rotate-2 pointer-events-none" />
            <div className="relative rounded-2xl border border-gray-200 shadow-2xl bg-[#f8fafc] overflow-hidden">
              {/* App bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#1e2535] border-b border-white/10">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                <span className="ml-3 text-[11px] text-white/40 font-mono">Admissions Pipeline — Kanban View</span>
              </div>

              {/* Kanban board */}
              <div className="p-4 grid grid-cols-2 gap-3">
                {kanbanColumns.map((col, ci) => (
                  <motion.div
                    key={col.label}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: ci * 0.1 }}
                    className={`rounded-xl border-t-2 ${col.color} bg-white shadow-sm p-3`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">{col.label}</span>
                      </div>
                      <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{col.cards.length}</span>
                    </div>
                    <div className="space-y-2">
                      {col.cards.map((name, ni) => (
                        <motion.div
                          key={name}
                          initial={{ opacity: 0, x: 6 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: ci * 0.1 + ni * 0.07 }}
                          className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 flex items-center gap-2"
                        >
                          <div className="w-6 h-6 rounded-full bg-[#5BC8DC]/15 flex items-center justify-center flex-shrink-0">
                            <span className="text-[9px] font-bold text-[#5BC8DC]">{name.split(" ").map(n => n[0]).join("")}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-gray-800 truncate">{name}</p>
                            <div className="h-1.5 bg-gray-200 rounded-full mt-1 w-3/4" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Stats bar */}
              <div className="px-4 pb-4 grid grid-cols-3 gap-3">
                {[["8", "Active Stages"], ["24", "Open Inquiries"], ["92%", "Contact Rate"]].map(([val, label]) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                    <p className="text-lg font-bold text-[#5BC8DC]">{val}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
