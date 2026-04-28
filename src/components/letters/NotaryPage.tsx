/**
 * Notary acknowledgment page appended to all 609 letters (Rounds 1-4).
 *
 * Fields are deliberately blank on the rendered PDF — the notary fills
 * them in at the appointment. The two large boxes at the bottom mark
 * where copies of the consumer's SSN card and ID will be physically
 * affixed during the notary session.
 *
 * Used by 609 R1-R4. The 611 letter does NOT use this page.
 */

import { Page, Text, View } from "@react-pdf/renderer";
import { styles } from "./styles";

export function NotaryPage() {
  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.notaryHeader}>
        <Text style={styles.paragraph}>
          IN WITNESS WHEREOF, the said party has signed and sealed these
          presents the day and year first above written.
        </Text>
        <View style={styles.notaryRow}>
          <Text>Signed, sealed and delivered in the presence of:</Text>
          <Text style={[styles.signaturePlaceholder, { marginLeft: 12 }]}>
            {"{PRINT YOUR NAME HERE}"}
          </Text>
        </View>
        <View style={styles.notarySigLine} />
        <Text style={styles.notaryLabel}>Signature</Text>
      </View>

      <View>
        <Text>STATE OF</Text>
        <Text>COUNTY OF</Text>
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={styles.paragraph}>
          I HEREBY CERTIFY that on this day before me, an officer duly
          qualified to take acknowledgments, personally appeared{" "}
          <Text style={styles.signaturePlaceholder}>{"{ YOUR NAME HERE }"}</Text>
          , who is personally known to me or who has produced
          ____________________________________ as identification and who
          executed the foregoing instrument and he/she acknowledged before
          me that he/she executed the same.
        </Text>
        <Text style={styles.paragraph}>
          WITNESS my hand and official seal in the County and State
          aforesaid this _____ day of ____________________, ______.
        </Text>
        <View style={styles.notarySigLine} />
        <View style={styles.notaryRow}>
          <View style={{ flex: 1 }}>
            <Text>Notary Public</Text>
            <Text>Printed Name:</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text>My commission expires:</Text>
          </View>
        </View>
      </View>

      <View style={styles.notaryBox}>
        <Text style={styles.notaryBoxLabel}>COPY of SSN CARD</Text>
      </View>
      <View style={styles.notaryBox}>
        <Text style={styles.notaryBoxLabel}>COPY OF ID CARD</Text>
        <Text style={{ fontSize: 11, marginTop: 4 }}>
          (Driver's License, Passport or State ID Card)
        </Text>
      </View>
    </Page>
  );
}
