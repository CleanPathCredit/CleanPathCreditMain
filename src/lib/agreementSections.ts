import type { Plan } from "@/types/database";

export const AGREEMENT_VERSION = "2026-04-16-v1";

export const PLAN_PRICES: Record<Plan, string> = {
  free: "$0",
  diy: "$97",
  standard: "$497",
  premium: "$2,497",
};

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  diy: "DIY Blueprint",
  standard: "Credit Correction System",
  premium: "Executive System",
};

export type Block =
  | { type: "p"; text: string }
  | { type: "bold"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "numbered"; items: string[] };

export interface Section {
  title: string;
  blocks: Block[];
}

export function getSections(plan: Plan): Section[] {
  const isService = plan === "standard" || plan === "premium";
  const price = PLAN_PRICES[plan] ?? "$0";
  const label = PLAN_LABELS[plan] ?? plan;

  const sections: Section[] = [];

  // 1. Scope of Services
  if (plan === "diy") {
    sections.push({
      title: "1. SCOPE OF SERVICES",
      blocks: [
        { type: "p", text: "Clean Path Credit provides access to credit education and self-guided credit correction tools, including but not limited to:" },
        { type: "bullets", items: [
          "DIY Credit Correction Blueprint",
          "Round-by-round action guide",
          "Downloadable tracking tools",
          "Educational resources and credit-building guidance",
          "Lifetime access to materials",
        ] },
        { type: "p", text: "The Client understands that Clean Path Credit does not guarantee specific credit score increases or outcomes, as results vary based on individual credit profiles and effort." },
      ],
    });
  } else {
    const scopeItems = [
      "Credit report analysis",
      "4-round credit correction system with full submission handling",
      "Document vault access",
      "Direct messaging with your advisor",
      "Credit-building guidance",
    ];
    if (plan === "premium") {
      scopeItems.push(
        "Monthly 1-on-1 strategy calls",
        "Business credit blueprint & positioning",
        "Priority advisor access",
        "Personal & business credit roadmap",
      );
    }
    sections.push({
      title: "1. SCOPE OF SERVICES",
      blocks: [
        { type: "p", text: "Clean Path Credit provides credit education and credit correction services, including but not limited to:" },
        { type: "bullets", items: scopeItems },
        { type: "p", text: "The Client understands that Clean Path Credit does not guarantee specific credit score increases or outcomes, as results vary based on individual credit profiles and cooperation." },
        { type: "p", text: "Client agrees to:" },
        { type: "bullets", items: [
          "Provide accurate and truthful information",
          "Respond promptly to requests",
          "Participate actively in the process",
          "Not apply for any new credit or credit checks during the program",
        ] },
      ],
    });
  }

  // 2. Payment Terms
  sections.push({
    title: "2. PAYMENT TERMS",
    blocks: [
      { type: "bullets", items: [
        `Total Fee: ${price} (one-time payment)`,
        `Plan: ${label}`,
        "Payment Method: Processed securely via Stripe",
      ] },
      { type: "p", text: "Payment has been processed electronically. All payments are non-refundable except as outlined in Section 6 (Money-Back Guarantee)." },
      { type: "bold", text: "ALL PAYMENTS ARE NON-REFUNDABLE EXCEPT AS OUTLINED IN SECTION 6 (MONEY-BACK GUARANTEE)." },
      { type: "p", text: "Client agrees not to initiate chargebacks without first contacting the Company to resolve any issues." },
    ],
  });

  // 3. Term & Termination
  if (plan === "diy") {
    sections.push({
      title: "3. TERM & TERMINATION",
      blocks: [
        { type: "p", text: "This Agreement begins on the Effective Date. Client receives lifetime access to the DIY Blueprint materials." },
        { type: "p", text: "Either Party may terminate this Agreement with 7 days written notice. No refunds will be issued after access has been granted." },
      ],
    });
  } else {
    sections.push({
      title: "3. TERM & TERMINATION",
      blocks: [
        { type: "p", text: "This Agreement begins on the Effective Date and continues until:" },
        { type: "bullets", items: [
          "Completion of 4 credit correction rounds, or",
          "Termination by either Party with 7 days written notice",
        ] },
        { type: "p", text: "No early termination refunds will be issued outside the guarantee terms." },
      ],
    });
  }

  // 4. Client Onboarding & Compliance Terms
  const s4Blocks: Block[] = [
    { type: "p", text: "Client acknowledges:" },
    { type: "bullets", items: [
      "They are voluntarily enrolling in credit improvement services",
      "They have received disclosures required under the Credit Repair Organizations Act (CROA)",
      "They have the right to cancel within 3 business days of signing this Agreement without penalty",
    ] },
  ];

  if (isService) {
    s4Blocks.push(
      { type: "bold", text: "Client Conduct Requirements (Critical to Program Success)" },
      { type: "p", text: "To avoid interfering with active credit correction and strategy execution, Client agrees to the following during the term of this Agreement:" },
      { type: "p", text: "Client agrees NOT to:" },
      { type: "bullets", items: [
        "Apply for or open any new credit accounts (credit cards, loans, financing, etc.)",
        "Close existing credit accounts without Company guidance",
        "Contact credit bureaus, creditors, or collection agencies regarding accounts under correction",
        "Make payments or payment arrangements on accounts that are currently in collections or under correction",
        "Settle, negotiate, or acknowledge debts that are in collections without Company direction",
      ] },
      { type: "p", text: "Client agrees TO:" },
      { type: "bullets", items: [
        "Continue making on-time payments for all accounts that are in good standing",
        "Maintain consistent financial behavior that supports credit stability",
        "Notify the Company immediately of any creditor contact or changes to credit status",
      ] },
      { type: "p", text: "Client understands that failure to follow these guidelines may:" },
      { type: "bullets", items: [
        "Negatively impact results",
        "Delay the credit correction process",
        "Void the money-back guarantee outlined in Section 6",
      ] },
    );
  } else {
    s4Blocks.push(
      { type: "p", text: "Client acknowledges they are self-directing their credit correction using the tools and guidance provided. Clean Path Credit provides educational materials and strategic frameworks but is not responsible for the execution or outcomes of the Client's actions." },
    );
  }

  sections.push({ title: "4. CLIENT ONBOARDING & COMPLIANCE TERMS", blocks: s4Blocks });

  // 5. Confidentiality & Non-Disclosure
  sections.push({
    title: "5. CONFIDENTIALITY & NON-DISCLOSURE",
    blocks: [
      { type: "p", text: "Both Parties agree that all confidential information shared during this Agreement remains strictly confidential." },
      { type: "p", text: "Confidential Information includes:" },
      { type: "bullets", items: [
        "Credit correction strategies and methodologies",
        "Business systems and proprietary processes",
        "Client data and personal information",
        "Marketing frameworks and internal communications",
      ] },
      { type: "p", text: "Client agrees NOT to:" },
      { type: "bullets", items: [
        "Share, resell, or redistribute any proprietary materials, strategies, or systems",
        "Use Company methods to offer competing services",
        "Disclose internal processes to third parties",
      ] },
      { type: "p", text: "Breach of this section may result in immediate termination of services and potential legal action." },
    ],
  });

  // 6. Money-Back Guarantee
  if (plan === "diy") {
    sections.push({
      title: "6. MONEY-BACK GUARANTEE",
      blocks: [
        { type: "p", text: "Due to the digital nature of the DIY Blueprint, all sales are final once dashboard access is granted. No refunds will be issued after account creation." },
      ],
    });
  } else {
    sections.push({
      title: "6. MONEY-BACK GUARANTEE",
      blocks: [
        { type: "p", text: "Clean Path Credit offers a conditional money-back guarantee:" },
        { type: "p", text: "If Client completes ALL 4 rounds of the credit correction system and:" },
        { type: "bullets", items: [
          "Has no deletions, corrections, or improvements on their credit report",
          "Has fully complied with all program requirements",
        ] },
        { type: "p", text: "Then Client may request a refund within 30 days after the final round." },
        { type: "p", text: "Refund requests must be submitted in writing and will be reviewed within 10 business days." },
        { type: "p", text: "Failure to follow the program or lack of participation voids this guarantee." },
      ],
    });
  }

  // 7–12: Same for all tiers
  sections.push(
    {
      title: "7. NON-CIRCUMVENTION",
      blocks: [
        { type: "p", text: "Client agrees not to bypass or directly engage with any vendors, partners, or systems introduced by Clean Path Credit without written consent." },
      ],
    },
    {
      title: "8. INTELLECTUAL PROPERTY",
      blocks: [
        { type: "p", text: "All systems, strategies, and materials remain the sole property of Clean Path Credit." },
        { type: "p", text: "Client is granted a limited, non-transferable license for personal use only." },
      ],
    },
    {
      title: "9. LIMITATION OF LIABILITY",
      blocks: [
        { type: "p", text: "Clean Path Credit is not liable for:" },
        { type: "bullets", items: [
          "Credit bureau decisions or timelines",
          "Third-party actions or creditor responses",
          "Indirect, incidental, or consequential damages",
          "Results that vary from projections or estimates",
        ] },
        { type: "p", text: "In no event shall Clean Path Credit's total liability exceed the total fees paid by Client under this Agreement." },
      ],
    },
    {
      title: "10. DISPUTE RESOLUTION & ARBITRATION (TEXAS)",
      blocks: [
        { type: "p", text: "Any dispute arising from this Agreement shall be resolved as follows:" },
        { type: "numbered", items: [
          "Parties agree to attempt good-faith resolution first",
          "If unresolved, disputes shall be submitted to binding arbitration in the State of Texas",
          "Arbitration shall be conducted under the rules of the American Arbitration Association (AAA)",
        ] },
        { type: "p", text: "Client waives the right to:" },
        { type: "bullets", items: ["Jury trial", "Class action lawsuits"] },
      ],
    },
    {
      title: "11. GOVERNING LAW (TEXAS)",
      blocks: [
        { type: "p", text: "This Agreement shall be governed by and interpreted in accordance with the laws of the State of Texas." },
      ],
    },
    {
      title: "12. ENTIRE AGREEMENT",
      blocks: [
        { type: "p", text: "This Agreement represents the entire agreement between the Parties and supersedes all prior agreements, understandings, and representations." },
      ],
    },
  );

  return sections;
}
