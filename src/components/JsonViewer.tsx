import React, { useState } from "react";
import { ExtractedData } from "../types";
import { Code2, Copy, Check, Download } from "lucide-react";

interface JsonViewerProps {
  data: ExtractedData;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const jsonFormatted = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonFormatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonFormatted], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Tags_Extraidas_${(data.NOME_INFRATOR || "Infrator").replace(/ /g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            SEÇÃO 1: JSON Estruturado com os Dados Extraídos
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar JSON</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar .json</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <pre className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-emerald-300 border border-slate-800 overflow-x-auto max-h-[480px]">
          <code>{jsonFormatted}</code>
        </pre>
      </div>
    </div>
  );
};
