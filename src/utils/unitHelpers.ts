import { UNIDADES_2BPMA, UnitInfo, ExtractedData } from "../types";

export function getUnitById(id: string): UnitInfo {
  const found = UNIDADES_2BPMA.find((u) => u.id === id);
  return found || UNIDADES_2BPMA[0];
}

export function detectUnitByLocation(text: string): UnitInfo {
  if (!text) return UNIDADES_2BPMA[0];
  const normalized = text.toLowerCase();

  for (const unit of UNIDADES_2BPMA) {
    if (normalized.includes(unit.cidade.toLowerCase())) {
      return unit;
    }
    if (unit.municipios) {
      for (const m of unit.municipios) {
        if (normalized.includes(m.toLowerCase())) {
          return unit;
        }
      }
    }
  }

  return UNIDADES_2BPMA[0];
}

export function applyUnitToData(data: ExtractedData, unit: UnitInfo): ExtractedData {
  return {
    ...data,
    UNIDADE_ID: unit.id,
    UNIDADE_NOME: unit.name,
    UNIDADE_ENDERECO: unit.endereco,
    UNIDADE_CONTATO: unit.contato,
    CIDADE_FECHO: unit.cidade,
    AUTORIDADE_NOME: unit.autoridadeNome,
    AUTORIDADE_CARGO: unit.autoridadeCargo,
  };
}
