import jsPDF from "jspdf";
import type { Plan } from "@/types/database";
import { getSections, AGREEMENT_VERSION, PLAN_LABELS, type Block } from "./agreementSections";

interface PDFParams {
  clientName: string;
  clientEmail: string;
  plan: Plan;
  price: string;
  date: string;
  signatureDataUrl: string;
}

export function generateAgreementPDF(params: PDFParams): string {
  const { clientName, clientEmail, plan, price, date, signatureDataUrl } = params;
  const doc = new jsPDF();

  const margin = 20;
  const pageWidth = 210;
  const textWidth = pageWidth - 2 * margin;
  const pageHeight = 280;
  let y = 20;

  function checkPage(needed: number) {
    if (y + needed > pageHeight) {
      doc.addPage();
      y = 20;
    }
  }

  function addTitle(text: string, size = 18) {
    checkPage(14);
    doc.setFontSize(size);
    doc.setFont("helvetica", "bold");
    doc.text(text, margin, y);
    y += size * 0.6;
  }

  function addHeading(text: string) {
    y += 4;
    checkPage(12);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(text, margin, y);
    y += 8;
  }

  function addParagraph(text: string, bold = false) {
    doc.setFontSize(10);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, textWidth);
    for (const line of lines) {
      checkPage(5);
      doc.text(line, margin, y);
      y += 5;
    }
    y += 2;
  }

  function addBullet(text: string) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, textWidth - 8);
    checkPage(5);
    doc.text("\u2022", margin + 2, y);
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) checkPage(5);
      doc.text(lines[i], margin + 8, y);
      y += 5;
    }
  }

  function addNumbered(text: string, num: number) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, textWidth - 10);
    checkPage(5);
    doc.text(`${num}.`, margin + 2, y);
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) checkPage(5);
      doc.text(lines[i], margin + 10, y);
      y += 5;
    }
  }

  function renderBlock(block: Block) {
    switch (block.type) {
      case "p":
        addParagraph(block.text);
        break;
      case "bold":
        addParagraph(block.text, true);
        break;
      case "bullets":
        for (const item of block.items) addBullet(item);
        y += 2;
        break;
      case "numbered":
        block.items.forEach((item, i) => addNumbered(item, i + 1));
        y += 2;
        break;
    }
  }

  // === Document Header ===
  addTitle("CLEAN PATH CREDIT", 20);
  addTitle("CUSTOMER SERVICE AGREEMENT &", 12);
  addTitle("NON-DISCLOSURE AGREEMENT (NDA)", 12);
  y += 4;

  // Preamble
  addParagraph(`This Customer Service Agreement and Non-Disclosure Agreement ("Agreement") is entered into as of ${date} ("Effective Date"), by and between:`);
  addParagraph('Company: Clean Path Credit ("Company")');
  addParagraph("Website: cleanpathcredit.com");
  y += 2;
  addParagraph(`Client: ${clientName} (${clientEmail}) ("Client")`);
  y += 2;
  addParagraph('Collectively referred to as the "Parties."');
  y += 4;

  // === Sections ===
  const sections = getSections(plan);
  for (const section of sections) {
    addHeading(section.title);
    for (const block of section.blocks) {
      renderBlock(block);
    }
  }

  // === Signature Section ===
  y += 8;
  checkPage(60);
  addHeading("13. SIGNATURES");
  addParagraph("By signing below, both Parties agree to all terms outlined above.");
  y += 6;

  // Client signature box
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, textWidth, 50);
  y += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${clientName}`, margin + 4, y);
  y += 8;

  doc.text("Signature:", margin + 4, y);
  // Add signature image
  try {
    doc.addImage(signatureDataUrl, "PNG", margin + 30, y - 8, 60, 20);
  } catch {
    doc.text("[Signature on file]", margin + 30, y);
  }
  y += 16;

  doc.text(`Date: ${date}`, margin + 4, y);
  y += 8;

  doc.text(`Email: ${clientEmail}`, margin + 4, y);
  y += 12;

  // Company signature
  doc.setFont("helvetica", "bold");
  doc.text("Clean Path Credit Representative", margin + 4, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text("Clean Path Credit", margin + 4, y);
  y += 6;
  doc.text(`Date: ${date}`, margin + 4, y);

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Clean Path Credit \u2014 ${PLAN_LABELS[plan] ?? plan} Agreement (${AGREEMENT_VERSION}) \u2014 Page ${i} of ${totalPages}`,
      pageWidth / 2, 292,
      { align: "center" },
    );
  }

  // Return as base64
  return doc.output("datauristring").split(",")[1];
}
