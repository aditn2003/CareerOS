// backend/routes/coverLetterExport.js
import express from "express";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun } from "docx";

const router = express.Router();

/* Utility to clean filenames */
function safe(str) {
  return String(str || "")
    .replace(/[^a-z0-9]+/gi, "_")
    .toLowerCase();
}

/* ===========================
   PDF EXPORT
=========================== */
router.post("/pdf", async (req, res) => {
  try {
    const { content, jobTitle = "cover", company = "letter" } = req.body;

    const fileName = `${safe(jobTitle)}_${safe(company)}.pdf`;

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    doc.text(content || "", { align: "left" });
    doc.pipe(res);
    doc.end();
  } catch (err) {
    console.error("❌ PDF export failed:", err);
    res.status(500).json({ error: "PDF export failed" });
  }
});

/* ===========================
   DOCX EXPORT
=========================== */
router.post("/docx", async (req, res) => {
  try {
    const { content, jobTitle = "cover", company = "letter" } = req.body;

    const fileName = `${safe(jobTitle)}_${safe(company)}.docx`;

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun(content || "")],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    res.send(buffer);
  } catch (err) {
    console.error("❌ DOCX export failed:", err);
    res.status(500).json({ error: "DOCX export failed" });
  }
});

/* ===========================
   TEXT EXPORT
=========================== */
router.post("/text", async (req, res) => {
  try {
    const { content, jobTitle = "cover", company = "letter" } = req.body;

    const fileName = `${safe(jobTitle)}_${safe(company)}.txt`;

    res.setHeader("Content-Type", "text/plain");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    res.send(content || "");
  } catch (err) {
    console.error("❌ TXT export failed:", err);
    res.status(500).json({ error: "TXT export failed" });
  }
});

export default router;
