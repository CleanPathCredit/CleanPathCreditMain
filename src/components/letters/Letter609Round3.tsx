/**
 * 609 Round 3 — THIRD WRITTEN REQUEST and FINAL WARNING.
 *
 * Strongest pre-litigation tone: invokes §616 + §617 monetary-damages
 * language and §611(a)(7) method-of-verification. Per the source
 * playbook this round drops the inquiry-removal / Promotional
 * Suppression boilerplate (showBoilerplate=false). Notary still
 * required.
 */

import { Document, Page, Text } from "@react-pdf/renderer";
import { styles } from "./styles";
import { LetterHeader, LetterFooter } from "./LetterShell";
import { DisputeTable } from "./DisputeTable";
import { NotaryPage } from "./NotaryPage";
import type { LetterRenderInput } from "@/lib/letters/types";

export function Letter609Round3({ input }: { input: LetterRenderInput }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <LetterHeader
          consumer={input.consumer}
          bureauAddress={input.bureauAddress}
          letterDate={input.letterDate}
        />

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>
            Please be advised this is my THIRD WRITTEN REQUEST and FINAL WARNING
            that I fully intend to pursue litigation in accordance with the FCRA
            to enforce my rights and seek relief and recover all monetary
            damages that I may be entitled to under Section 616 and Section 617
            regarding your continued willful and negligent noncompliance.
          </Text>
        </Text>

        <Text style={styles.paragraph}>
          Despite two written requests, the unverified items listed below still
          remain on my credit report in violation of Federal Law. You are
          required under the FCRA to have a copy of the original creditors
          documentation on file to verify that this information is mine and is
          correct. In the results of your first investigation and subsequent
          reinvestigation, you stated in writing that you{" "}
          <Text style={styles.italic}>"verified"</Text> that these items are
          being <Text style={styles.italic}>"reporting correctly"</Text>? Who
          verified these accounts? You have <Text style={styles.bold}>NOT</Text>
          {" "}provided me a copy of ANY original documentation ( a consumer
          contract with my signature on it ) as required under{" "}
          <Text style={styles.bold}>Section 609 (a)(1)(A) &amp; Section 611 (a)(1)(A)</Text>
          . Furthermore you have failed to provide the method of verification as
          required under <Text style={styles.bold}>Section 611 (a) (7)</Text>.
          Please be advised that under{" "}
          <Text style={styles.bold}>Section 611 (5)(A)</Text> of the FCRA – you
          are required to{" "}
          <Text style={styles.italic}>
            "...promptly DELETE all information which cannot be verified."
          </Text>
        </Text>

        <Text style={styles.paragraph}>
          The law is very clear as to the Civil liability and the remedy
          available to me (<Text style={styles.bold}>Section 616 &amp; 617</Text>)
          if you fail to comply with Federal Law. I am a litigious consumer and
          fully intend on pursuing litigation in this matter to enforce my
          rights under the FCRA.
        </Text>

        <Text style={styles.demandLine}>
          I demand the following accounts be verified or deleted immediately.
        </Text>

        <DisputeTable rows={input.rows} />

        <LetterFooter showBoilerplate={false} />
      </Page>

      <NotaryPage />
    </Document>
  );
}
