import jsPDF from "jspdf";
import { ExtractedData } from "../types";

export function generateNotificationPdf(data: ExtractedData): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  let y = 14;

  // Helper for text wrapping
  const addWrappedText = (text: string, x: number, startY: number, maxWidth: number, lineHeight = 4.2): number => {
    const lines = doc.splitTextToSize(text || "", maxWidth);
    doc.text(lines, x, startY);
    return startY + lines.length * lineHeight;
  };

  // 1. Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("POLÍCIA MILITAR DE SANTA CATARINA", margin, y);
  y += 3.8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("2º Batalhão de Polícia Militar Ambiental", margin, y);
  y += 3.8;

  if (data.UNIDADE_NOME && data.UNIDADE_NOME !== "2º Batalhão de Polícia Militar Ambiental") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(30, 64, 175);
    doc.text(data.UNIDADE_NOME, margin, y);
    y += 3.4;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(data.UNIDADE_ENDERECO || "Av. Fernando Machado, 1870-D, Chapecó-SC, CEP 89803-000", margin, y);
  y += 3.2;
  doc.text(data.UNIDADE_CONTATO || "Fone: (49) 3321-0180 | E-mail: 2bpmachapecop3@pm.sc.gov.br", margin, y);
  y += 3.8;

  // Header separator line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentWidth, y);
  y += 9;

  // 2. Document Title
  const title = (data.TIPO_DOCUMENTO || "NOTIFICAÇÃO DE INFRAÇÃO PENAL AMBIENTAL").toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(title, pageWidth / 2, y, { align: "center" });

  // Underline for title
  const titleWidth = doc.getTextWidth(title);
  doc.line(pageWidth / 2 - titleWidth / 2, y + 0.8, pageWidth / 2 + titleWidth / 2, y + 0.8);
  y += 9;

  // 3. Metadata 3 Columns
  const col1W = 55;
  const col2W = 72;
  const col3W = contentWidth - (col1W + col2W); // 55mm
  const col1X = margin;
  const col2X = margin + col1W;
  const col3X = margin + col1W + col2W;

  doc.setFontSize(7.5);

  // Column 1
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text("Autor dos Fatos:", col1X, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const autorLines = doc.splitTextToSize(data.NOME_INFRATOR || "Não informado", col1W - 4);
  doc.text(autorLines, col1X, y + 3.8);

  // Column 2
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text("Tipificação Penal:", col2X, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const tipLines = doc.splitTextToSize(data.LEI_ENQUADRAMENTO || "Não informado", col2W - 4);
  doc.text(tipLines, col2X, y + 3.8);

  // Column 3
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text("Auto(s) de Infração:", col3X, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const aiaText = data.AIA_NUMERO
    ? data.AIA_NUMERO.toLowerCase().includes("aia")
      ? data.AIA_NUMERO
      : `AIA n. ${data.AIA_NUMERO}`
    : "---";
  const aiaLines = doc.splitTextToSize(aiaText, col3W - 4);
  doc.text(aiaLines, col3X, y + 3.8);

  const maxMetaLines = Math.max(autorLines.length, tipLines.length, aiaLines.length, 1);
  y += 4 + maxMetaLines * 3.8 + 4;

  // 4. Highlight Box (Origem, Data, Local, Coords, Atendentes)
  const boxX = margin;
  const boxY = y;
  const boxH = 25.5;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(boxX, boxY, contentWidth, boxH, 2, 2, "FD");

  // Red info icon circle
  doc.setFillColor(220, 38, 38);
  doc.circle(boxX + 4.5, boxY + 4.5, 2.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("i", boxX + 4.0, boxY + 5.3);

  // Box text
  doc.setFontSize(7.2);
  const textLeft = boxX + 9;
  let boxTextY = boxY + 4.2;
  const lineGap = 4.3;

  const renderBoxLine = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text(label, textLeft, boxTextY);
    const labelW = doc.getTextWidth(label);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const valText = doc.splitTextToSize(value || "Não informado", contentWidth - 14 - labelW)[0] || "";
    doc.text(valText, textLeft + labelW + 1, boxTextY);
    boxTextY += lineGap;
  };

  renderBoxLine("Origem: ", data.NUMERO_SADE || "---");
  renderBoxLine("Data/Hora dos Fatos: ", `${data.DATA_FATO || "---"} às ${data.HORA_FATO || "---"}`);
  renderBoxLine("Local: ", data.ENDEREÇO || "---");
  renderBoxLine("Coordenada: ", data.COORDENADAS_UTM || "---");
  renderBoxLine("Atendentes: ", data.AGENTES_ATENDENTES || "---");

  y = boxY + boxH + 6.5;

  // 5. SÍNTESE DOS FATOS E MATERIALIDADE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("SÍNTESE DOS FATOS E MATERIALIDADE", margin, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.3);
  doc.setTextColor(30, 41, 59);
  y = addWrappedText(data.RESUMO_RELATORIO_FISCALIZACAO || "Não informado", margin, y, contentWidth, 3.6);
  y += 5.5;

  // 6. PROVIDÊNCIAS ADMINISTRATIVAS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("PROVIDÊNCIAS ADMINISTRATIVAS", margin, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.3);
  doc.setTextColor(30, 41, 59);
  const provText = `Em decorrência dos fatos, visando individualizar a autoria e impedir a continuidade das intervenções irregulares para evitar o agravamento do dano, foram adotadas as seguintes medidas, já inseridas no sistema GAIA sob o Processo n. ${data.PROCESSO_GAIA || "---"} (Processo PMSC ${data.PROCESSO_SGPE || "---"}):`;
  y = addWrappedText(provText, margin, y, contentWidth, 3.6);
  y += 1.5;

  doc.setFont("helvetica", "bold");
  doc.text(`• Auto(s) de Infração Ambiental: `, margin + 3, y);
  const aiaW = doc.getTextWidth("• Auto(s) de Infração Ambiental: ");
  doc.setFont("helvetica", "normal");
  doc.text(data.AIA_NUMERO || "---", margin + 3 + aiaW, y);
  y += 3.6;

  doc.setFont("helvetica", "bold");
  doc.text(`• Embargo(s)/Suspensão: `, margin + 3, y);
  const teW = doc.getTextWidth("• Embargo(s)/Suspensão: ");
  doc.setFont("helvetica", "normal");
  doc.text(`${data.TE_NUMERO || "---"} (${data.DESCRICAO_TE || "---"})`, margin + 3 + teW, y);
  y += 5.5;

  // 7. ANEXOS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("ANEXOS", margin, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.3);
  doc.setTextColor(30, 41, 59);
  doc.text("Diante do exposto, encaminho o presente procedimento à Vossa Excelência, instruído com as seguintes peças:", margin, y);
  y += 3.8;

  let anexosList: string[] = [];
  if (data.ANEXOS_LISTA && data.ANEXOS_LISTA.trim().length > 0) {
    anexosList = data.ANEXOS_LISTA.split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
  } else {
    anexosList = [
      `1. Boletim de Ocorrência nº ${data.BO_NUMERO || "---"};`,
      `2. Auto(s) de Infração Ambiental n. ${data.AIA_NUMERO || "---"};`,
      `3. Termo(s) de Embargo/Suspensão n. ${data.TE_NUMERO || "---"};`,
      "4. Relatório de Fiscalização;",
      "5. Relatório fotográfico, mapas e listas de coordenadas;",
      "6. Cópias dos documentos pessoais, contrato social e registro do imóvel rural.",
    ];
  }

  anexosList.forEach((anexo) => {
    doc.text(anexo, margin + 3, y);
    y += 3.3;
  });
  y += 5;

  // 8. Data e Assinatura
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(30, 41, 59);
  const cidadeFecho = data.CIDADE_FECHO || "Chapecó";
  doc.text(`${cidadeFecho}, ${data.DATA_ATUAL || ""}.`, pageWidth / 2, y, { align: "center" });
  y += 6.5;

  const nomeAut = data.AUTORIDADE_NOME || "Guilherme Wildner Wolf";
  const cargoAut = data.AUTORIDADE_CARGO || "Capitão PM - Comandante da 1ª Cia do 2º BPMA";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text(nomeAut, pageWidth / 2, y, { align: "center" });
  y += 3.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);
  doc.text(cargoAut, pageWidth / 2, y, { align: "center" });
  y += 3.2;

  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text("Autoridade Ambiental Fiscalizadora", pageWidth / 2, y, { align: "center" });
  y += 2.8;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text("(Documento assinado eletronicamente)", pageWidth / 2, y, { align: "center" });

  // Save PDF directly to browser downloads
  const filename = `Notificacao_${(data.NOME_INFRATOR || "Processo").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  doc.save(filename);
}
