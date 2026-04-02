// Declaração global para a biblioteca carregada via CDN
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export const extractTextFromPDF = async (file: File): Promise<string> => {
  if (!window.pdfjsLib) {
    throw new Error("Biblioteca PDF.js não carregada. Verifique sua conexão com a internet.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
  
  try {
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    // Itera sobre todas as páginas
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `\n--- Página ${i} ---\n${pageText}`;
    }

    return fullText;
  } catch (error) {
    console.error("Erro ao ler PDF:", error);
    throw new Error("Falha ao processar o arquivo PDF. Certifique-se de que não está corrompido ou protegido por senha.");
  }
};