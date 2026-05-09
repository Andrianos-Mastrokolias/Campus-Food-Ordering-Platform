import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToPDF(title, rows) {
  if (!rows || rows.length === 0) {
    alert("No data to export.");
    return;
  }

  const doc = new jsPDF();

  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((header) => row[header] ?? ""));

  doc.text(title, 14, 15);

  autoTable(doc, {
    head: [headers],
    body,
    startY: 25,
  });

  doc.save(`${title}.pdf`);
}