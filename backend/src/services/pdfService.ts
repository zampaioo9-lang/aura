import PDFDocument from 'pdfkit';

export interface ResultPdfParams {
  offeringTitle: string;
  buyerName: string;
  totalScore: number;
  message: string;
}

// Genera un PDF de una sola pagina con el resultado del cuestionario, en memoria (nunca se
// escribe a disco). pdfkit se eligio sobre un enfoque basado en navegador headless
// (Puppeteer) porque este backend corre en funciones serverless de Vercel, donde un
// Chromium headless necesita un binario especial (@sparticuz/chromium) y arranca mucho mas
// lento -- para un documento de una pagina sin diseno elaborado, pdfkit es mas simple y
// liviano.
export function generateResultPdf(params: ResultPdfParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text(params.offeringTitle, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Resultado de ${params.buyerName}`, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(18).text(`Puntaje: ${params.totalScore}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(params.message, { align: 'center' });

    doc.end();
  });
}
