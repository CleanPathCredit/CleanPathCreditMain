/**
 * Shared @react-pdf StyleSheet for dispute letters.
 *
 * Page geometry mirrors the Google Doc the firm has been filling in by hand:
 *   - US Letter, ~0.75in margins
 *   - 11pt Times-style serif body, bolded headings
 *   - 3-column accounts table with single-pixel rules
 */

import { StyleSheet } from "@react-pdf/renderer";

export const styles = StyleSheet.create({
  page: {
    paddingTop: 54,        // 0.75in
    paddingBottom: 54,
    paddingLeft: 54,
    paddingRight: 54,
    fontFamily: "Times-Roman",
    fontSize: 11,
    lineHeight: 1.35,
    color: "#000",
  },
  consumerBlock: {
    marginBottom: 14,
  },
  consumerLine: {
    fontSize: 11,
  },
  bureauBlock: {
    marginBottom: 14,
  },
  date: {
    marginBottom: 14,
  },
  paragraph: {
    marginBottom: 10,
  },
  bold: {
    fontFamily: "Times-Bold",
  },
  italic: {
    fontFamily: "Times-Italic",
  },
  boldItalic: {
    fontFamily: "Times-BoldItalic",
  },
  demandLine: {
    fontFamily: "Times-Bold",
    marginTop: 4,
    marginBottom: 8,
  },
  table: {
    marginTop: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#000",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  tableRowLast: {
    flexDirection: "row",
  },
  tableHeaderCell: {
    fontFamily: "Times-Bold",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: "#000",
    backgroundColor: "#e6e6e6",
  },
  tableCell: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: "#000",
  },
  // Column widths sum to 100%; matches the source Doc proportions.
  colName:    { width: "37%" },
  colNumber:  { width: "30%" },
  colVerify:  { width: "33%", borderRightWidth: 0 },
  boilerplate: {
    marginTop: 8,
    marginBottom: 14,
  },
  boilerplateLine: {
    marginBottom: 4,
  },
  signatureBlock: {
    marginTop: 28,
  },
  signaturePlaceholder: {
    color: "#c00",        // matches red placeholder text in source Doc
    fontFamily: "Times-Bold",
    marginTop: 18,
  },
  // Notary page styles
  notaryHeader: {
    marginBottom: 18,
  },
  notarySigLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    height: 18,
    width: "70%",
    marginLeft: "auto",
    marginRight: 0,
    marginTop: 6,
    marginBottom: 4,
  },
  notaryLabel: {
    fontSize: 10,
    textAlign: "right",
    width: "70%",
    marginLeft: "auto",
  },
  notaryStateLine: {
    marginTop: 18,
    marginBottom: 4,
  },
  notaryFillLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    height: 14,
    flex: 1,
    marginHorizontal: 4,
  },
  notaryRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  notaryBox: {
    borderWidth: 1,
    borderColor: "#000",
    height: 130,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notaryBoxLabel: {
    fontFamily: "Times-Bold",
    fontSize: 13,
  },
});
