/**
 * Shared header + footer used by every dispute letter template.
 *
 * The header carries the consumer identity block and the bureau address;
 * the footer carries the boilerplate (remove non-account-holding inquiries
 * >30 days old, add Promotional Suppression) and the signature placeholder.
 *
 * Templates only need to drop their round-specific body + table between
 * <LetterHeader /> and <LetterFooter />.
 */

import { Text, View } from "@react-pdf/renderer";
import { styles } from "./styles";
import type { ConsumerIdentity } from "@/lib/letters/types";
import type { BureauAddress } from "@/lib/letters/bureaus";

interface LetterHeaderProps {
  consumer: ConsumerIdentity;
  bureauAddress: BureauAddress;
  /** Plain-text date — pre-formatted server-side (e.g. "January 1, 2016"). */
  letterDate?: string;
}

export function LetterHeader({
  consumer,
  bureauAddress,
  letterDate,
}: LetterHeaderProps) {
  // SSN line shown as the original Doc shows it: leading zeros + last 4.
  // Last4 is the only piece persisted in the rendering input; full SSN
  // is fetched from the vault by the API handler when (if) needed.
  const ssnDisplay = `XXX-XX-${consumer.ssnLast4}`;

  return (
    <>
      {letterDate ? <Text style={styles.date}>{letterDate}</Text> : null}

      <View style={styles.consumerBlock}>
        <Text style={styles.consumerLine}>{consumer.fullName}</Text>
        {consumer.addressLines.map((line, i) => (
          <Text key={i} style={styles.consumerLine}>{line}</Text>
        ))}
        <Text style={styles.consumerLine}>
          SSN: {ssnDisplay}  |  DOB: {consumer.dateOfBirth}
        </Text>
      </View>

      <View style={styles.bureauBlock}>
        <Text style={[styles.consumerLine, styles.bold]}>
          {bureauAddress.displayName}
        </Text>
        {bureauAddress.addressLines.map((line, i) => (
          <Text key={i} style={styles.consumerLine}>{line}</Text>
        ))}
      </View>
    </>
  );
}

/**
 * Boilerplate footer + signature placeholder.
 *
 * `showBoilerplate` defaults to true (Round 1 + Round 2 use it). Round 3
 * and Round 4 in the source playbook drop the inquiry/promotional-
 * suppression bullets — pass `showBoilerplate={false}` for those.
 */
export function LetterFooter({ showBoilerplate = true }: { showBoilerplate?: boolean } = {}) {
  return (
    <>
      {showBoilerplate ? (
        <View style={styles.boilerplate}>
          <Text style={styles.boilerplateLine}>
            *  Please remove all <Text style={styles.bold}>non-account holding inquiries</Text> over 30 days old.
          </Text>
          <Text style={styles.boilerplateLine}>
            *  Please add a <Text style={styles.bold}>Promotional Suppression</Text> to my credit file.
          </Text>
        </View>
      ) : null}

      <View style={styles.signatureBlock}>
        <Text>Thank You,</Text>
        <Text style={styles.signaturePlaceholder}>{"{YOUR NAME HERE}"}</Text>
      </View>
    </>
  );
}
