/**
 * 609 Round 1 — verifiable-proof demand under FCRA Section 609(a)(1)(A).
 *
 * Body text is the firm's canonical Round 1 template, transcribed
 * verbatim from the source Google Doc, with the dynamic table swapped
 * in. Closes with the standard boilerplate (handled by LetterFooter)
 * and a notary acknowledgment page appended (NotaryPage).
 */

import { Document, Page, Text } from "@react-pdf/renderer";
import { styles } from "./styles";
import { LetterHeader, LetterFooter } from "./LetterShell";
import { DisputeTable } from "./DisputeTable";
import { NotaryPage } from "./NotaryPage";
import type { LetterRenderInput } from "@/lib/letters/types";

export function Letter609Round1({ input }: { input: LetterRenderInput }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <LetterHeader
          consumer={input.consumer}
          bureauAddress={input.bureauAddress}
          letterDate={input.letterDate}
        />

        <Text style={styles.paragraph}>
          According to the Fair Credit Reporting Act,{" "}
          <Text style={styles.bold}>Section 609 (a)(1)(A)</Text>,{" "}
          <Text style={styles.bold}>you are required by federal law to verify</Text>
          {" "}- through the physical verification of the original signed consumer
          contract - any and all accounts you post on a credit report. Otherwise,
          anyone paying for your reporting services could fax, mail or email in a
          fraudulent account.
        </Text>

        <Text style={styles.paragraph}>
          I demand to see Verifiable Proof (
          <Text style={styles.bold}>an original Consumer Contract with my Signature on it</Text>
          ) you have on file of the accounts listed below. Your failure to
          positively verify these accounts has hurt my ability to obtain credit.
          Under the FCRA, unverified accounts must be removed and if you are
          unable to provide me with a copy of verifiable proof, you must remove
          the accounts listed below.
        </Text>

        <Text style={styles.demandLine}>
          I demand the following accounts be verified or removed immediately.
        </Text>

        <DisputeTable rows={input.rows} />

        <LetterFooter />
      </Page>

      <NotaryPage />
    </Document>
  );
}
