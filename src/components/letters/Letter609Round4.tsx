/**
 * 609 Round 4 — NOTICE OF PENDING LITIGATION SEEKING RELIEF AND
 * MONETARY DAMAGES UNDER FCRA SECTION 616 & SECTION 617.
 *
 * Final pre-suit escalation. Frames the letter as an OFFER OF
 * SETTLEMENT and explicitly references that copies of the three prior
 * letters will be attached as evidence in a forthcoming FTC complaint.
 *
 * Important: when generating this round in production, the API handler
 * must locate the prior R1/R2/R3 letter_packets for the same case and
 * attach them as additional pages or sibling documents in the packet
 * archive. This component renders only the cover letter.
 *
 * No boilerplate footer; notary required.
 */

import { Document, Page, Text } from "@react-pdf/renderer";
import { styles } from "./styles";
import { LetterHeader, LetterFooter } from "./LetterShell";
import { DisputeTable } from "./DisputeTable";
import { NotaryPage } from "./NotaryPage";
import type { LetterRenderInput } from "@/lib/letters/types";

export function Letter609Round4({ input }: { input: LetterRenderInput }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <LetterHeader
          consumer={input.consumer}
          bureauAddress={input.bureauAddress}
          letterDate={input.letterDate}
        />

        <Text style={[styles.demandLine, { textAlign: "center", marginBottom: 12 }]}>
          NOTICE OF PENDING LITIGATION SEEKING RELIEF AND MONETARY{"\n"}
          DAMAGES UNDER FCRA SECTION 616 &amp; SECTION 617
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>
            Please accept this final OFFER OF SETTLEMENT BEFORE LITIGATION
          </Text>{" "}
          as my attempt to amicably resolve your continued violation of the
          Fair Credit Reporting Act regarding your refusal to delete{" "}
          <Text style={styles.bold}>UNVERIFIED</Text> information from my
          consumer file. I intend to pursue litigation in accordance with the
          FCRA to seek relief and recover all monetary damages that I may be
          entitled to under{" "}
          <Text style={styles.bold}>Section 616 and Section 617</Text> if the
          UNVERIFIED items listed below are not deleted immediately. A copy of
          this letter as well as copies of the three written letters sent to
          you previously will also become part of a formal complaint to the
          Federal Trade Commission and shall be used as evidence in pending
          litigation provided you fail to comply with this offer of settlement.
        </Text>

        <Text style={styles.paragraph}>
          Despite three written requests, the unverified items listed below
          still remain on my credit report in violation of Federal Law. You are
          required under the FCRA to have a copy of the original creditors
          documentation on file to verify that this information is mine and is
          correct. In the results of your investigations, you stated in writing
          that you <Text style={styles.italic}>"verified"</Text> that these
          items are being <Text style={styles.italic}>"reporting correctly"</Text>
          ? Who verified these accounts? You have NOT provided me a copy of ANY
          original documentation ( a consumer contract with my signature on it
          ) as required under{" "}
          <Text style={styles.bold}>Section 609 (a)(1)(A) &amp; Section 611 (a)(1)(A)</Text>
          . Furthermore you have failed to provide the method of verification
          as required under{" "}
          <Text style={styles.bold}>Section 611 (a) (7)</Text>. Please be
          advised that under{" "}
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
