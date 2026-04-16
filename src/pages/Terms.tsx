import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import React, { useEffect } from "react";

export function Terms() {
  useEffect(() => {
    document.title = "Terms of Service | Clean Path Credit";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative min-h-screen bg-white font-sans text-zinc-900">
      <Navbar />
      <main className="relative pt-32 pb-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="mb-2 font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
            Terms of Service
          </h1>
          <p className="mb-12 text-sm text-zinc-400">
            Clean Path Credit&trade; &mdash; Effective Date: April 16, 2026
          </p>

          <div className="prose prose-zinc max-w-none prose-headings:font-display prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-p:text-zinc-600 prose-p:leading-relaxed prose-li:text-zinc-600 prose-strong:text-zinc-900">

            <h2>1. Agreement to Terms</h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the Clean Path Credit Platform, including the website at CleanPathCredit.com, the funnel at form.cleanpathcredit.com, the Client Dashboard, and all related tools and resources.
            </p>
            <p>
              By accessing, using, or purchasing from this platform, you agree to be bound by these Terms. If you do not agree, do not use this platform.
            </p>

            <h2>2. Service Overview</h2>
            <p>Clean Path Credit provides a technology-driven credit correction system, including:</p>
            <ul>
              <li>AI-assisted credit analysis</li>
              <li>Strategically crafted challenge generation</li>
              <li>Credit tracking dashboard</li>
              <li>Educational resources, templates, and tools</li>
            </ul>
            <p><strong>Important:</strong> We are NOT a law firm, a credit bureau, a lender, or a credit reporting agency. Nothing provided constitutes legal advice.</p>

            <h2>3. No Guarantee of Results</h2>
            <p>
              While many users experience removals and score improvements, results are not guaranteed. Outcomes depend on the accuracy of reported data, creditor responses, and user compliance.
            </p>
            <p>
              Any examples, testimonials, or projections are illustrative only.
            </p>

            <h2>4. User Responsibilities</h2>
            <h3>4.1 Accurate Information</h3>
            <p>You agree to provide truthful, complete, and up-to-date information.</p>

            <h3>4.2 Credit Behavior Compliance</h3>
            <p>You agree NOT to:</p>
            <ul>
              <li>Apply for new credit during active correction cycles</li>
              <li>Contact creditors or bureaus independently without guidance</li>
              <li>Re-age, settle, or modify accounts under active correction</li>
              <li>Submit false or fraudulent claims</li>
            </ul>
            <p>Failure to comply may negatively impact results and void guarantees.</p>

            <h2>5. Account Creation &amp; Access</h2>
            <p>
              You may create an account via purchase or free signup. You are responsible for maintaining login security and all activity under your account. Clean Path Credit reserves the right to suspend or terminate accounts for violations.
            </p>

            <h2>6. Payment Terms</h2>
            <h3>6.1 Fees</h3>
            <p>All services, subscriptions, or system tiers must be paid in full or per agreed billing cycle.</p>

            <h3>6.2 No Chargebacks</h3>
            <p>You agree not to initiate chargebacks without first contacting support. Unauthorized chargebacks may result in immediate account termination and legal recovery actions.</p>

            <h3>6.3 Chargeback &amp; Payment Dispute Policy</h3>
            <p><strong>A. No Unauthorized Chargebacks.</strong> You agree not to initiate a chargeback, dispute, or reversal with your bank or payment provider without first contacting Clean Path Credit support and allowing a minimum of 10 business days to resolve the issue.</p>

            <p><strong>B. Evidence of Delivered Value.</strong> You acknowledge and agree that upon purchase, you are immediately granted access to a proprietary digital system, credit analysis tools, personalized strategy outputs, and digital resources, templates, and educational materials. This constitutes full or partial delivery of digital goods and services, which are non-returnable and non-revocable.</p>

            <p><strong>C. Waiver of &ldquo;Item Not Received&rdquo; Claims.</strong> By accessing the platform, logging in, or using any portion of the system, you waive the right to claim &ldquo;Item Not Received,&rdquo; &ldquo;Unauthorized Transaction&rdquo; (if purchase was completed by you or on your device), or &ldquo;Service Not Rendered.&rdquo;</p>

            <p><strong>D. Refund Policy Supersedes Chargebacks.</strong> You agree that any refund request must follow the official refund policy outlined in these Terms. Chargebacks filed in violation of this policy may result in immediate account termination, permanent ban from platform access, and submission of evidence to Stripe including IP logs, login activity, form submissions, signed agreements, and usage data.</p>

            <p><strong>E. Fraudulent Chargebacks.</strong> If a chargeback is determined to be fraudulent or abusive, Clean Path Credit reserves the right to pursue civil recovery of the disputed amount, recover associated fees, administrative costs, and damages, and report fraudulent activity to credit bureaus and financial institutions where permitted by law.</p>

            <p><strong>F. Collections &amp; Legal Recovery.</strong> Unpaid balances resulting from chargebacks may be sent to collections and reported as a delinquent obligation where legally permissible.</p>

            <p><strong>G. Agreement to Evidence Submission.</strong> You explicitly authorize Clean Path Credit to submit signed agreements, IP address logs, device/browser fingerprinting, and email/SMS communication history as evidence in any payment dispute.</p>

            <h2>7. Money-Back Guarantee</h2>
            <p>If applicable, the money-back guarantee applies only after completion of all 4 rounds, requires full user compliance, and applies only to eligible accounts. We reserve the right to deny refunds if instructions were not followed or if fraudulent or incomplete data was provided.</p>

            <h2>8. Intellectual Property</h2>
            <p>
              All content within the platform is owned by Clean Path Credit, including systems, templates, letters, dashboards, copy, and branding. You may NOT resell, copy, reproduce, or distribute any content without written consent.
            </p>

            <h2>9. Third-Party Services</h2>
            <p>
              We may integrate or use third-party tools, including Calendly, payment processors, analytics tools, and email systems. We are not responsible for third-party service failures.
            </p>

            <h2>10. Calendly Cookie Policy Disclosure</h2>
            <p>
              When scheduling appointments via Calendly, cookies and tracking technologies may be used. Data collected may include IP address, browser type, and usage behavior. By using scheduling features, you consent to Calendly&rsquo;s data collection practices and their cookie usage policies.
            </p>

            <h2>11. Privacy &amp; Data Use</h2>
            <p>
              We collect and process user data to deliver services, improve system performance, and communicate updates. We do NOT sell personal data. However, data may be shared with credit bureaus (through generated letters) and service providers necessary to operate the platform.
            </p>

            <h2>12. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Clean Path Credit shall NOT be liable for credit score changes, denials of credit, financial losses, emotional distress, or missed opportunities. Use of the platform is at your own risk.
            </p>

            <h2>13. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Clean Path Credit from claims arising from your misuse, false submissions, or violations of these Terms.
            </p>

            <h2>14. Dispute Resolution &amp; Arbitration</h2>
            <h3>14.1 Binding Arbitration</h3>
            <p>All disputes shall be resolved through binding arbitration, not court.</p>
            <h3>14.2 Jurisdiction</h3>
            <p>Governing law: State of Texas.</p>
            <h3>14.3 No Class Actions</h3>
            <p>You agree to resolve disputes individually.</p>

            <h2>15. Termination</h2>
            <p>
              We may terminate access if Terms are violated, fraud is suspected, or abuse of system occurs. No refunds will be issued in such cases.
            </p>

            <h2>16. Modifications to Terms</h2>
            <p>
              We may update these Terms at any time. Continued use of the platform constitutes acceptance of updates.
            </p>

            <h2>17. Digital Product Delivery &amp; Access Logging</h2>
            <p>You acknowledge that delivery is considered complete upon account creation, dashboard access, or viewing the results page. Clean Path Credit logs login timestamps, IP addresses, user actions, and page views. These logs may be used as legal proof of service delivery.</p>

            <h2>18. Electronic Consent &amp; Signature Agreement (ESIGN Act)</h2>
            <p>
              By using this platform, you consent to electronic records, digital agreements, and electronic signatures. This agreement is legally binding under the U.S. ESIGN Act and the Uniform Electronic Transactions Act (UETA).
            </p>

            <h2>19. Credit Repair Organizations Act (CROA) Disclosure</h2>
            <p>You acknowledge that:</p>
            <ul>
              <li>You have the right to dispute inaccurate information yourself at no cost</li>
              <li>Clean Path Credit does not guarantee specific results</li>
              <li>You may cancel services within 3 business days where applicable</li>
            </ul>

            <h2>20. User Misuse &amp; Interference</h2>
            <p>You agree NOT to:</p>
            <ul>
              <li>Send duplicate disputes outside the system</li>
              <li>Contact bureaus in a way that interferes with strategy</li>
              <li>Upload false documents</li>
              <li>Attempt to reverse valid removals</li>
            </ul>
            <p>Violation may result in termination and loss of guarantee eligibility.</p>

            <h2>21. Force Majeure</h2>
            <p>
              We are not liable for delays or failures caused by credit bureau system outages, government actions, mail delays, or third-party disruptions.
            </p>

            <h2>22. No Professional Advice Disclaimer</h2>
            <p>
              Clean Path Credit provides educational tools, automated systems, and general guidance. It does NOT provide legal advice or financial advisory services.
            </p>

            <h2>23. Contact Information</h2>
            <p>
              Clean Path Credit<br />
              Email: <a href="mailto:support@cleanpathcredit.com" className="text-emerald-600 hover:underline">support@cleanpathcredit.com</a><br />
              Website: <a href="https://cleanpathcredit.com" className="text-emerald-600 hover:underline">CleanPathCredit.com</a>
            </p>

            <h2>24. Acceptance of Terms</h2>
            <p>
              By using this platform, you acknowledge that you have read, understand, and agree to these Terms.
            </p>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
