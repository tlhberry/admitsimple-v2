import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import logo from "@assets/admit_logo_no_padding_1775684615367.png";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#2d3748]/95 backdrop-blur border-b border-white/10">
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="overflow-hidden flex items-center justify-center" style={{ width: 300, height: 56 }}>
            <img src={logo} alt="AdmitSimple" style={{ mixBlendMode: "screen", transform: "scale(2.2)", transformOrigin: "45% center", width: 300 }} />
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/80">
          <a href="#pipeline" className="hover:text-primary transition-colors">Pipeline</a>
          <a href="#ai" className="hover:text-primary transition-colors">AI Features</a>
          <a href="#security" className="hover:text-primary transition-colors">Security</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-4">
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20">
            <a href="#demo">Request a Demo</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
