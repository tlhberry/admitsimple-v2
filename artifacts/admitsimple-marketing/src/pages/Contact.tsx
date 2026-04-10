import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, ArrowLeft } from "lucide-react";
import logo from "@assets/Gemini_Generated_Image_vx6hb5vx6hb5vx6h_1775863503290.png";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.querySelector("#name") as HTMLInputElement).value;
    const facility = (form.querySelector("#facility") as HTMLInputElement).value;
    const email = (form.querySelector("#email") as HTMLInputElement).value;
    const phone = (form.querySelector("#phone") as HTMLInputElement).value;
    const message = (form.querySelector("#message") as HTMLTextAreaElement).value;
    const body = `Name: ${name}\nFacility: ${facility}\nEmail: ${email}\nPhone: ${phone}\n\nMessage:\n${message}`;
    window.location.href = `mailto:austin@admitsimple.com?subject=Contact from ${name} at ${facility}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
  };

  return (
    <>
      <Helmet>
        <title>Contact AdmitSimple | HIPAA-Compliant Admissions CRM</title>
        <meta name="description" content="Get in touch with the AdmitSimple team. Questions about our HIPAA-compliant admissions CRM for addiction treatment centers, pricing, or deployment options." />
        <meta property="og:title" content="Contact AdmitSimple" />
        <meta property="og:description" content="Reach the AdmitSimple team for demos, pricing, and deployment questions." />
        <link rel="canonical" href="https://admitsimple.com/contact" />
      </Helmet>

      <div className="min-h-screen bg-[#f8fafc]">
        <header className="bg-[#2d3748] border-b border-white/10">
          <div className="container mx-auto px-4 md:px-6 pr-6 py-3 flex items-center justify-between">
            <Link href="/">
              <img src={logo} alt="AdmitSimple" className="h-9 w-auto" />
            </Link>
            <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
          </div>
        </header>

        <main className="py-20">
          <div className="container mx-auto px-4 md:px-6 max-w-5xl">
            <div className="text-center mb-14">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Get in Touch</h1>
              <p className="text-lg text-gray-600 max-w-xl mx-auto">
                Whether you have questions about the platform, pricing, or HIPAA compliance, our team responds within one business day.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Send a Message</h2>
                {submitted ? (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                    <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent</h3>
                    <p className="text-gray-600 text-sm">Your email client should have opened. We will be in touch shortly.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" required placeholder="Jane Smith" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="facility">Facility Name</Label>
                      <Input id="facility" required placeholder="Recovery Center of Texas" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Work Email</Label>
                      <Input id="email" type="email" required placeholder="jane@facility.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" type="tel" placeholder="(555) 000-0000" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea id="message" required placeholder="Tell us what you are looking for..." rows={4} className="resize-none" />
                    </div>
                    <Button type="submit" className="w-full bg-[#5BC8DC] text-[#1a2233] hover:bg-[#4ab5ca] h-12 font-semibold text-base">
                      Send Message
                    </Button>
                  </form>
                )}
              </div>

              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Direct Contact</h2>
                  <div className="space-y-4">
                    <a href="mailto:austin@admitsimple.com" className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-[#5BC8DC]/50 transition-colors group">
                      <div className="w-10 h-10 rounded-full bg-[#5BC8DC]/10 flex items-center justify-center text-[#5BC8DC] group-hover:bg-[#5BC8DC]/20 transition-colors flex-shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Email</p>
                        <p className="text-gray-900 font-semibold">austin@admitsimple.com</p>
                      </div>
                    </a>
                    <a href="tel:+1" className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-[#5BC8DC]/50 transition-colors group">
                      <div className="w-10 h-10 rounded-full bg-[#5BC8DC]/10 flex items-center justify-center text-[#5BC8DC] group-hover:bg-[#5BC8DC]/20 transition-colors flex-shrink-0">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Phone</p>
                        <p className="text-gray-900 font-semibold">Available upon request</p>
                      </div>
                    </a>
                  </div>
                </div>

                <div className="bg-[#2d3748] rounded-2xl p-6 text-white">
                  <h3 className="font-bold mb-2">Ready for a demo?</h3>
                  <p className="text-white/65 text-sm mb-4 leading-relaxed">
                    The fastest way to evaluate AdmitSimple is a live walkthrough. We will show you the pipeline, AI features, and how deployment works for your specific situation.
                  </p>
                  <Link href="/#demo">
                    <Button className="bg-[#5BC8DC] text-[#1a2233] hover:bg-[#4ab5ca] font-semibold w-full">
                      Request a Demo
                    </Button>
                  </Link>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                  <h3 className="font-bold text-gray-900 mb-2">Response Time</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    We respond to all inquiries within one business day. For compliance or legal questions, please mention that in your message so we can route it appropriately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
