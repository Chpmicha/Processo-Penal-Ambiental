import React from "react";
import { ExtractedData } from "../types";
import { Scale, Edit3, Trash2 } from "lucide-react";

interface TagEditorFormProps {
  data: ExtractedData;
  onChange: (updated: ExtractedData) => void;
  onResetSample?: () => void;
}

export const TagEditorForm: React.FC<TagEditorFormProps> = ({
  data,
  onChange,
}) => {
  const handleChange = (key: keyof ExtractedData, value: string) => {
    onChange({
      ...data,
      [key]: value,
    });
  };

  const handleClear = () => {
    onChange({
      TIPO_DOCUMENTO: "NOTIFICAÇÃO DE INFRAÇÃO PENAL AMBIENTAL",
      NOME_INFRATOR: "",
      LEI_ENQUADRAMENTO: "",
      AIA_NUMERO: "",
      NUMERO_SADE: "",
      DATA_FATO: "",
      HORA_FATO: "",
      ENDEREÇO: "",
      COORDENADAS_UTM: "",
      AGENTES_ATENDENTES: "",
      RESUMO_RELATORIO_FISCALIZACAO: "",
      PROCESSO_GAIA: "",
      PROCESSO_SGPE: "",
      TE_NUMERO: "",
      DESCRICAO_TE: "",
      BO_NUMERO: "",
      DATA_ATUAL: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    });
  };

  const isTermoCircunstanciado =
    data.TIPO_DOCUMENTO === "TERMO CIRCUNSTANCIADO" ||
    data.TIPO_DOCUMENTO === "TERMO CIRCUNSTÂNCIADO";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest">
            Edição Manual das 17 Tags Extraídas
          </h2>
        </div>
        <button
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Limpar Campos</span>
        </button>
      </div>

      {/* Regra de Enquadramento Banner */}
      <div
        className={`p-4 rounded-lg border flex flex-wrap items-center justify-between gap-3 ${
          isTermoCircunstanciado
            ? "bg-blue-50 border-blue-200 text-blue-900"
            : "bg-amber-50 border-amber-200 text-amber-900"
        }`}
      >
        <div className="flex items-center gap-3">
          <Scale className="w-5 h-5 shrink-0 text-blue-700" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wide">
              Tipo de Documento: {data.TIPO_DOCUMENTO}
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {isTermoCircunstanciado
                ? "Pena máxima cominada ≤ 2 anos (ex: Art. 64 ou 60 da Lei 9.605/98)."
                : "Pena máxima cominada > 2 anos (ex: Art. 38, 38-A, 50 da Lei 9.605/98)."}
            </p>
          </div>
        </div>

        <select
          value={
            data.TIPO_DOCUMENTO === "TERMO CIRCUNSTÂNCIADO"
              ? "TERMO CIRCUNSTANCIADO"
              : data.TIPO_DOCUMENTO
          }
          onChange={(e) => handleChange("TIPO_DOCUMENTO", e.target.value)}
          className="bg-white border border-slate-300 text-xs font-bold rounded-lg px-3 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="TERMO CIRCUNSTANCIADO">TERMO CIRCUNSTANCIADO (Pena ≤ 2 anos)</option>
          <option value="NOTIFICAÇÃO DE INFRAÇÃO PENAL AMBIENTAL">
            NOTIFICAÇÃO DE INFRAÇÃO PENAL AMBIENTAL (Pena &gt; 2 anos)
          </option>
        </select>
      </div>

      {/* Grid of form fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2">
        {/* Infrator & Tipificação */}
        <div className="space-y-1">
          <label className="text-slate-700 font-bold flex items-center justify-between">
            <span>&#123;&#123; NOME_INFRATOR &#125;&#123;</span>
            <span className="text-[10px] text-slate-500 font-normal">Nome do Autuado</span>
          </label>
          <input
            type="text"
            value={data.NOME_INFRATOR}
            onChange={(e) => handleChange("NOME_INFRATOR", e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-slate-700 font-bold flex items-center justify-between">
            <span>&#123;&#123; LEI_ENQUADRAMENTO &#125;&#123;</span>
            <span className="text-[10px] text-slate-500 font-normal">Artigo(s) da Lei 9.605/98</span>
          </label>
          <input
            type="text"
            value={data.LEI_ENQUADRAMENTO}
            onChange={(e) => handleChange("LEI_ENQUADRAMENTO", e.target.value)}
            placeholder="Ex: Art. 38-A e Art. 60 da Lei Federal nº 9.605/1998"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* AIA & SADE */}
        <div className="space-y-1">
          <label className="text-slate-700 font-bold flex items-center justify-between">
            <span>&#123;&#123; AIA_NUMERO &#125;&#123;</span>
            <span className="text-[10px] text-slate-500 font-normal">Auto(s) de Infração</span>
          </label>
          <input
            type="text"
            value={data.AIA_NUMERO}
            onChange={(e) => handleChange("AIA_NUMERO", e.target.value)}
            placeholder="Ex: 17585-E ou 17585-E e 17586-E"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-slate-700 font-bold flex items-center justify-between">
            <span>&#123;&#123; NUMERO_SADE &#125;&#123;</span>
            <span className="text-[10px] text-slate-500 font-normal">Protocolo SADE</span>
          </label>
          <input
            type="text"
            value={data.NUMERO_SADE}
            onChange={(e) => handleChange("NUMERO_SADE", e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* Data & Hora Fato */}
        <div className="space-y-1">
          <label className="text-slate-700 font-bold flex items-center justify-between">
            <span>&#123;&#123; DATA_FATO &#125;&#123; / &#123;&#123; HORA_FATO &#125;&#123;</span>
            <span className="text-[10px] text-slate-500 font-normal">Data / Hora</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={data.DATA_FATO}
              onChange={(e) => handleChange("DATA_FATO", e.target.value)}
              placeholder="DD/MM/AAAA"
              className="w-1/2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
            />
            <input
              type="text"
              value={data.HORA_FATO}
              onChange={(e) => handleChange("HORA_FATO", e.target.value)}
              placeholder="HH:MM"
              className="w-1/2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Coordenadas */}
        <div className="space-y-1">
          <label className="text-slate-700 font-bold flex items-center justify-between">
            <span>&#123;&#123; COORDENADAS_UTM &#125;&#123;</span>
            <span className="text-[10px] text-slate-500 font-normal">Coordenadas / UTM</span>
          </label>
          <input
            type="text"
            value={data.COORDENADAS_UTM}
            onChange={(e) => handleChange("COORDENADAS_UTM", e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* Endereço */}
        <div className="space-y-1 md:col-span-2">
          <label className="text-slate-700 font-bold flex items-center justify-between">
            <span>&#123;&#123; ENDEREÇO &#125;&#123;</span>
            <span className="text-[10px] text-slate-500 font-normal">Local Completo com Município/UF</span>
          </label>
          <input
            type="text"
            value={data.ENDEREÇO}
            onChange={(e) => handleChange("ENDEREÇO", e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* Agentes */}
        <div className="space-y-1 md:col-span-2">
          <label className="text-slate-700 font-bold flex items-center justify-between">
            <span>&#123;&#123; AGENTES_ATENDENTES &#125;&#123;</span>
            <span className="text-[10px] text-slate-500 font-normal">Posto/Graduação e Nomes</span>
          </label>
          <input
            type="text"
            value={data.AGENTES_ATENDENTES}
            onChange={(e) => handleChange("AGENTES_ATENDENTES", e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* Resumo da Fiscalização */}
        <div className="space-y-1 md:col-span-2">
          <label className="text-slate-700 font-bold flex items-center justify-between">
            <span>&#123;&#123; RESUMO_RELATORIO_FISCALIZACAO &#125;&#123;</span>
            <span className="text-[10px] text-blue-600 font-semibold">Autoria e Materialidade</span>
          </label>
          <textarea
            rows={4}
            value={data.RESUMO_RELATORIO_FISCALIZACAO}
            onChange={(e) => handleChange("RESUMO_RELATORIO_FISCALIZACAO", e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 font-medium leading-relaxed focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* Processos GAIA & SGPE */}
        <div className="space-y-1">
          <label className="text-slate-700 font-bold flex items-center justify-between">
            <span>&#123;&#123; PROCESSO_GAIA &#125;&#123;</span>
            <span className="text-[10px] text-slate-500 font-normal">Sistema GAIA</span>
          </label>
          <input
            type="text"
            value={data.PROCESSO_GAIA}
            onChange={(e) => handleChange("PROCESSO_GAIA", e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-slate-700 font-bold flex items-center justify-between">
            <span>&#123;&#123; PROCESSO_SGPE &#125;&#123;</span>
            <span className="text-[10px] text-slate-500 font-normal">Processo SGP-e</span>
          </label>
          <input
            type="text"
            value={data.PROCESSO_SGPE}
            onChange={(e) => handleChange("PROCESSO_SGPE", e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* Embargo TE & Descrição */}
        <div className="space-y-1">
          <label className="text-slate-700 font-bold flex items-center justify-between">
            <span>&#123;&#123; TE_NUMERO &#125;&#123;</span>
            <span className="text-[10px] text-slate-500 font-normal">Termo(s) de Embargo</span>
          </label>
          <input
            type="text"
            value={data.TE_NUMERO}
            onChange={(e) => handleChange("TE_NUMERO", e.target.value)}
            placeholder="Ex: 1234-E ou 1234-E e 1235-E"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-slate-700 font-bold flex items-center justify-between">
            <span>&#123;&#123; BO_NUMERO &#125;&#123;</span>
            <span className="text-[10px] text-slate-500 font-normal">Número do BO/BOTC</span>
          </label>
          <input
            type="text"
            value={data.BO_NUMERO}
            onChange={(e) => handleChange("BO_NUMERO", e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="text-slate-700 font-bold flex items-center justify-between">
            <span>&#123;&#123; DESCRICAO_TE &#125;&#123;</span>
            <span className="text-[10px] text-slate-500 font-normal">Objeto do(s) Embargo(s)</span>
          </label>
          <input
            type="text"
            value={data.DESCRICAO_TE}
            onChange={(e) => handleChange("DESCRICAO_TE", e.target.value)}
            placeholder="Ex: 1,5 ha de vegetação nativa no TE 1234-E e 0,8 ha de APP no TE 1235-E"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="text-slate-700 font-bold flex items-center justify-between">
            <span>&#123;&#123; ANEXOS_LISTA &#125;&#125;</span>
            <span className="text-[10px] text-blue-600 font-semibold">1 item por linha (Editável)</span>
          </label>
          <textarea
            rows={4}
            value={
              data.ANEXOS_LISTA ??
              `1. Boletim de Ocorrência nº ${data.BO_NUMERO || "---"};
2. Auto de Infração Ambiental n. ${data.AIA_NUMERO || "---"};
3. Termo de Embargo/Suspensão n. ${data.TE_NUMERO || "---"};
4. Relatório de Fiscalização;
5. Relatório fotográfico, mapas e listas de coordenadas;
6. Cópias dos documentos pessoais, contrato social e registro do imóvel rural.`
            }
            onChange={(e) => handleChange("ANEXOS_LISTA", e.target.value)}
            placeholder="Digite os anexos, um por linha..."
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-medium leading-relaxed focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="text-slate-700 font-bold flex items-center justify-between">
            <span>&#123;&#123; DATA_ATUAL &#125;&#125;</span>
            <span className="text-[10px] text-slate-500 font-normal">Data Extenso</span>
          </label>
          <input
            type="text"
            value={data.DATA_ATUAL}
            onChange={(e) => handleChange("DATA_ATUAL", e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* Autoridade Signatária */}
        <div className="md:col-span-2 mt-3 pt-3 border-t border-slate-200 bg-slate-50/70 p-3 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span>✍️</span> Autoridade Signatária / Comando
            </h4>
            <button
              type="button"
              onClick={() => {
                onChange({
                  ...data,
                  AUTORIDADE_NOME: "Andréia Cristina Fergitz",
                  AUTORIDADE_CARGO: "Tenente Coronel PM - Comandante do 2ºBPMA",
                });
              }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 transition-colors cursor-pointer"
            >
              Restaurar Padrão
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">
                Nome da Autoridade
              </label>
              <input
                type="text"
                value={data.AUTORIDADE_NOME ?? "Andréia Cristina Fergitz"}
                onChange={(e) => handleChange("AUTORIDADE_NOME", e.target.value)}
                placeholder="Andréia Cristina Fergitz"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">
                Posto / Cargo / Função
              </label>
              <input
                type="text"
                value={data.AUTORIDADE_CARGO ?? "Tenente Coronel PM - Comandante do 2ºBPMA"}
                onChange={(e) => handleChange("AUTORIDADE_CARGO", e.target.value)}
                placeholder="Tenente Coronel PM - Comandante do 2ºBPMA"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

