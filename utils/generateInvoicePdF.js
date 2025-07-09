const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

module.exports = async function generateInvoicePDF({
  provider,
  subscriptionPlan,
  subscriptionType,
  transactionId,
  invoiceDate,
  amountCharged
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      const txIdSafe = (transactionId ?? "N/A").toString();
      const nowDate = invoiceDate?.toLocaleDateString() ?? new Date().toLocaleDateString();
      const subTotal = +(amountCharged / 1.1).toFixed(2);
      const gst = +(amountCharged - subTotal).toFixed(2);

      const leftX = 50;
      const rightX = 330;
      const lineHeight = 20;
      const pageWidth = doc.page.width - 2 * leftX;
      let y = 50;

      const logoPath = path.join(__dirname, "tredhunter.jpg");

      // Header
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, leftX, y - 10, { width: 50 });
      }
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("Trade Hunters PTY LTD", rightX, y - 10, { align: "right" })
        .fontSize(10)
        .text("ABN: 24 682 578 892", rightX, y + 10, { align: "right" });

      y += 80;
      doc
        .moveTo(leftX, y)
        .lineTo(leftX + pageWidth, y)
        .strokeColor("#999")
        .lineWidth(1)
        .stroke();
      y += 15;

      // Business Info
      doc
        .fontSize(11)
        .fillColor("#003366")
        .font("Helvetica-Bold")
        .text("Business Name:", leftX, y)
        .fillColor("black")
        .font("Helvetica")
        .text(provider?.businessName ?? "N/A", leftX + 110, y);
      y += lineHeight;

      doc
        .fillColor("#003366")
        .font("Helvetica-Bold")
        .text("Business Address:", leftX, y)
        .fillColor("black")
        .font("Helvetica")
        .text(provider?.address?.addressLine ?? "N/A", leftX + 110, y, { width: 220 });

      doc
        .fillColor("#003366")
        .font("Helvetica-Bold")
        .text("Invoice No.:", rightX + 50, y - 20)
        .font("Helvetica")
        .fillColor("black")
        .text(txIdSafe, rightX + 130, y - 20);

      doc
        .fillColor("#003366")
        .font("Helvetica-Bold")
        .text("Invoice Date:", rightX + 50, y)
        .font("Helvetica")
        .fillColor("black")
        .text(nowDate, rightX + 130, y);

      y += 60;

      // Subscription Details
      doc
        .fillColor("#f0f0f0")
        .rect(leftX, y - 10, pageWidth, 30)
        .fill()
        .fillColor("#003366")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Subscription Details:-", leftX, y - 5);
      y += 30;

      doc
        .fontSize(11)
        .fillColor("#003366")
        .font("Helvetica-Bold")
        .text("Description:", leftX, y);
      y += lineHeight;
      doc
        .font("Helvetica")
        .fillColor("black")
        .text(subscriptionPlan?.planName ?? "N/A", leftX, y, { width: pageWidth });
      y = doc.y + lineHeight;

      doc
        .fillColor("#003366")
        .font("Helvetica-Bold")
        .text("Plan:", leftX, y)
        .fillColor("black")
        .font("Helvetica")
        .text(subscriptionType?.type ?? "N/A", leftX + 60, y);

      doc
        .fillColor("#003366")
        .font("Helvetica-Bold")
        .text("Amount:", rightX + 80, y)
        .fillColor("black")
        .font("Helvetica")
        .text(`$${subscriptionPlan?.amount ?? "0.00"}`, rightX + 150, y);

      y += lineHeight * 2;

      // Totals
      doc
        .fillColor("black")
        .font("Helvetica")
        .text(`Subtotal: $${subTotal.toFixed(2)}`, rightX + 80, y + 5)
        .text(`GST (10%): $${gst.toFixed(2)}`, rightX + 80, y + lineHeight + 5)
        .font("Helvetica-Bold")
        .text(`Total: $${amountCharged.toFixed(2)}`, rightX + 80, y + lineHeight * 2 + 5);

      // Footer
      const footerY = doc.page.height - 80;
      doc
        .fontSize(11)
        .fillColor("#003366")
        .font("Helvetica-Bold")
        .text("Thanks!! Trade Hunters Team", leftX, footerY);

      doc.end();
    } catch (err) {
      console.error("PDF generation error:", err);
      reject(err);
    }
  });
};
