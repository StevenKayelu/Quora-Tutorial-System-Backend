import { PDFDocument } from "pdf-lib";
import fs from "fs";

export async function encryptPdf(filePath, password) {
  const existingPdfBytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const pdfBytes = await pdfDoc.save({
    encryption: {
      userPassword: password,
      ownerPassword: password,
      permissions: {
        printing: "highResolution",
        copying: false,
        modifying: false,
      },
    },
  });

  return pdfBytes;
}
