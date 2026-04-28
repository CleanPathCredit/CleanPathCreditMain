/**
 * 609 Round 2 — SECOND WRITTEN REQUEST.
 *
 * Escalation from Round 1: explicitly invokes §609(a)(1)(A),
 * §611(a)(1)(A), §611(5)(A), and threatens §617 negligent-noncompliance
 * litigation. Includes the standard inquiry-removal + Promotional
 * Suppression boilerplate and a notary acknowledgment page.
 */

import { Document, Page, Text } from "@react-pdf/renderer";
import { styles } from "./styles";
import { LetterHeader, LetterFooter } from "./LetterShell";
import { DisputeTable } from "./DisputeTable";
import { NotaryPage } from "./NotaryPage";
import type { LetterRenderInput } from "@/lib/letters/types";

export function Letter609Round2({ input }: { input: LetterRenderInput }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <LetterHeader
          consumer={input.consumer}
          bureauAddress={input.bureauAddress}
          letterDate={input.letterDate}
        />

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Please be advised this is my SECOND WRITTEN REQUEST.</Text>
          {" "}The unverified items listed below remain on my credit report in
          violation of Federal Law. You are required under the FCRA to have a
          copy of the original creditors documentation on file to verify that
          this information is mine and is correct. In the results of your first
          investigation, you stated in writing that you{" "}
          <Text style={styles.italic}>"verified"</Text> that these items are
          being <Text style={styles.italic}>"reporting correctly"</Text>? Who
          verified these accounts?
        </Text>

        <Text style={styles.paragraph}>
          You have <Text style={styles.bold}>NOT</Text> provided me a copy of ANY
          original documentation required under{" "}
          <Text style={styles.bold}>Section 609 (a)(1)(A) &amp; Section 611 (a)(1)(A)</Text>
          {" "}( a consumer contract with my signature on it ) and under{" "}
          <Text style={styles.bold}>Section 611 (5)(A)</Text> of the FCRA – you
          are required to{" "}
          <Text style={styles.italic}>
            "...promptly DELETE all information which cannot be verified."
          </Text>
        </Text>

        <Text style={styles.paragraph}>
          The law is very clear as to the Civil liability and the remedy
          available to me for "negligent noncompliance"{" "}
          (<Text style={styles.bold}>Section 617</Text>) if you fail to comply.
          I am a litigious consumer and fully intend on pursuing litigation in
          this matter to enforce my rights under the FCRA
        </Text>

        <Text style={styles.demandLine}>
          I demand the following accounts be verified or deleted immediately.
        </Text>

        <DisputeTable rows={input.rows} />

        <LetterFooter />
      </Page>

      <NotaryPage />
    </Document>
  );
}
