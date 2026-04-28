/**
 * The 3-column "Name of Account / Account Number / Provide Physical
 * Verification" table that every dispute letter renders.
 *
 * Unlike the source Google Doc, the rendered table sizes itself to the
 * actual item count — no empty "Creditor 22" filler rows. If the bureau
 * has zero disputable items the caller should skip generating that
 * letter entirely (see filtering.groupByBureau).
 */

import { Text, View } from "@react-pdf/renderer";
import { styles } from "./styles";
import type { DisputeRow } from "@/lib/letters/types";

interface DisputeTableProps {
  rows: ReadonlyArray<DisputeRow>;
}

export function DisputeTable({ rows }: DisputeTableProps) {
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <Text style={[styles.tableHeaderCell, styles.colName]}>
          Name of Account
        </Text>
        <Text style={[styles.tableHeaderCell, styles.colNumber]}>
          Account Number
        </Text>
        <Text style={[styles.tableHeaderCell, styles.colVerify]}>
          Provide Physical Verification
        </Text>
      </View>

      {rows.map((row, i) => {
        const isLast = i === rows.length - 1;
        const rowStyle = isLast ? styles.tableRowLast : styles.tableRow;
        return (
          <View key={i} style={rowStyle}>
            <Text style={[styles.tableCell, styles.colName]}>{row.accountName}</Text>
            <Text style={[styles.tableCell, styles.colNumber]}>{row.accountNumber}</Text>
            <Text style={[styles.tableCell, styles.colVerify]}>{row.verificationLabel}</Text>
          </View>
        );
      })}
    </View>
  );
}
