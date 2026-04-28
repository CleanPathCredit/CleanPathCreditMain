/**
 * 611 — Per-item dispute under FCRA §611.
 *
 * Different shape from the 609 series:
 *   - Conversational tone, no §616/§617 litigation language
 *   - 4-column table: Account Name / Account Number / Reason for Dispute /
 *     What I Believe Is Correct
 *   - No notary page
 *   - No §609 verifiable-proof demand language
 *
 * The per-item `dispute_reason` and `believed_correct` fields come
 * straight from `negative_items` and are surfaced as the row's last two
 * columns. If a row lacks those fields the API handler should default
 * `dispute_reason` to "Inaccurate information" and leave
 * `believed_correct` blank.
 *
 * NOTE: This is a working draft of the canonical 611 body. The firm
 * should review the wording before sending to live clients — the
 * source playbook described the 611 as "conversational" but did not
 * include a verbatim transcript.
 */

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles } from "./styles";
import { LetterHeader, LetterFooter } from "./LetterShell";
import type { ConsumerIdentity } from "@/lib/letters/types";
import type { BureauAddress } from "@/lib/letters/bureaus";

export interface Letter611Row {
  accountName: string;
  accountNumber: string;
  disputeReason: string;
  believedCorrect: string;
}

export interface Letter611Input {
  consumer: ConsumerIdentity;
  bureauAddress: BureauAddress;
  letterDate: string;
  rows: Letter611Row[];
}

export function Letter611({ input }: { input: Letter611Input }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <LetterHeader
          consumer={input.consumer}
          bureauAddress={input.bureauAddress}
          letterDate={input.letterDate}
        />

        <Text style={styles.paragraph}>
          To Whom It May Concern,
        </Text>

        <Text style={styles.paragraph}>
          I am writing to dispute information appearing on my credit report
          under my rights granted by the Fair Credit Reporting Act,{" "}
          <Text style={styles.bold}>Section 611</Text>. The items listed below
          are inaccurate or otherwise incorrect. Please investigate each item
          and correct or delete as required by federal law.
        </Text>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={[styles.tableHeaderCell, { width: "26%" }]}>Account Name</Text>
            <Text style={[styles.tableHeaderCell, { width: "22%" }]}>Account Number</Text>
            <Text style={[styles.tableHeaderCell, { width: "26%" }]}>Reason for Dispute</Text>
            <Text style={[styles.tableHeaderCell, { width: "26%", borderRightWidth: 0 }]}>
              What I Believe Is Correct
            </Text>
          </View>
          {input.rows.map((row, i) => {
            const isLast = i === input.rows.length - 1;
            const rowStyle = isLast ? styles.tableRowLast : styles.tableRow;
            return (
              <View key={i} style={rowStyle}>
                <Text style={[styles.tableCell, { width: "26%" }]}>{row.accountName}</Text>
                <Text style={[styles.tableCell, { width: "22%" }]}>{row.accountNumber}</Text>
                <Text style={[styles.tableCell, { width: "26%" }]}>{row.disputeReason}</Text>
                <Text style={[styles.tableCell, { width: "26%", borderRightWidth: 0 }]}>
                  {row.believedCorrect}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.paragraph}>
          Per <Text style={styles.bold}>Section 611(a)</Text> of the FCRA, you
          must complete an investigation of these items and inform me of the
          results within thirty (30) days. Any item that cannot be verified must
          be promptly deleted. Please send a copy of my updated credit report
          showing the corrections to the address above once your investigation
          is complete.
        </Text>

        <Text style={styles.paragraph}>
          Thank you for your prompt attention to this matter.
        </Text>

        <LetterFooter showBoilerplate={false} />
      </Page>
    </Document>
  );
}
