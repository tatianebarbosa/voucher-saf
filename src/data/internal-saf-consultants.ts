export interface InternalSafConsultant {
  canonicalName: string;
  displayName: string;
  email: string;
}

function buildShortDisplayName(displayName: string) {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length <= 1) {
    return displayName.trim();
  }

  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export const INTERNAL_SAF_CONSULTANTS: InternalSafConsultant[] = [
  {
    canonicalName: "INGRID VANIA MAZZEI DE OLIVEIRA",
    displayName: "Ingrid Vania Mazzei de Oliveira",
    email: "ingridv.oliveira@mbcentral.com.br",
  },
  {
    canonicalName: "JOAO FELIPE GUTIERREZ DE FREITAS",
    displayName: "Joao Felipe Gutierrez de Freitas",
    email: "joao.freitas@mbcentral.com.br",
  },
  {
    canonicalName: "JAMILLE MARQUES DA SILVA",
    displayName: "Jamille Marques da Silva",
    email: "jamille.silva@mbcentral.com.br",
  },
  {
    canonicalName: "TATIANE BARBOSA DOS SANTOS XAVIER",
    displayName: "Tatiane Barbosa dos Santos Xavier",
    email: "tatiane.xavier@mbcentral.com.br",
  },
  {
    canonicalName: "ANA PAULA OLIVEIRA DE ANDRADE",
    displayName: "Ana Paula Oliveira de Andrade",
    email: "anapa.andrade@mbcentral.com.br",
  },
];

export const INTERNAL_SAF_OWNER_REPLACEMENTS = [
  {
    from: "RAFHAEL NAZEAZENO PEREIRA",
    to: "JAMILLE MARQUES DA SILVA",
  },
  {
    from: "RAFHAEL NAZAZENO PEREIRA",
    to: "JAMILLE MARQUES DA SILVA",
  },
] as const;

export const INTERNAL_SAF_AGENT_OPTIONS = INTERNAL_SAF_CONSULTANTS.map(
  (consultant) => ({
    value: buildShortDisplayName(consultant.displayName),
    label: buildShortDisplayName(consultant.displayName),
  }),
);
