import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportData } from "@/types/reportData";

interface ReportMeta {
  caseName: string;
  caseCreatedDate: string;
  totalFiles: number;
}

const COLORS = {
  headerBg: [58, 134, 255] as [number, number, number],   // #3A86FF
  altRow: [248, 249, 250] as [number, number, number],     // #F8F9FA
  text: [33, 37, 41] as [number, number, number],
  muted: [108, 117, 125] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
  orange: [249, 115, 22] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
};

const fmt = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return "—";
  return `₹ ${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
};

const fmtNum = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return "—";
  return val.toLocaleString("en-IN");
};

const addPageFooter = (doc: jsPDF, generatedDate: string) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    const footerY = doc.internal.pageSize.height - 10;
    doc.text(`Page ${i} of ${pageCount}`, 14, footerY);
    doc.text(`Generated on ${generatedDate}`, doc.internal.pageSize.width / 2, footerY, { align: "center" });
    doc.text("Confidential", doc.internal.pageSize.width - 14, footerY, { align: "right" });
  }
};

const addSectionTitle = (doc: jsPDF, title: string, y: number): number => {
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text(title, 14, y);
  // Thin blue underline
  doc.setDrawColor(...COLORS.headerBg);
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, 80, y + 2);
  return y + 10;
};

export function generateCaseReport(reportData: ReportData, meta: ReportMeta): Blob {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.width;
  const generatedDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const tableStyles = {
    headStyles: {
      fillColor: COLORS.headerBg,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold" as const,
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: COLORS.altRow,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: COLORS.text,
    },
    margin: { left: 14, right: 14 },
  };

  // ===== PAGE 1: Case Overview =====
  let y = 20;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("Case Analysis Report", 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text(`Case: ${meta.caseName}`, 14, y);
  doc.text(`Created: ${meta.caseCreatedDate}`, pageWidth - 14, y, { align: "right" });
  y += 10;

  // Case Summary KPIs
  y = addSectionTitle(doc, "Case Overview", y);

  const summaryData = [
    ["Total Files", fmtNum(meta.totalFiles)],
    ["Total Statement Files", fmtNum(reportData.case_summary.total_statement_files)],
    ["Total Inflow", fmt(reportData.case_summary.total_inflow_cr)],
    ["Total Outflow", fmt(reportData.case_summary.total_outflow_cr)],
    ["Total Beneficiaries", fmtNum(reportData.case_summary.total_beneficiaries)],
    ["Total POIs", fmtNum(reportData.case_summary.total_pois)],
    ["Total Transactions", fmtNum(reportData.case_summary.total_transactions)],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: summaryData,
    ...tableStyles,
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Transaction Types Table
  y = addSectionTitle(doc, "Transaction Types Breakdown", y);

  const txnBody = reportData.transaction_types.map((t) => [
    t.type,
    fmt(t.total_credit_cr),
    fmt(t.total_debit_cr),
    fmtNum(t.transaction_count),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Type", "Total Credit", "Total Debit", "# Transactions"]],
    body: txnBody,
    ...tableStyles,
  });

  // ===== PAGE 2-3: Important Trails =====
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, "Important Trails", y);

  const trailTypes = Object.entries(reportData.important_trails).filter(
    ([, entries]) => entries.length > 0,
  );

  for (const [trailType, entries] of trailTypes) {
    // Check if we need a new page
    if (y > doc.internal.pageSize.height - 40) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.text);
    doc.text(trailType, 14, y);
    y += 6;

    const trailBody = entries.map((e) => [
      e.account,
      e.beneficiaries,
      fmt(e.total_credit_cr),
      fmt(e.total_debit_cr),
      fmtNum(e.total_txns),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Account", "Beneficiaries", "Total Credit", "Total Debit", "Total Txns"]],
      body: trailBody,
      ...tableStyles,
      columnStyles: {
        1: { cellWidth: 50 },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (trailTypes.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.muted);
    doc.text("No important trails data available.", 14, y);
    y += 10;
  }

  // ===== PAGE 3: Top 10 Beneficiaries =====
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, "Top 10 Beneficiaries Report", y);

  const benefBody = reportData.top_beneficiaries.map((b) => {
    const classification = b.hub_beneficiary
      ? "Hub"
      : b.shared_beneficiary
        ? "Shared"
        : b.unique_beneficiary
          ? "Unique"
          : "—";

    return [
      String(b.investigation_score),
      b.node,
      fmt(b.total_debit_cr),
      fmt(b.total_credit_cr),
      fmtNum(b.accounts_present),
      b.suspicious_activity || "—",
      classification,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Score", "Node", "Total Debit", "Total Credit", "Accounts", "Suspicious Activity", "Type"]],
    body: benefBody,
    ...tableStyles,
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      5: { cellWidth: 40 },
      6: { cellWidth: 18 },
    },
    didDrawCell: (data: any) => {
      // Colored dots for classification column
      if (data.column.index === 6 && data.section === "body") {
        const val = data.cell.raw as string;
        let color: [number, number, number] | null = null;
        if (val === "Hub") color = COLORS.red;
        else if (val === "Shared") color = COLORS.orange;
        else if (val === "Unique") color = COLORS.green;

        if (color) {
          doc.setFillColor(...color);
          doc.circle(data.cell.x + 2, data.cell.y + data.cell.height / 2, 1.5, "F");
        }
      }
    },
  });

  // ===== PAGE 4: Sankey Analysis =====
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, "Sankey Diagram Analysis", y);

  const sankeyHeaders = [["Node", "Node Type", "Total Debit", "Total Credit", "Connections"]];

  const renderSankeyTable = (title: string, nodes: typeof reportData.sankey_nodes.start_trail) => {
    if (y > doc.internal.pageSize.height - 40) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.text);
    doc.text(title, 14, y);
    y += 6;

    if (nodes.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.muted);
      doc.text("No data available.", 14, y);
      y += 8;
      return;
    }

    const body = nodes.map((n) => [
      n.node,
      n.node_type,
      fmt(n.total_debit_cr),
      fmt(n.total_credit_cr),
      fmtNum(n.total_connections),
    ]);

    autoTable(doc, {
      startY: y,
      head: sankeyHeaders,
      body,
      ...tableStyles,
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  };

  renderSankeyTable("Top 10 Start Trail Nodes", reportData.sankey_nodes.start_trail);
  renderSankeyTable("Top 10 Pass Through Nodes", reportData.sankey_nodes.pass_through);
  renderSankeyTable("Top 10 End Trail Nodes", reportData.sankey_nodes.end_trail);

  // Add footers
  addPageFooter(doc, generatedDate);

  return doc.output("blob");
}
