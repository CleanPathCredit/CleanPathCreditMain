import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import React, { useEffect } from "react";

export function Privacy() {
  useEffect(() => {
    document.title = "Privacy Policy | Clean Path Credit";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative min-h-screen bg-white font-sans text-zinc-900">
      <Navbar />
      <main className="relative pt-32 pb-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="mb-2 font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
            Privacy Policy
          </h1>
          <p className="mb-12 text-sm text-zinc-400">
            Clean Path Credit&trade; &mdash; Effective Date: April 16, 2026
          </p>

          <div className="prose prose-zinc max-w-none prose-headings:font-display prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-p:text-zinc-600 prose-p:leading-relaxed prose-li:text-zinc-600 prose-strong:text-zinc-900">

            <h2>1. Introduction</h2>
            <p>
              Clean Path Credit (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) respects your privacy and is committed to protecting your personal information.
            </p>
            <p>
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit CleanPathCredit.com, form.cleanpathcredit.com, and any related dashboard, tools, or services (the &ldquo;Platform&rdquo;).
            </p>
            <p>By using the Platform, you agree to the practices described in this policy.</p>

            <h2>2. Information We Collect</h2>

            <h3>2.1 Personal Information</h3>
            <p>You may provide:</p>
            <ul>
              <li>Full name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Billing details (processed securely via third parties)</li>
              <li>Credit-related and financial information</li>
            </ul>

            <h3>2.2 Automatically Collected Information</h3>
            <p>We may collect:</p>
            <ul>
              <li>IP address</li>
              <li>Device and browser type</li>
              <li>Pages visited</li>
              <li>Session duration</li>
              <li>Interaction behavior</li>
            </ul>

            <h3>2.3 Sensitive Financial Data</h3>
            <p>
              We recognize that certain information you provide may be highly sensitive, including credit report details, account histories, and financial obligations.
            </p>
            <p>
              While Clean Path Credit is not a healthcare provider and is not subject to HIPAA, we apply high-standard data protection principles where possible, including:
            </p>
            <ul>
              <li>Minimization of data collection</li>
              <li>Restricted internal access</li>
              <li>Secure storage practices</li>
              <li>Use limitation strictly for service delivery</li>
            </ul>
            <p>Your data is handled with a high level of confidentiality and care.</p>

            <h2>3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide access to the Clean Path Credit platform</li>
              <li>Generate personalized credit strategies</li>
              <li>Deliver dashboards, tools, and recommendations</li>
              <li>Communicate updates, alerts, and support</li>
              <li>Improve system functionality and performance</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>

            <h2>4. AI Usage Disclosure</h2>
            <p>Clean Path Credit uses artificial intelligence (AI) and automated systems to:</p>
            <ul>
              <li>Analyze user-provided data</li>
              <li>Generate credit strategy recommendations</li>
              <li>Assist in preparing challenges and outputs</li>
            </ul>
            <p>By using the Platform, you acknowledge:</p>
            <ul>
              <li>AI-generated outputs are assistance tools, not guarantees</li>
              <li>Outputs may require human review and judgment</li>
              <li>AI systems are continuously improving but may not be error-free</li>
            </ul>
            <p>We do not use your personal data to train external AI models without appropriate safeguards.</p>

            <h2>5. How We Share Your Information</h2>
            <p><strong>We do NOT sell your personal information.</strong></p>
            <p>We may share data with trusted third parties, including:</p>
            <ul>
              <li>Stripe (payment processing)</li>
              <li>Calendly (scheduling)</li>
              <li>Hosting, analytics, and communication providers</li>
            </ul>
            <p>We may also disclose information when required by law, to enforce our Terms, or to protect our rights, users, or platform integrity.</p>

            <h2>6. Cookie Policy</h2>

            <h3>6.1 What Are Cookies</h3>
            <p>Cookies are small data files stored on your device that help improve your experience.</p>

            <h3>6.2 How We Use Cookies</h3>
            <p>We use cookies to:</p>
            <ul>
              <li>Enable core functionality (login, sessions)</li>
              <li>Analyze traffic and performance</li>
              <li>Track conversions and marketing effectiveness</li>
              <li>Improve user experience</li>
            </ul>

            <h3>6.3 Third-Party Cookies</h3>
            <p>Third-party tools may place cookies, including Calendly (scheduling), analytics platforms, and advertising tools. These third parties have their own privacy policies.</p>

            <h3>6.4 Managing Cookies</h3>
            <p>You may control cookies through your browser settings. Disabling cookies may affect functionality.</p>

            <h2>7. Do Not Track (DNT) Disclosure</h2>
            <p>
              Some browsers offer a &ldquo;Do Not Track&rdquo; (DNT) feature. Currently, there is no universal standard for DNT signals and our Platform may not respond to DNT settings. You may still control tracking through browser settings and cookie preferences.
            </p>

            <h2>8. Data Security</h2>
            <p>We implement reasonable safeguards, including:</p>
            <ul>
              <li>Encrypted connections (SSL)</li>
              <li>Secure servers</li>
              <li>Access controls</li>
            </ul>
            <p>However, no system is completely secure.</p>

            <h2>9. Data Breach Response</h2>
            <p>In the event of a data breach that affects your personal information, we will:</p>
            <ul>
              <li>Investigate and contain the issue promptly</li>
              <li>Notify affected users where required by law</li>
              <li>Take corrective action to prevent recurrence</li>
            </ul>
            <p>We are committed to transparency and responsible response.</p>

            <h2>10. Data Retention</h2>
            <p>We retain data only as long as necessary to:</p>
            <ul>
              <li>Provide services</li>
              <li>Comply with legal obligations</li>
              <li>Resolve disputes</li>
              <li>Enforce agreements</li>
            </ul>

            <h2>11. Your Rights</h2>
            <p>You may have the right to:</p>
            <ul>
              <li>Access your data</li>
              <li>Request corrections</li>
              <li>Request deletion</li>
              <li>Opt out of communications</li>
            </ul>
            <p>
              Contact: <a href="mailto:support@cleanpathcredit.com" className="text-emerald-600 hover:underline">support@cleanpathcredit.com</a>
            </p>

            <h2>12. California Privacy Rights (CCPA/CPRA)</h2>
            <p>California residents may:</p>
            <ul>
              <li>Request disclosure of collected data</li>
              <li>Request deletion</li>
              <li>Opt out of data sharing (we do not sell data)</li>
            </ul>
            <p>We will not discriminate against users exercising these rights.</p>

            <h2>13. Third-Party Links</h2>
            <p>We are not responsible for external websites or their privacy practices.</p>

            <h2>14. Children&rsquo;s Privacy</h2>
            <p>This Platform is not intended for individuals under 18.</p>

            <h2>15. Electronic Communications Consent</h2>
            <p>You agree to receive emails, SMS notifications, and platform alerts. You may opt out at any time.</p>

            <h2>16. Data Accuracy &amp; User Responsibility</h2>
            <p>You are responsible for providing accurate information.</p>

            <h2>17. Changes to This Policy</h2>
            <p>We may update this policy at any time. Continued use constitutes acceptance of updates.</p>

            <h2>18. Contact Information</h2>
            <p>
              Clean Path Credit<br />
              Email: <a href="mailto:support@cleanpathcredit.com" className="text-emerald-600 hover:underline">support@cleanpathcredit.com</a><br />
              Website: <a href="https://cleanpathcredit.com" className="text-emerald-600 hover:underline">CleanPathCredit.com</a>
            </p>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
