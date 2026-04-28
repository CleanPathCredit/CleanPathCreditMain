import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import React, { useEffect } from "react";

/**
 * Terms of Service.
 *
 * MAINTENANCE NOTES — read before editing
 *
 *  - Credit-repair-adjacent businesses are regulated by CROA (15 USC §1679),
 *    the FTC's Telemarketing Sales Rule §310.4(a)(2), Texas Finance Code
 *    §393 (CSO statute), and FTC truth-in-advertising. Aggressive copy
 *    here can trigger CFPB / FTC / state-AG enforcement.
 *  - The CROA 3-day cancellation language in §18 is **verbatim from
 *    statute** — do not paraphrase. Any change is a CROA violation.
 *  - This document has NOT been reviewed by a Texas-licensed attorney.
 *    Get one before scaling traffic. The placeholder TODO in §15 marks
 *    the arbitration clause that should be reviewed first (consumer-
 *    contract arbitration is enforceable but state-by-state limitations
 *    exist).
 *  - Per-round-after-completion billing is the structural compliance
 *    move. Don't quietly switch this back to upfront billing without
 *    re-evaluating CROA §404(b) + TSR §310.4(a)(2) exposure.
 */
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
            Clean Path Credit&trade; &mdash; Effective Date: April 28, 2026
          </p>

          <div className="prose prose-zinc max-w-none prose-headings:font-display prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-p:text-zinc-600 prose-p:leading-relaxed prose-li:text-zinc-600 prose-strong:text-zinc-900">

            <h2>1. Agreement to Terms</h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the Clean Path Credit platform, including the website at CleanPathCredit.com, the funnel at form.cleanpathcredit.com, the Client Dashboard, and all related tools, systems, and resources (collectively, the &ldquo;Platform&rdquo;).
            </p>
            <p>
              By accessing, using, or purchasing from this Platform, you agree to be bound by these Terms. If you do not agree, do not use the Platform.
            </p>

            <h2>2. Service Overview</h2>
            <p>Clean Path Credit provides a structured credit-improvement service that may include:</p>
            <ul>
              <li>AI-assisted identification of potentially inaccurate or unverifiable items on your credit reports</li>
              <li>FCRA-grounded dispute guidance and templates</li>
              <li>Submission handling for items the user authorizes for dispute</li>
              <li>Credit tracking dashboard and progress tools</li>
              <li>Educational materials, templates, and workflows</li>
            </ul>
            <p><strong>Important:</strong></p>
            <ul>
              <li>Clean Path Credit is <strong>not</strong> a law firm, credit bureau, lender, or credit reporting agency.</li>
              <li>Clean Path Credit does <strong>not</strong> provide legal or financial advice.</li>
              <li>All disputes are based on information you provide and authorize. You retain control over your credit profile at all times.</li>
            </ul>

            <h2>3. No Guarantee of Results</h2>
            <p>
              Results are <strong>not guaranteed</strong>. Outcomes depend on factors outside our control, including the accuracy of information reported by third parties, creditor and bureau responses, the age of the items in question, and your continued participation.
            </p>
            <p>
              Any testimonials, projections, examples, or before/after illustrations are for educational purposes only and are not predictions of the results you will achieve. <strong>Clean Path Credit does not promise any specific score increase, item removal, approval outcome, or interest-rate savings.</strong>
            </p>

            <h2>4. User Responsibilities</h2>
            <h3>4.1 Accurate Information</h3>
            <p>You agree to provide truthful, complete, and up-to-date information.</p>

            <h3>4.2 Good-Faith Use</h3>
            <p>
              All credit-related actions you authorize through the Platform must be based on a <strong>good-faith belief</strong> that the information being challenged is inaccurate, incomplete, outdated, or unverifiable. Clean Path Credit does not support, condone, or assist with the submission of false, misleading, or fraudulent disputes. Submitting a false dispute may constitute a violation of federal law and is grounds for immediate termination of service.
            </p>

            <h3>4.3 Workflow Compliance</h3>
            <p>For best results, we recommend that you:</p>
            <ul>
              <li>Avoid applying for new credit during active dispute rounds (new inquiries can complicate scoring)</li>
              <li>Coordinate with us before independently contacting creditors or bureaus about active items</li>
              <li>Tell us if you re-age, settle, or modify any account that&rsquo;s being challenged</li>
            </ul>
            <p>Failure to follow these recommendations may impact your results but does not change your rights under these Terms.</p>

            <h2>5. User-Controlled Actions</h2>
            <p>
              All disputes and credit-profile changes are initiated and authorized by you, the user. Clean Path Credit acts at your direction; we do not access, modify, or directly interact with your credit file outside of items you have specifically authorized us to challenge on your behalf.
            </p>

            <h2>6. Account Creation &amp; Access</h2>
            <p>
              You may create an account via free signup or paid enrollment. You are responsible for maintaining your login credentials and for all activity under your account. We reserve the right to suspend or terminate accounts for violations of these Terms.
            </p>

            <h2>7. Payment Terms</h2>
            <h3>7.1 Per-Round Billing</h3>
            <p>
              Paid plans are billed on a per-round, after-completion basis. You are charged for each dispute round only after the work for that round has been completed and submitted on your behalf. You may cancel future rounds at any time before that round&rsquo;s work has begun.
            </p>
            <h3>7.2 Initial Analysis Fee</h3>
            <p>
              Some plans include a one-time analysis and onboarding fee charged at signup. This fee covers the initial credit analysis, strategy planning, and onboarding work performed before any dispute round begins. This fee is for analysis and onboarding services already performed and is non-refundable once those services are delivered.
            </p>
            <h3>7.3 Digital Product Delivery</h3>
            <p>
              Upon payment, you are immediately granted access to the Platform, your credit analysis outputs, the Client Dashboard, tools, templates, and resources purchased. Delivery is considered complete upon account creation and dashboard access. Digital products are non-returnable and non-revocable once accessed.
            </p>

            <h2>8. Refund &amp; Cancellation Policy</h2>
            <p>
              <strong>You may cancel at any time.</strong> Cancellation stops billing for any round whose work has not yet begun. Per-round fees for rounds already completed are not refundable, because the work has been performed.
            </p>
            <p>
              Refund requests must follow the official policy and review process. We are unable to issue refunds where instructions were not followed, where information provided was incomplete or fraudulent, or where the requested service has already been performed.
            </p>
            <p>
              See &sect;18 below for the federally-required CROA 3-business-day cancellation right.
            </p>

            <h2>9. Payment Disputes &amp; Chargebacks</h2>
            <p>
              <strong>A. Contact us first.</strong> If you have a billing concern, contact Clean Path Credit support and allow at least 10 business days for resolution before initiating a chargeback or payment dispute with your bank or card issuer.
            </p>
            <p>
              <strong>B. Evidence of delivered value.</strong> Upon purchase, you receive immediate access to a digital system, credit analysis outputs, the Client Dashboard, tools, templates, and educational resources. This constitutes delivery of digital goods and services.
            </p>
            <p>
              <strong>C. Evidence submission.</strong> You authorize Clean Path Credit to submit evidence of service delivery in response to any payment dispute, including: signed agreements, login timestamps, IP address logs, device and browser data, page views, form submissions, document uploads, generated reports, and email/SMS communication history.
            </p>
            <p>
              <strong>D. Account consequences for fraudulent or abusive disputes.</strong> Disputes determined by your card issuer or bank to be fraudulent or abusive may result in immediate account termination, loss of platform access, and recovery actions where permitted by law (including referral to collections for unpaid balances and recovery of administrative costs and fees).
            </p>
            <p>
              <strong>E. Your statutory rights remain.</strong> Nothing in this section limits your rights under the Fair Credit Billing Act, your card-network rules, applicable consumer-protection law, or any non-waivable statutory right.
            </p>

            <h2>10. Intellectual Property</h2>
            <p>
              All Platform content is owned by Clean Path Credit, including systems, templates, letters, dashboards, copy, and branding. You may not copy, reproduce, distribute, or resell any content without prior written consent.
            </p>

            <h2>11. Third-Party Services</h2>
            <p>
              We may integrate or use third-party tools, including Calendly, payment processors, analytics tools, and email systems. We are not responsible for failures, outages, or actions of third-party providers.
            </p>

            <h2>12. Calendly Cookie Policy Disclosure</h2>
            <p>
              When scheduling appointments via Calendly, cookies and tracking technologies may be used. Data collected may include IP address, browser type, and usage behavior. By using scheduling features, you consent to Calendly&rsquo;s data collection practices and their cookie usage policies.
            </p>

            <h2>13. Privacy &amp; Data Use</h2>
            <p>
              We collect and process user data to deliver services, improve system performance, and communicate updates. We do not sell personal data. Data may be shared with service providers necessary to operate the Platform, and with credit bureaus in the form of dispute submissions you have specifically authorized. See our Privacy Policy for full detail.
            </p>

            <h2>14. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Clean Path Credit shall not be liable for credit score changes, denials of credit, financial losses, emotional distress, or missed opportunities arising from your use of the Platform. Use of the Platform is at your own risk.
            </p>

            <h2>15. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Clean Path Credit from claims arising from your misuse of the Platform, false submissions, or violations of these Terms.
            </p>

            <h2>16. Dispute Resolution &amp; Arbitration</h2>
            <h3>16.1 Binding Arbitration</h3>
            <p>
              Most disputes between you and Clean Path Credit will be resolved through binding individual arbitration, not in court. Arbitration is conducted under the rules of the American Arbitration Association (AAA). The arbitrator&rsquo;s decision is final and may be entered as a judgment in any court of competent jurisdiction.
            </p>
            <h3>16.2 Small-Claims Carve-Out</h3>
            <p>
              You may bring an individual action in small-claims court for any dispute that qualifies under that court&rsquo;s rules.
            </p>
            <h3>16.3 Governing Law</h3>
            <p>These Terms are governed by the laws of the State of Texas, without regard to conflict-of-law rules.</p>
            <h3>16.4 No Class Actions</h3>
            <p>You agree to resolve disputes individually. Class actions, class arbitrations, and representative actions are not permitted.</p>

            <h2>17. Termination</h2>
            <p>
              We may suspend or terminate access for material violations of these Terms, suspected fraud, or abuse of the system. Per-round fees already collected for completed rounds are not refundable in cases of for-cause termination.
            </p>

            <h2>18. Credit Repair Organizations Act (CROA) Disclosure</h2>
            <p>You acknowledge and agree that:</p>
            <ul>
              <li>You have the right to dispute inaccurate information on your credit report yourself, at no cost, by contacting the credit bureaus directly.</li>
              <li>Clean Path Credit does not promise or guarantee any specific score change, item removal, approval outcome, or other result.</li>
            </ul>
            <p>
              <strong>You may cancel this contract without penalty or obligation at any time before midnight of the third business day after the date on which you signed the contract.</strong> To cancel, send written notice to support@cleanpathcredit.com or use any other reasonable means of communication that clearly indicates your intent to cancel.
            </p>

            <h2>19. Modifications</h2>
            <p>
              We may update these Terms at any time. Material changes will be communicated by email or in-app notice. Continued use of the Platform after a change constitutes acceptance of the updated Terms.
            </p>

            <h2>20. Force Majeure</h2>
            <p>
              We are not liable for delays or failures caused by credit bureau system outages, government actions, mail delays, or third-party disruptions outside our reasonable control.
            </p>

            <h2>21. Digital Product Delivery &amp; Access Logging</h2>
            <p>
              You acknowledge that delivery is considered complete upon account creation, dashboard access, or viewing the analysis outputs. Clean Path Credit logs login timestamps, IP addresses, user actions, and page views. These logs may be used as evidence of service delivery.
            </p>

            <h2>22. Electronic Consent &amp; Signature Agreement (ESIGN Act)</h2>
            <p>
              By using this Platform, you consent to the use of electronic records, digital agreements, and electronic signatures. This agreement is legally binding under the U.S. ESIGN Act and the Uniform Electronic Transactions Act (UETA).
            </p>

            <h2>23. No Professional Advice</h2>
            <p>
              The Platform provides educational tools, automated systems, and general guidance only. Nothing on the Platform constitutes legal, financial, tax, or professional advice. For advice specific to your situation, consult a qualified professional.
            </p>

            <h2>24. AI Disclosure</h2>
            <p>
              The Platform uses artificial-intelligence tools to assist with credit analysis, item identification, and content generation. AI outputs are assistance tools and are reviewed by humans before any action is taken on your behalf, but they are not infallible. AI outputs do not constitute professional advice and may contain errors.
            </p>

            <h2>25. Contact Information</h2>
            <p>
              Clean Path Credit<br />
              Email: <a href="mailto:support@cleanpathcredit.com" className="text-emerald-600 hover:underline">support@cleanpathcredit.com</a><br />
              Website: <a href="https://cleanpathcredit.com" className="text-emerald-600 hover:underline">CleanPathCredit.com</a>
            </p>

            <h2>26. Acceptance of Terms</h2>
            <p>
              By using this Platform, you acknowledge that you have read, understand, and agree to these Terms.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
