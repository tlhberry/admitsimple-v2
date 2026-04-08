import { Link } from "wouter";
import logo from "@assets/admit_logo_no_padding_1775684615367.png";

export default function Footer() {
  return (
    <footer className="bg-[#2d3748] text-white py-12 border-t border-white/10">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2">
            <div className="overflow-hidden flex items-center justify-center mb-4" style={{ width: 190, height: 36, marginLeft: 0, justifyContent: "flex-start" }}>
              <img src={logo} alt="AdmitSimple" style={{ mixBlendMode: "screen", transform: "scale(1.4)", transformOrigin: "45% center", width: 190 }} />
            </div>
            <p className="text-white/60 max-w-xs text-sm">
              The HIPAA-compliant Admissions CRM for addiction treatment centers, powered by Claude.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-white">Product</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><a href="#pipeline" className="hover:text-primary transition-colors">Pipeline</a></li>
              <li><a href="#ai" className="hover:text-primary transition-colors">AI Features</a></li>
              <li><a href="#security" className="hover:text-primary transition-colors">Security</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-white">Company</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/10 text-center md:text-left text-sm text-white/40 flex flex-col md:flex-row justify-between items-center">
          <p>© {new Date().getFullYear()} AdmitSimple. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Built for Treatment Centers</p>
        </div>
      </div>
    </footer>
  );
}
