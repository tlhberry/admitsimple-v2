import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import logo from "@assets/image_1775685931239.png";

export default function TermsOfService() {
  return (
    <>
      <Helmet>
        <title>Terms of Service | AdmitSimple</title>
        <meta name="description" content="AdmitSimple Terms of Service. The terms governing your use of the AdmitSimple admissions CRM platform and related services." />
        <link rel="canonical" href="https://admitsimple.com/terms" />
      </Helmet>

      <div className="min-h-screen bg-white">
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

        <main className="py-16">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <div className="mb-10">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">Terms of Service</h1>
              <p className="text-gray-500 text-sm">Last updated: April 2026</p>
            </div>

            <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
                <p>
                  By accessing or using AdmitSimple ("Service"), you agree to be bound by these Terms of Service. If you are using the Service on behalf of a facility or organization, you represent that you have authority to bind that entity to these terms. If you do not agree, do not use the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">2. Description of Service</h2>
                <p>
                  AdmitSimple provides a HIPAA-compliant admissions CRM platform for addiction treatment centers. The Service includes an 8-stage admissions pipeline, AI-assisted workflow tools powered by Anthropic's Claude API, communication tools (SMS, voice, chat), and reporting features.
                </p>
                <p className="mt-3">
                  AdmitSimple is offered in two models: a monthly SaaS subscription and a perpetual license for self-hosted AWS deployment. Features and terms may differ between models as specified in your order form or agreement.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">3. HIPAA Compliance and BAA</h2>
                <p>
                  AdmitSimple operates as a Business Associate under HIPAA. All SaaS clients must execute a Business Associate Agreement (BAA) before processing any protected health information (PHI) through the Service. Use of the Service to process PHI without a signed BAA is a material breach of these Terms.
                </p>
                <p className="mt-3">
                  Perpetual license clients are responsible for maintaining HIPAA compliance within their own AWS environment. AdmitSimple provides deployment documentation and a BAA template but does not manage perpetual license infrastructure.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">4. Client Responsibilities</h2>
                <p>You are responsible for:</p>
                <ul className="list-disc ml-6 mt-2 space-y-2 text-sm">
                  <li>Maintaining accurate account credentials and restricting access to authorized personnel</li>
                  <li>Ensuring your use of the Service complies with all applicable laws, including HIPAA, 42 CFR Part 2, and applicable state regulations</li>
                  <li>Obtaining appropriate patient authorizations before inputting PHI</li>
                  <li>Providing and maintaining your own Anthropic API key for AI features, and agreeing to Anthropic's terms of service</li>
                  <li>Configuring Twilio credentials for SMS and voice features</li>
                  <li>Providing accurate and complete information when creating your account</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">5. Prohibited Uses</h2>
                <p>You may not use AdmitSimple to:</p>
                <ul className="list-disc ml-6 mt-2 space-y-2 text-sm">
                  <li>Process PHI without a signed BAA in effect</li>
                  <li>Access or attempt to access another client's data</li>
                  <li>Reverse engineer, decompile, or create derivative works from the platform</li>
                  <li>Resell or sublicense access to the Service without written authorization</li>
                  <li>Use the Service in any manner that violates applicable law</li>
                  <li>Submit false or misleading information</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">6. Fees and Payment</h2>
                <p>
                  SaaS subscription fees are billed monthly or annually as specified in your order form. Perpetual license fees are due in full at execution. All fees are non-refundable except as expressly stated in your agreement.
                </p>
                <p className="mt-3">
                  Third-party costs such as Anthropic API usage, Twilio SMS and voice charges, and AWS infrastructure fees are your sole responsibility and are billed directly by those providers.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">7. Intellectual Property</h2>
                <p>
                  AdmitSimple and its underlying source code, design, and documentation are proprietary to AdmitSimple. SaaS clients receive a limited, non-exclusive, non-transferable license to use the Service during their subscription term. Perpetual license clients receive a non-exclusive, perpetual license to deploy and operate the codebase within their own infrastructure.
                </p>
                <p className="mt-3">
                  Your facility retains all ownership rights to patient data and content you input into the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">8. Uptime and Support</h2>
                <p>
                  AdmitSimple targets 99.5% monthly uptime for SaaS clients. Scheduled maintenance windows will be communicated at least 24 hours in advance when possible. Perpetual license clients are responsible for their own infrastructure uptime. Support terms are defined in your service agreement.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">9. Limitation of Liability</h2>
                <p>
                  To the maximum extent permitted by law, AdmitSimple's total liability for any claim arising from these Terms or use of the Service shall not exceed the fees paid by you in the three months preceding the claim. AdmitSimple is not liable for indirect, incidental, special, or consequential damages, including loss of revenue or data.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">10. Termination</h2>
                <p>
                  Either party may terminate a SaaS subscription with 30 days written notice. AdmitSimple may terminate immediately for material breach, including non-payment or unauthorized use. Upon termination, your access to the Service will cease and we will securely handle data per the BAA and your data retention instructions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">11. Governing Law</h2>
                <p>
                  These Terms are governed by the laws of the State of Texas, without regard to conflict of law principles. Any disputes will be resolved in the state or federal courts located in Travis County, Texas.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">12. Contact</h2>
                <p>
                  Legal or terms-related questions:<br />
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
