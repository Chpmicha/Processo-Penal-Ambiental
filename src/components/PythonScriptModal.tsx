import React, { useState } from "react";
import { ExtractedData } from "../types";
import { Terminal, Copy, Check, Download, Play } from "lucide-react";

interface PythonScriptModalProps {
  data: ExtractedData;
  onDownloadScript: () => void;
}

export const PythonScriptModal: React.FC<PythonScriptModalProps> = ({
  data,
  onDownloadScript,
}) => {
  const [copied, setCopied] = useState(false);

  const jsonFormatted = JSON.stringify(data, null, 4);

  const pythonScriptText = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SEÇÃO 2: CÓDIGO PYTHON PRONTO PARA EXECUÇÃO
Script de Preenchimento de Notificação de Infração Ambiental (.docx)
Modelo: 01. MOD. NOTIFICAÇÃO - COMUM.docx / Relatório - MODELO.PDF

Dependências:
    pip install python-docx pypdf
"""

import json
import os
from docx import Document

# DADOS EXTRAÍDOS DAS TAGS DO DOCUMENTO (SEÇÃO 1)
DADOS_TAGS = ${jsonFormatted}

def substituir_texto_em_paragrafo(paragrafo, mapa_tags):
    """Substitui as tags {{ TAG }} mantendo a formatação original."""
    for chave, valor in mapa_tags.items():
        padroes = [f"{{{{{chave}}}}}", f"{{{{ {chave} }}}}", f"{{{chave}}}"]
        for padrao in padroes:
            if padrao in paragrafo.text:
                for run in paragrafo.runs:
                    if padrao in run.text:
                        run.text = run.text.replace(padrao, str(valor))
                if padrao in paragrafo.text:
                    paragrafo.text = paragrafo.text.replace(padrao, str(valor))

def preencher_notificacao_docx(caminho_modelo, caminho_saida, dados):
    """Carrega o modelo .docx e realiza a substituição das tags."""
    if not os.path.exists(caminho_modelo):
        print(f"[Aviso] Modelo '{caminho_modelo}' não encontrado localmente.")
        print("Gerando arquivo .docx diretamente com os dados estruturados...")
        doc = Document()
        
        # Cabeçalho
        p = doc.add_paragraph()
        p.alignment = 0 # Esquerda
        r1 = p.add_run("POLÍCIA MILITAR DE SANTA CATARINA\\n")
        r1.bold = True
        r2 = p.add_run("2º Batalhão de Polícia Militar Ambiental\\n")
        r2.bold = True
        r3 = p.add_run("Avenida Fernando Machado, 1870-D, Chapecó-SC, CEP 89803-000\\nFone: (49) 3321-0180 | E-mail: 2bpmachapecop3@pm.sc.gov.br\\n")
        
        # Tipo de Documento (3 linhas antes e 3 linhas depois)
        p_tipo = doc.add_paragraph()
        p_tipo.alignment = 1
        r_t = p_tipo.add_run(f"\\n\\n\\n{dados.get('TIPO_DOCUMENTO')}\\n\\n\\n")
        r_t.bold = True
        r_t.underline = True
        
        # 3 Colunas de Metadados
        tbl_meta = doc.add_table(rows=1, cols=3)
        tbl_meta.autofit = False
        row_m = tbl_meta.rows[0]
        
        p1 = row_m.cells[0].paragraphs[0]
        r = p1.add_run("Autor dos Fatos:\\n"); r.bold = True
        p1.add_run(f"{dados.get('NOME_INFRATOR')}")
        
        p2 = row_m.cells[1].paragraphs[0]
        r = p2.add_run("Tipificação Penal:\\n"); r.bold = True
        p2.add_run(f"{dados.get('LEI_ENQUADRAMENTO')}")
        
        p3 = row_m.cells[2].paragraphs[0]
        r = p3.add_run("Auto de Infração:\\n"); r.bold = True
        p3.add_run(f"AIA n. {dados.get('AIA_NUMERO')}")
        
        doc.add_paragraph()
        
        # Caixa de Destaque em Tabela Largura Total (Origem, Data/Hora, Local, Coordenada, Atendentes)
        tbl_box = doc.add_table(rows=1, cols=1)
        tbl_box.autofit = False
        cell_box = tbl_box.cell(0, 0)
        
        p_box = cell_box.paragraphs[0]
        runs = [
            ("Origem: ", f"{dados.get('NUMERO_SADE')}\\n"),
            ("Data/Hora dos Fatos: ", f"{dados.get('DATA_FATO')} às {dados.get('HORA_FATO')}\\n"),
            ("Local: ", f"{dados.get('ENDEREÇO')}\\n"),
            ("Coordenada: ", f"{dados.get('COORDENADAS_UTM')}\\n"),
            ("Atendentes: ", f"{dados.get('AGENTES_ATENDENTES')}")
        ]
        for label, val in runs:
            r_l = p_box.add_run(label); r_l.bold = True
            p_box.add_run(val)
        
        doc.add_paragraph("")  # 2 linhas de espaço antes do título
        doc.add_heading("SÍNTESE DOS FATOS E MATERIALIDADE", level=2)
        doc.add_paragraph(dados.get('RESUMO_RELATORIO_FISCALIZACAO'))
        
        doc.add_paragraph("")  # 2 linhas de espaço antes do título
        doc.add_heading("PROVIDÊNCIAS ADMINISTRATIVAS", level=2)
        doc.add_paragraph(f"Em decorrência dos fatos, visando individualizar a autoria e impedir a continuidade das intervenções irregulares para evitar o agravamento do dano, foram adotadas as seguintes medidas, já inseridas no sistema GAIA sob o Processo n. {dados.get('PROCESSO_GAIA')} (Processo PMSC {dados.get('PROCESSO_SGPE')}):")
        doc.add_paragraph(f"• Auto de Infração Ambiental: {dados.get('AIA_NUMERO')}")
        doc.add_paragraph(f"• Embargo/Suspensão: {dados.get('TE_NUMERO')} ({dados.get('DESCRICAO_TE')})")
        
        doc.add_paragraph("")  # 2 linhas de espaço antes do título
        doc.add_heading("ANEXOS", level=2)
        doc.add_paragraph("Diante do exposto, encaminho o presente procedimento à Vossa Excelência, instruído com as seguintes peças:")
        anexos_raw = dados.get('ANEXOS_LISTA')
        if anexos_raw and len(anexos_raw.strip()) > 0:
            for item in anexos_raw.splitlines():
                if item.strip():
                    doc.add_paragraph(item.strip())
        else:
            doc.add_paragraph(f"1. Boletim de Ocorrência nº {dados.get('BO_NUMERO')};")
            doc.add_paragraph(f"2. Auto de Infração Ambiental n. {dados.get('AIA_NUMERO')};")
            doc.add_paragraph(f"3. Termo de Embargo/Suspensão n. {dados.get('TE_NUMERO')};")
            doc.add_paragraph("4. Relatório de Fiscalização;")
            doc.add_paragraph("5. Relatório fotográfico, mapas e listas de coordenadas;")
            doc.add_paragraph("6. Cópias dos documentos pessoais, contrato social e registro do imóvel rural.")
        
        # 3 linhas antes e 3 linhas depois da data
        doc.add_paragraph("\\n\\n\\n")
        p_data = doc.add_paragraph(f"Chapecó, {dados.get('DATA_ATUAL')}.")
        p_data.alignment = 1
        doc.add_paragraph("\\n\\n\\n")
        
        p_sig = doc.add_paragraph()
        p_sig.alignment = 1
        nome_autoridade = dados.get('AUTORIDADE_NOME', 'Andréia Cristina Fergitz')
        cargo_autoridade = dados.get('AUTORIDADE_CARGO', 'Tenente Coronel PM - Comandante do 2ºBPMA')
        p_sig.add_run(f"{nome_autoridade}\\n").bold = True
        p_sig.add_run(f"{cargo_autoridade}\\nAutoridade Ambiental Fiscalizadora\\n(Documento assinado eletronicamente)")
    else:
        doc = Document(caminho_modelo)
        for p in doc.paragraphs:
            substituir_texto_em_paragrafo(p, dados)
        for tabela in doc.tables:
            for linha in tabela.rows:
                for celula in linha.cells:
                    for p in celula.paragraphs:
                        substituir_texto_em_paragrafo(p, dados)

    doc.save(caminho_saida)
    print(f"[SUCESSO] Arquivo gerado em: {os.path.abspath(caminho_saida)}")

if __name__ == "__main__":
    modelo = "01. MOD. NOTIFICAÇÃO - COMUM.docx"
    saida = f"Notificacao_{DADOS_TAGS['NOME_INFRATOR'].replace(' ', '_')}.docx"
    preencher_notificacao_docx(modelo, saida, DADOS_TAGS)
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonScriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            SEÇÃO 2: Script Python Pronto para Execução Local (`python-docx`)
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
                <span>Copiar Código</span>
              </>
            )}
          </button>

          <button
            onClick={onDownloadScript}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar preencher_notificacao.py</span>
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Este script carrega o modelo <code className="text-emerald-400 font-mono">01. MOD. NOTIFICAÇÃO - COMUM.docx</code>,
        faz a substituição de todas as 17 tags com os dados extraídos acima e salva a notificação em Word.
      </p>

      <div className="relative">
        <pre className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-200 border border-slate-800 overflow-x-auto max-h-[400px]">
          <code>{pythonScriptText}</code>
        </pre>
      </div>
    </div>
  );
};
