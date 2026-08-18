import * as pdfjsLib from "pdfjs-dist";

// Set worker source for browser environment
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

/**
 * Extracts text from a PDF File directly in the browser.
 * This turns heavy 10MB-50MB PDFs with images into lightweight ~20KB text payloads,
 * completely avoiding Vercel serverless payload limit (413 Payload Too Large).
 */
export async function extractTextFromPdfFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");
      if (pageText.trim()) {
        fullText += `\n[PÁGINA ${pageNum}]: ${pageText.trim()}\n`;
      }
    }

    return fullText.trim();
  } catch (error) {
    console.warn(`[Client PDF Extract] Não foi possível extrair texto de ${file.name}:`, error);
    return "";
  }
}
