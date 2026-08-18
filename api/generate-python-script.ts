const DEFAULT_EMPTY_DATA = {
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
  DATA_ATUAL: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
  AUTORIDADE_NOME: "Andréia Cristina Fergitz",
  AUTORIDADE_CARGO: "Tenente Coronel PM - Comandante do 2ºBPMA"
};

export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  const data = body.data || DEFAULT_EMPTY_DATA;
  const jsonFormatted = JSON.stringify(data, null, 4);

  const pythonScriptContent = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Preenchimento de Notificação de Infração Ambiental em Formato Word (.docx)
Modelo: Relatório - MODELO.PDF / 01. MOD. NOTIFICAÇÃO - COMUM.docx
Biblioteca principal: python-docx

Pré-requisitos:
    pip install python-docx pypdf
"""

import json
import os
import re
from docx import Document

# 1. DADOS EXTRAÍDOS E MAPEADOS DAS TAGS
DADOS_TAGS = ${jsonFormatted}

def substituir_texto_em_paragrafo(paragrafo, mapa_tags):
    """Substitui tags no parágrafo preservando a formatação do texto."""
    texto_completo = paragrafo.text
    tags_encontradas = [tag for tag in mapa_tags if f"{{" in tag or tag in texto_completo]
    
    if not tags_encontradas and not any(tag in texto_completo for tag in mapa_tags.keys()):
        return

    for chave, valor in mapa_tags.items():
        # Suporta {{ TAG }} e {{TAG}}
        padroes = [f"{{{{{chave}}}}}", f"{{{{ {chave} }}}}", f"{{{chave}}}"]
        for padrao in padroes:
            if padrao in paragrafo.text:
                # Substituição no nível de runs para manter formatação
                for run in paragrafo.runs:
                    if padrao in run.text:
                        run.text = run.text.replace(padrao, str(valor))
                # Se a tag ficou dividida entre múltiplos runs:
                if padrao in paragrafo.text:
                    paragrafo.text = paragrafo.text.replace(padrao, str(valor))

def preencher_notificacao_docx(caminho_modelo, caminho_saida, dados):
    """Carrega o arquivo .docx modelo e realiza a substituição das tags."""
    if not os.path.exists(caminho_modelo):
        print(f"[AVISO] Arquivo modelo '{caminho_modelo}' não encontrado localmente.")
        print("Criando novo documento Word com a estrutura padrão...")
        doc = Document()
        
        # Cabeçalho
        p = doc.add_paragraph()
        p.alignment = 1 # Centralizado
        run = p.add_run("2º BATALHÃO DE POLÍCIA MILITAR AMBIENTAL\\n")
        run.bold = True
        p.add_run("Avenida Fernando Machado, 1870-D, Chapecó-SC, CEP 89803-000, Fone (49) 3321-0180\\n")
        
        # Título
        p_tipo = doc.add_paragraph()
        p_tipo.alignment = 1
        run_tipo = p_tipo.add_run(f"\\n{dados.get('TIPO_DOCUMENTO')}\\n")
        run_tipo.bold = True
        
        doc.add_paragraph(f"Autor dos Fatos: {dados.get('NOME_INFRATOR')}   Tipificação Penal: {dados.get('LEI_ENQUADRAMENTO')}   AIA n. {dados.get('AIA_NUMERO')}")
        doc.add_paragraph(f"Origem: {dados.get('NUMERO_SADE')}")
        doc.add_paragraph(f"Data/Hora dos Fatos: {dados.get('DATA_FATO')} às {dados.get('HORA_FATO')}")
        doc.add_paragraph(f"Local: {dados.get('ENDEREÇO')}")
        doc.add_paragraph(f"Coordenada: {dados.get('COORDENADAS_UTM')}")
        doc.add_paragraph(f"Atendentes: {dados.get('AGENTES_ATENDENTES')}")
        
        doc.add_heading("SÍNTESE DOS FATOS E MATERIALIDADE", level=2)
        doc.add_paragraph(dados.get('RESUMO_RELATORIO_FISCALIZACAO'))
        
        doc.add_heading("PROVIDÊNCIAS ADMINISTRATIVAS", level=2)
        doc.add_paragraph(f"Em decorrência dos fatos, visando individualizar a autoria e impedir a continuidade das intervenções irregulares para evitar o agravamento do dano, foram adotadas as seguintes medidas, já inseridas no sistema GAIA sob o Processo n. {dados.get('PROCESSO_GAIA')} (Processo PMSC {dados.get('PROCESSO_SGPE')}):")
        doc.add_paragraph(f"• Auto de Infração Ambiental: {dados.get('AIA_NUMERO')}")
        doc.add_paragraph(f"• Embargo/Suspensão: {dados.get('TE_NUMERO')} ({dados.get('DESCRICAO_TE')})")
        
        doc.add_heading("ANEXOS", level=2)
        doc.add_paragraph("Diante do exposto, encaminho o presente procedimento à Vossa Excelência, instruído com as seguintes peças:")
        doc.add_paragraph(f"1. Boletim de Ocorrência nº {dados.get('BO_NUMERO')};")
        doc.add_paragraph(f"2. Auto de Infração Ambiental n. {dados.get('AIA_NUMERO')};")
        doc.add_paragraph(f"3. Termo de Embargo/Suspensão n. {dados.get('TE_NUMERO')};")
        doc.add_paragraph("4. Relatório de Fiscalização;")
        doc.add_paragraph("5. Relatório fotográfico, mapas e listas de coordenadas;")
        doc.add_paragraph("6. Cópias dos documentos pessoais, contrato social e registro do imóvel rural.")
        
        doc.add_paragraph(f"\\nChapecó, {dados.get('DATA_ATUAL')}.\\n")
        
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
    print(f"[SUCESSO] Notificação gerada com sucesso em: {os.path.abspath(caminho_saida)}")

if __name__ == "__main__":
    modelo_file = "01. MOD. NOTIFICAÇÃO - COMUM.docx"
    saida_file = f"Notificacao_Preenchida_{DADOS_TAGS['NOME_INFRATOR'].replace(' ', '_')}.docx"
    
    preencher_notificacao_docx(modelo_file, saida_file, DADOS_TAGS)
`;

  res.setHeader("Content-Type", "text/x-python");
  res.setHeader("Content-Disposition", 'attachment; filename="preencher_notificacao.py"');
  return res.send(pythonScriptContent);
}
