const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const root = __dirname;
const inputPath = path.join(root, "CLIENT_PROJECT_DOCUMENTATION.md");
const outputPath = path.join(root, "CLIENT_PROJECT_DOCUMENTATION.pdf");

const source = fs
  .readFileSync(inputPath, "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/â€™/g, "'")
  .replace(/`([^`]+)`/g, "$1");

const lines = source.split("\n");

const doc = new PDFDocument({
  size: "A4",
  margin: 48,
  info: {
    Title: "Client Project Documentation",
    Author: "Codex",
    Subject: "Ecommerce Client Handover",
  },
});

doc.pipe(fs.createWriteStream(outputPath));

const pageWidth = () => doc.page.width - doc.page.margins.left - doc.page.margins.right;

const ensureRoom = (minHeight = 48) => {
  if (doc.y > doc.page.height - doc.page.margins.bottom - minHeight) {
    doc.addPage();
  }
};

const writeParagraph = (text, options = {}) => {
  ensureRoom(options.minHeight || 28);
  doc.font(options.font || "Helvetica");
  doc.fontSize(options.size || 10.5);
  doc.fillColor(options.color || "#475569");
  doc.text(text, {
    width: pageWidth(),
    lineGap: options.lineGap ?? 3,
    indent: options.indent || 0,
    paragraphGap: options.paragraphGap || 0,
  });
};

const writeHeading = (text, level = 2) => {
  ensureRoom(level === 1 ? 80 : 50);
  doc.moveDown(level === 1 ? 0.4 : 0.6);
  doc.font("Helvetica-Bold");
  doc.fillColor("#0f172a");
  doc.fontSize(level === 1 ? 24 : level === 2 ? 16 : 12.5);
  doc.text(text, {
    width: pageWidth(),
    lineGap: level === 1 ? 4 : 2,
  });
  doc.moveDown(level === 1 ? 0.15 : 0.08);
};

const writeBullet = (text, orderedPrefix = "") => {
  ensureRoom(24);
  doc.font("Helvetica");
  doc.fillColor("#475569");
  doc.fontSize(10.5);
  const prefix = orderedPrefix || "• ";
  doc.text(`${prefix}${text}`, {
    width: pageWidth() - 16,
    indent: 12,
    lineGap: 3,
  });
};

const writeTableLine = (cells, isHeader = false) => {
  ensureRoom(24);
  doc.font(isHeader ? "Helvetica-Bold" : "Helvetica");
  doc.fillColor(isHeader ? "#0f172a" : "#475569");
  doc.fontSize(10.2);
  doc.text(cells.join("  |  "), {
    width: pageWidth(),
    lineGap: 2,
  });
};

doc.rect(0, 0, doc.page.width, 168).fill("#020617");
doc.fillColor("#ffffff");
doc.font("Helvetica-Bold");
doc.fontSize(28);
doc.text("Client Project Documentation", 48, 58, {
  width: doc.page.width - 96,
});
doc.font("Helvetica");
doc.fontSize(11);
doc.fillColor("#cbd5e1");
doc.text("Ecommerce platform handover document", 48, 102, {
  width: doc.page.width - 96,
});
doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`, 48, 122, {
  width: doc.page.width - 96,
});
doc.moveTo(48, 188).lineTo(doc.page.width - 48, 188).strokeColor("#e2e8f0").lineWidth(1).stroke();
doc.y = 214;

let inTable = false;
let tableRowIndex = 0;

for (const rawLine of lines) {
  const line = rawLine.trimEnd();
  const trimmed = line.trim();

  if (!trimmed) {
    inTable = false;
    doc.moveDown(0.45);
    continue;
  }

  if (trimmed.startsWith("# ")) {
    writeHeading(trimmed.replace(/^#\s+/, ""), 1);
    continue;
  }

  if (trimmed.startsWith("## ")) {
    inTable = false;
    writeHeading(trimmed.replace(/^##\s+/, ""), 2);
    continue;
  }

  if (trimmed.startsWith("### ")) {
    inTable = false;
    writeHeading(trimmed.replace(/^###\s+/, ""), 3);
    continue;
  }

  if (trimmed.startsWith("|")) {
    const cells = trimmed
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (cells.length === 0 || cells.every((cell) => /^-+$/.test(cell.replace(/:/g, "")))) {
      continue;
    }

    writeTableLine(cells, !inTable || tableRowIndex === 0);
    inTable = true;
    tableRowIndex += 1;
    continue;
  }

  tableRowIndex = 0;
  inTable = false;

  if (/^- /.test(trimmed)) {
    writeBullet(trimmed.replace(/^- /, ""));
    continue;
  }

  if (/^\d+\.\s+/.test(trimmed)) {
    const match = trimmed.match(/^(\d+\.)\s+(.*)$/);
    writeBullet(match[2], `${match[1]} `);
    continue;
  }

  writeParagraph(trimmed);
}

doc.end();
console.log(outputPath);
