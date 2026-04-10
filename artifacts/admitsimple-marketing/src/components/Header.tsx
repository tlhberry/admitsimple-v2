import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import logo from "@assets/Untitled_1775863851436.png";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#2d3748]/95 backdrop-blur border-b border-white/10">
      <div className="container mx-auto px-4 md:px-6 pr-6 md:pr-8 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex-shrink-0">
          <img
            src={logo}
            alt="AdmitSimple"
            className="h-20 md:h-24 w-auto"
            style={{ mixBlendMode: "screen" }}
          />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/80">
          <a href="#pipeline" className="hover:text-primary transition-colors">Pipeline</a>
          <a href="#ai" className="hover:text-primary transition-colors">AI Features</a>
          <a href="#security" className="hover:text-primary transition-colors">Security</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent font-medium text-sm h-9 px-3 md:px-4">
            <a href="/login">Log In</a>
          </Button>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20 text-sm h-9 px-3 md:px-4">
            <a href="#demo">Request a Demo</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
