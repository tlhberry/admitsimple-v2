import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CtaSection() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = e.currentTarget;
    const name = (form.querySelector("#name") as HTMLInputElement).value;
    const facility = (form.querySelector("#facility") as HTMLInputElement).value;
    const email = (form.querySelector("#email") as HTMLInputElement).value;
    const phone = (form.querySelector("#phone") as HTMLInputElement).value;
    const notes = (form.querySelector("#notes") as HTMLTextAreaElement).value;

    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, facility, email, phone, notes }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please email us at austin@admitsimple.com.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="demo" className="py-24 bg-white border-t border-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto bg-[#2d3748] rounded-3xl overflow-hidden shadow-2xl">
          <div className="grid md:grid-cols-2">
            <div className="p-10 md:p-12 text-white flex flex-col justify-center relative">
              <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to see it in action?</h2>
                <p className="text-white/70 mb-8">
                  Get a personalized walkthrough of AdmitSimple. See how the AI parsing works, explore the pipeline, and learn how to plug in your own Anthropic account.
                </p>
                <div className="space-y-4 text-sm text-white/80">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">&#x2713;</div>
                    <span>Full platform demonstration</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">&#x2713;</div>
                    <span>Discussion of your specific workflow</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">&#x2713;</div>
                    <span>Pricing and deployment options</span>
                  </div>
                </div>
                <p className="mt-8 text-xs text-white/40">
                  Or email us directly at austin@admitsimple.com
                </p>
              </div>
            </div>

            <div className="p-10 md:p-12 bg-white">
              {submitted ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Request Received!</h3>
                  <p className="text-gray-600 text-sm">We'll reach out to schedule your demo shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" required placeholder="John Doe" className="bg-gray-50 border-gray-200" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facility">Facility Name</Label>
                    <Input id="facility" required placeholder="Recovery Center" className="bg-gray-50 border-gray-200" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Work Email</Label>
                    <Input id="email" type="email" required placeholder="john@facility.com" className="bg-gray-50 border-gray-200" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" required placeholder="(555) 000-0000" className="bg-gray-50 border-gray-200" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Anything specific you would like to see?</Label>
                    <Textarea id="notes" placeholder="We are currently using..." className="bg-gray-50 border-gray-200 resize-none" rows={3} />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold"
                  >
                    {loading ? "Sending..." : "Request Demo"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
