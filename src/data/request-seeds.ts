export interface RequestSeedData {
  status: "Recebida" | "Em analise" | "Pronta para envio";
  data: {
    schoolName: string;
    ticketNumber: string;
    requesterType: "responsavel" | "escola";
    requesterName: string;
    origin: string;
    justification: string;
    studentNames: string;
    studentClassName: string;
    requestType: "desconto" | "parcelamento" | "desmembramento";
    responsible1Name: string;
    responsible1Cpf: string;
    responsible2Name: string;
    responsible2Cpf: string;
    discountPercentage?: number;
    installmentCount?: number;
    campaignVoucherCode?: string;
    splitInstruction?: string;
  };
}

export const requestSeeds: RequestSeedData[] = [
  {
    status: "Pronta para envio",
    data: {
      schoolName: "Maple Bear Campinas",
      ticketNumber: "TK-10452",
      requesterType: "responsavel",
      requesterName: "Larissa Mendes",
      origin: "WhatsApp",
      justification:
        "Família em processo de renegociação para permanencia dos alunos no próximo ciclo.",
      studentNames: "Isabela Mendes",
      studentClassName: "5º ano A",
      requestType: "desconto",
      responsible1Name: "Carla Mendes",
      responsible1Cpf: "11122233344",
      responsible2Name: "Paulo Mendes",
      responsible2Cpf: "55566677788",
      discountPercentage: 15,
    },
  },
  {
    status: "Em analise",
    data: {
      schoolName: "Maple Bear Sao Jose dos Campos",
      ticketNumber: "TK-10467",
      requesterType: "escola",
      requesterName: "Rafael Costa",
      origin: "E-mail",
      justification:
        "Solicitação de adequação do fluxo financeiro da família com inicio no próximo vencimento.",
      studentNames: "Lucas Costa",
      studentClassName: "8º ano B",
      requestType: "parcelamento",
      responsible1Name: "Juliana Costa",
      responsible1Cpf: "10120230340",
      responsible2Name: "Marcelo Costa",
      responsible2Cpf: "90980870760",
      installmentCount: 8,
    },
  },
  {
    status: "Recebida",
    data: {
      schoolName: "Maple Bear Ribeirao Preto",
      ticketNumber: "TK-10503",
      requesterType: "responsavel",
      requesterName: "Amanda Soares",
      origin: "Telefone",
      justification:
        "Necessidade de retenção de matrícula após revisão orçamentária do responsável financeiro.",
      studentNames: "Marina Soares",
      studentClassName: "3º ano A",
      requestType: "desconto",
      responsible1Name: "Fernanda Soares",
      responsible1Cpf: "48474645444",
      responsible2Name: "Bruno Soares",
      responsible2Cpf: "12131415161",
      discountPercentage: 10,
    },
  },
];
