import React, { useState } from "react";
import { ExtractedData } from "../types";
import { FileText, Printer, Download, Loader2, Check, Info } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface DocumentPreviewProps {
  data: ExtractedData;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ data }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  const handleExportPdf = async () => {
    setIsGeneratingPdf(true);
    setPdfSuccess(false);

    try {
      const docElement = document.getElementById("document-a4-printable");
      if (!docElement) {
        throw new Error("Elemento do documento não encontrado");
      }

      // High quality render via html2canvas
      const canvas = await html2canvas(docElement, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1024,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10;
      const printableW = pageWidth - margin * 2;
      const printableH = (canvas.height * printableW) / canvas.width;

      pdf.addImage(imgData, "JPEG", margin, margin, printableW, printableH, undefined, "FAST");
      
      const filename = `Notificacao_${(data.NOME_INFRATOR || "Processo").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      pdf.save(filename);

      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3500);
    } catch (error: any) {
      console.warn("Tentando fallback de PDF via servidor:", error);
      try {
        const response = await fetch("/api/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });

        if (!response.ok) {
          throw new Error(`Erro no servidor (código ${response.status})`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Notificacao_${(data.NOME_INFRATOR || "Processo").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setPdfSuccess(true);
        setTimeout(() => setPdfSuccess(false), 3500);
      } catch (fallbackErr: any) {
        console.error("Erro ao gerar PDF:", fallbackErr);
        alert("Não foi possível gerar o PDF: " + (fallbackErr?.message || "Erro desconhecido"));
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    // Directly trigger window.print with @media print rules isolating #document-a4-printable
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest">
            Modelo Único de Notificação / Termo Circunstanciado (PMSC 2º BPMA)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={isGeneratingPdf}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm ${
              pdfSuccess
                ? "bg-emerald-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            } disabled:opacity-50`}
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Gerando PDF...</span>
              </>
            ) : pdfSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>PDF Baixado!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Salvar PDF (.pdf)</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            disabled={isPrinting || isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isPrinting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                <span>Preparando...</span>
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* A4 Document Layout Preview */}
      <div id="document-a4-printable" className="bg-white text-slate-900 p-6 sm:p-8 rounded-lg shadow-md max-w-3xl mx-auto font-sans leading-snug border border-slate-300 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none">
        {/* Header (Text Only, No Images) */}
        <div className="pb-2 mb-2 border-b border-slate-200 text-left">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">
            POLÍCIA MILITAR DE SANTA CATARINA
          </p>
          <h1 className="text-sm font-extrabold uppercase tracking-wide text-slate-900 mt-0.5">
            2º Batalhão de Polícia Militar Ambiental
          </h1>
          <p className="text-[10.5px] text-slate-600 font-medium mt-0.5">
            Avenida Fernando Machado, 1870-D, Chapecó-SC, CEP 89803-000
          </p>
          <p className="text-[10px] text-slate-600">
            Fone: (49) 3321-0180 | E-mail: 2bpmachapecop3@pm.sc.gov.br
          </p>
        </div>

        {/* Document Title (3 linhas antes e 3 linhas depois) */}
        <div className="text-center my-8 py-1">
          <h2 className="text-xs sm:text-[13px] font-extrabold text-slate-900 uppercase tracking-wider underline underline-offset-2">
            {data.TIPO_DOCUMENTO || "{{ TIPO_DOCUMENTO }}"}
          </h2>
        </div>

        {/* Metadata Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] mb-2.5">
          <div>
            <span className="font-bold text-slate-700">Autor dos Fatos:</span>{" "}
            <span className="text-slate-900 font-semibold">{data.NOME_INFRATOR || "{{ NOME_INFRATOR }}"}</span>
          </div>
          <div>
            <span className="font-bold text-slate-700">Tipificação Penal:</span>{" "}
            <span className="text-slate-900">{data.LEI_ENQUADRAMENTO || "{{ LEI_ENQUADRAMENTO }}"}</span>
          </div>
          <div>
            <span className="font-bold text-slate-700">Auto de Infração:</span>{" "}
            <span className="text-slate-900">AIA n. {data.AIA_NUMERO || "{{ AIA_NUMERO }}"}</span>
          </div>
        </div>

        {/* Highlight Box (Red Info Icon) */}
        <div className="text-[10.5px] space-y-0.5 mb-6 p-2.5 bg-slate-50 rounded-lg border border-slate-300 relative pl-9">
          <div className="absolute left-2.5 top-2.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-[10px]">
            <Info className="w-2.5 h-2.5" />
          </div>
          <p>
            <strong className="text-slate-800">Origem:</strong> {data.NUMERO_SADE || "{{ NUMERO_SADE }}"}
          </p>
          <p>
            <strong className="text-slate-800">Data/Hora dos Fatos:</strong> {data.DATA_FATO || "{{ DATA_FATO }}"} às {data.HORA_FATO || "{{ HORA_FATO }}"}
          </p>
          <p>
            <strong className="text-slate-800">Local:</strong> {data.ENDEREÇO || "{{ ENDEREÇO }}"}
          </p>
          <p>
            <strong className="text-slate-800">Coordenada:</strong> {data.COORDENADAS_UTM || "{{ COORDENADAS_UTM }}"}
          </p>
          <p>
            <strong className="text-slate-800">Atendentes:</strong> {data.AGENTES_ATENDENTES || "{{ AGENTES_ATENDENTES }}"}
          </p>
        </div>

        {/* Síntese dos Fatos (2 linhas de espaço antes e depois) */}
        <div className="mb-6">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 mb-1.5">
            SÍNTESE DOS FATOS E MATERIALIDADE
          </h3>
          <p className="text-[10.5px] text-slate-800 leading-relaxed text-justify">
            {data.RESUMO_RELATORIO_FISCALIZACAO || "{{ RESUMO_RELATORIO_FISCALIZACAO }}"}
          </p>
        </div>

        {/* Providências Administrativas (2 linhas de espaço antes e depois) */}
        <div className="mb-6">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 mb-1.5">
            PROVIDÊNCIAS ADMINISTRATIVAS
          </h3>
          <p className="text-[10.5px] text-slate-800 leading-relaxed mb-1.5">
            Em decorrência dos fatos, visando individualizar a autoria e impedir a continuidade das intervenções irregulares para evitar o agravamento do dano, foram adotadas as seguintes medidas, já inseridas no sistema GAIA sob o Processo n. <strong>{data.PROCESSO_GAIA || "{{ PROCESSO_GAIA }}"}</strong> (Processo PMSC <strong>{data.PROCESSO_SGPE || "{{ PROCESSO_SGPE }}"}</strong>):
          </p>
          <ul className="text-[10.5px] text-slate-800 space-y-1 pl-4 list-disc font-medium">
            <li>
              <strong>Auto de Infração Ambiental:</strong> {data.AIA_NUMERO || "{{ AIA_NUMERO }}"}
            </li>
            <li>
              <strong>Embargo/Suspensão:</strong> {data.TE_NUMERO || "{{ TE_NUMERO }}"} ({data.DESCRICAO_TE || "{{ DESCRICAO_TE }}"})
            </li>
          </ul>
        </div>

        {/* Anexos */}
        <div className="mb-8">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 mb-1.5">
            ANEXOS
          </h3>
          <p className="text-[10.5px] text-slate-800 mb-1.5">
            Diante do exposto, encaminho o presente procedimento à Vossa Excelência, instruído com as seguintes peças:
          </p>
          <div className="text-[10.5px] text-slate-800 pl-4 font-medium space-y-0.5">
            {data.ANEXOS_LISTA ? (
              data.ANEXOS_LISTA.split("\n")
                .filter((line) => line.trim().length > 0)
                .map((item, idx) => (
                  <p key={idx} className="leading-snug">
                    {item.trim()}
                  </p>
                ))
            ) : (
              <ol className="space-y-0.5 list-decimal pl-3">
                <li>Boletim de Ocorrência nº {data.BO_NUMERO || "{{ BO_NUMERO }}"};</li>
                <li>Auto de Infração Ambiental n. {data.AIA_NUMERO || "{{ AIA_NUMERO }}"};</li>
                <li>Termo de Embargo/Suspensão n. {data.TE_NUMERO || "{{ TE_NUMERO }}"};</li>
                <li>Relatório de Fiscalização;</li>
                <li>Relatório fotográfico, mapas e listas de coordenadas;</li>
                <li>Cópias dos documentos pessoais, contrato social e registro do imóvel rural.</li>
              </ol>
            )}
          </div>
        </div>

        {/* Signature Block (3 linhas antes e 3 linhas depois da data) */}
        <div className="mt-8 pt-2 text-center text-[10.5px]">
          <p className="text-slate-800 font-medium mb-8">
            Chapecó, {data.DATA_ATUAL || "{{ DATA_ATUAL }}"}.
          </p>

          <div className="inline-block px-4">
            <p className="font-bold text-slate-900 text-[11px]">
              {data.AUTORIDADE_NOME || "Andréia Cristina Fergitz"}
            </p>
            <p className="text-slate-700 font-medium text-[10.5px]">
              {data.AUTORIDADE_CARGO || "Tenente Coronel PM - Comandante do 2ºBPMA"}
            </p>
            <p className="text-slate-600 text-[9.5px]">Autoridade Ambiental Fiscalizadora</p>
            <p className="text-[9px] text-slate-500 italic mt-0.5">
              (Documento assinado eletronicamente)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


