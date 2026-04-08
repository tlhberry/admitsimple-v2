import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import logo from "@assets/image_1775685707868.png";

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | AdmitSimple</title>
        <meta name="description" content="AdmitSimple Privacy Policy. How we collect, use, and protect your information and the protected health information of your patients." />
        <link rel="canonical" href="https://admitsimple.com/privacy" />
      </Helmet>

      <div className="min-h-screen bg-white">
        <header className="bg-[#2d3748] border-b border-white/10">
          <div className="container mx-auto px-4 md:px-6 pr-6 py-3 flex items-center justify-between">
            <Link href="/">
              <img src={logo} alt="AdmitSimple" className="h-9 w-auto" style={{ mixBlendMode: "screen" }} />
            </Link>
            <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
          </div>
        </header>

        <main className="py-16">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <div className="mb-10">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
              <p className="text-gray-500 text-sm">Last updated: April 2026</p>
            </div>

            <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">1. Overview</h2>
                <p>
                  AdmitSimple ("we," "us," or "our") operates a HIPAA-compliant admissions CRM for addiction treatment centers. This Privacy Policy describes how we collect, use, and safeguard information when you use our platform or visit our marketing website at admitsimple.com.
                </p>
                <p className="mt-3">
                  We are a Business Associate under HIPAA. Any protected health information (PHI) processed through the platform is governed by our Business Associate Agreement (BAA) with your facility, not solely by this policy.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
                <h3 className="text-base font-semibold text-gray-900 mb-2">Marketing Website</h3>
                <p>When you visit admitsimple.com, we may collect:</p>
                <ul className="list-disc ml-6 mt-2 space-y-1 text-sm">
                  <li>Name, email address, phone number, and facility name submitted through demo request or contact forms</li>
                  <li>Basic analytics data such as page views and referral source (no personal identifiers)</li>
                </ul>

                <h3 className="text-base font-semibold text-gray-900 mb-2 mt-5">Platform (SaaS Clients)</h3>
                <p>Within the AdmitSimple platform, we process data submitted by your facility's staff, which may include PHI. This data is processed solely under the terms of your BAA and applicable HIPAA regulations.</p>

                <h3 className="text-base font-semibold text-gray-900 mb-2 mt-5">Perpetual License Clients</h3>
                <p>For clients who have purchased a perpetual license and self-host on their own AWS infrastructure, AdmitSimple does not have access to any data stored in your environment.</p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
                <ul className="list-disc ml-6 space-y-2 text-sm">
                  <li>To respond to demo requests and sales inquiries</li>
                  <li>To provide and improve the AdmitSimple platform</li>
                  <li>To send product updates and relevant communications (you may opt out at any time)</li>
                  <li>To comply with legal obligations and enforce our agreements</li>
                </ul>
                <p className="mt-3">We do not sell, rent, or trade your personal information or PHI to any third party.</p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">4. Anthropic and AI Processing</h2>
                <p>
                  AdmitSimple integrates with Anthropic's Claude API to power AI features. Clients supply their own Anthropic API key. Data sent to Anthropic is governed by Anthropic's API Terms of Service and Privacy Policy. Anthropic does not use API inputs or outputs to train its models. Clients requiring a BAA with Anthropic should contact Anthropic's enterprise team directly.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Security</h2>
                <p>We implement industry-standard and HIPAA-required safeguards including:</p>
                <ul className="list-disc ml-6 mt-2 space-y-1 text-sm">
                  <li>AES-256 encryption at rest and TLS 1.3 in transit</li>
                  <li>AWS VPC isolation with no public database endpoints</li>
                  <li>Role-based access controls and audit logging for all PHI access</li>
                  <li>Automated backups with point-in-time recovery</li>
                  <li>Regular security assessments and dependency auditing</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">6. Data Retention</h2>
                <p>
                  Marketing inquiry data is retained for up to 24 months or until you request deletion. PHI within the platform is retained per your facility's policies and applicable state law. Upon contract termination, we will securely delete or return data as specified in the BAA.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">7. Your Rights</h2>
                <p>You may request to:</p>
                <ul className="list-disc ml-6 mt-2 space-y-1 text-sm">
                  <li>Access the personal information we hold about you</li>
                  <li>Correct inaccurate information</li>
                  <li>Delete your information (subject to legal retention requirements)</li>
                  <li>Opt out of marketing communications</li>
                </ul>
                <p className="mt-3">To exercise any of these rights, email <a href="mailto:austin@admitsimple.com" className="text-[#5BC8DC] font-medium">austin@admitsimple.com</a>.</p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">8. Cookies</h2>
                <p>
                  Our marketing website uses minimal cookies for session management. We do not use third-party advertising cookies or cross-site tracking. You may disable cookies in your browser settings without affecting core functionality.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">9. Changes to This Policy</h2>
                <p>
                  We may update this policy periodically. Material changes will be communicated to active clients via email at least 30 days before taking effect. Continued use of the platform after that period constitutes acceptance of the updated policy.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">10. Contact</h2>
                <p>
                  Privacy questions, complaints, or data requests should be directed to:<br />
                  <a href="mailto:austin@admitsimple.com" className="text-[#5BC8DC] font-medium">austin@admitsimple.com</a>
                </p>
              </section>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
