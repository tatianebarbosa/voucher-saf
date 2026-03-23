import {
  buildVoucherCode,
  formatCpf,
  formatInstallmentPlan,
  formatRequesterSummaryLabel,
  formatRequesterType,
  formatRequestType,
} from "@/lib/formatters";
import {
  countRequestFamilies,
  countRequestStudents,
  getRequestFamilyGroups,
} from "@/lib/request-family-groups";
import type {
  GeneratedTexts,
  RequestFamilyGroup,
  RequestDraft,
  RequestStatus,
  StoredVoucherRequest,
  VoucherRequest,
} from "@/types/request";

function buildEmailTitle(data: RequestDraft) {
  const requesterTypeLabel = formatRequesterType(data.requesterType);

  if (data.requestType === "desconto") {
    return `Exceção SAF | Desconto ${data.discountPercentage}% | ${data.schoolName} | ${requesterTypeLabel} | Código do atendimento ${data.ticketNumber}`;
  }

  if (data.requestType === "parcelamento") {
    return `Exceção SAF | ${formatInstallmentPlan(data.installmentCount)} | ${data.schoolName} | ${requesterTypeLabel} | Código do atendimento ${data.ticketNumber}`;
  }

  return `Exceção SAF | Desmembramento ${data.campaignVoucherCode ?? "de voucher"} | ${data.schoolName} | ${requesterTypeLabel} | Código do atendimento ${data.ticketNumber}`;
}

function buildRequesterBulletLines(data: RequestDraft) {
  return [
    `- Tipo de solicitante: ${formatRequesterType(data.requesterType)}`,
    `- ${formatRequesterSummaryLabel(data.requesterType)}: ${data.requesterName}`,
  ];
}

function buildRequesterSentence(data: RequestDraft) {
  if (data.requesterType === "responsavel") {
    return `Solicitação aberta por responsável: ${data.requesterName}.`;
  }

  return `Solicitação aberta pela escola. Contato informado: ${data.requesterName}.`;
}

function buildFamilyStudentSummary(group: RequestFamilyGroup) {
  return group.students
    .map((student) => `${student.studentName} (${student.studentClassName})`)
    .join(", ");
}

function buildStudentBulletLines(data: RequestDraft) {
  const familyGroups = getRequestFamilyGroups(data);
  const lines: string[] = [];

  if (familyGroups.length === 0) {
    return lines;
  }

  if (familyGroups.length === 1) {
    if (data.studentNames.trim()) {
      lines.push(`- Aluno(s): ${data.studentNames}`);
    }

    if (data.studentClassName.trim()) {
      lines.push(`- Turma(s): ${data.studentClassName}`);
    }

    return lines;
  }

  lines.push(
    `- Famílias na solicitação: ${countRequestFamilies(familyGroups)} família(s) / ${countRequestStudents(familyGroups)} aluno(s)`,
  );
  familyGroups.forEach((group, index) => {
    lines.push(`- Família ${index + 1}: ${buildFamilyStudentSummary(group)}`);
  });

  return lines;
}

function buildStudentSentence(data: RequestDraft) {
  const familyGroups = getRequestFamilyGroups(data);
  const parts: string[] = [];

  if (familyGroups.length === 0) {
    return "";
  }

  if (familyGroups.length === 1) {
    if (data.studentNames.trim()) {
      parts.push(`aluno(s): ${data.studentNames}`);
    }

    if (data.studentClassName.trim()) {
      parts.push(`turma(s): ${data.studentClassName}`);
    }

    if (parts.length === 0) {
      return "";
    }

    return `Dados acadêmicos informados: ${parts.join(" | ")}.`;
  }

  const familiesSummary = familyGroups
    .map((group, index) => `família ${index + 1}: ${buildFamilyStudentSummary(group)}`)
    .join(" | ");

  return `Dados acadêmicos informados para ${countRequestFamilies(familyGroups)} família(s): ${familiesSummary}.`;
}

function buildResponsiblesText(data: RequestDraft) {
  const familyGroups = getRequestFamilyGroups(data);

  if (familyGroups.length <= 1) {
    return `${data.responsible1Name} (CPF ${formatCpf(
      data.responsible1Cpf,
    )}) e ${data.responsible2Name} (CPF ${formatCpf(data.responsible2Cpf)})`;
  }

  return familyGroups
    .map(
      (group, index) =>
        `Família ${index + 1}: ${group.responsible1Name} (CPF ${formatCpf(group.responsible1Cpf)}) e ${group.responsible2Name} (CPF ${formatCpf(group.responsible2Cpf)})`,
    )
    .join(" | ");
}

function buildEmailBody(
  data: RequestDraft,
  validityLabel: string,
  voucherCode?: string,
) {
  const requestLabel = formatRequestType(data.requestType).toLowerCase();
  const responsiblesText = buildResponsiblesText(data);

  if (data.requestType === "desconto") {
    return [
      "Prezados Comercial e Diretoria,",
      "",
      "Solicitamos a avaliação da seguinte exceção comercial:",
      `- Escola: ${data.schoolName}`,
      `- Código do atendimento: ${data.ticketNumber}`,
      ...buildRequesterBulletLines(data),
      ...buildStudentBulletLines(data),
      `- Origem: ${data.origin}`,
      `- Tipo: ${requestLabel}`,
      `- Condição solicitada: ${data.discountPercentage}% de desconto`,
      `- Responsáveis vinculados: ${responsiblesText}`,
      `- Validade automática após aprovação: ${validityLabel}`,
      `- Justificativa: ${data.justification}`,
      voucherCode ? `- Código sugerido do voucher: ${voucherCode}` : "",
      "",
      "Ficamos a disposição para sequência da tratativa.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (data.requestType === "desmembramento") {
    return [
      "Prezados Comercial e Diretoria,",
      "",
      "Solicitamos a avaliação da seguinte demanda operacional:",
      `- Escola: ${data.schoolName}`,
      `- Código do atendimento: ${data.ticketNumber}`,
      ...buildRequesterBulletLines(data),
      `- Origem: ${data.origin}`,
      `- Tipo: ${requestLabel}`,
      `- Código do voucher informado: ${data.campaignVoucherCode ?? "Não informado"}`,
      `- Desmembramento solicitado: ${data.splitInstruction ?? "Não informado"}`,
      `- Referência de validade: ${validityLabel}`,
      `- Justificativa: ${data.justification}`,
      "",
      "Ficamos a disposição para sequência da tratativa.",
    ].join("\n");
  }

  return [
    "Prezados Comercial e Diretoria,",
    "",
    "Solicitamos a avaliação da seguinte exceção comercial:",
    `- Escola: ${data.schoolName}`,
    `- Código do atendimento: ${data.ticketNumber}`,
    ...buildRequesterBulletLines(data),
    ...buildStudentBulletLines(data),
    `- Origem: ${data.origin}`,
    `- Tipo: ${requestLabel}`,
    `- Condição solicitada: ${formatInstallmentPlan(data.installmentCount)}`,
    `- Responsáveis vinculados a condição aprovada: ${responsiblesText}`,
    "- Observação: o parcelamento deverá ser aplicado a todos os CPFs cadastrados nesta solicitação.",
    `- Validade automática após aprovação: ${validityLabel}`,
    `- Justificativa: ${data.justification}`,
    "",
    "Ficamos a disposição para sequência da tratativa.",
  ].join("\n");
}

function buildApprovalMessage(
  data: RequestDraft,
  validityLabel: string,
  voucherCode?: string,
) {
  const responsiblesText = buildResponsiblesText(data);

  if (data.requestType === "desconto") {
    return [
      `A solicitação de desconto para ${data.schoolName} foi aprovada com ${data.discountPercentage}% de desconto.`,
      buildRequesterSentence(data),
      buildStudentSentence(data),
      `Validade automática: ${validityLabel}.`,
      `Responsáveis vinculados: ${responsiblesText}.`,
      voucherCode ? `Código gerado: ${voucherCode}.` : "",
      `Código do atendimento de referência: ${data.ticketNumber}.`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (data.requestType === "desmembramento") {
    return [
      `A solicitação de desmembramento para ${data.schoolName} foi aprovada.`,
      buildRequesterSentence(data),
      `Código do voucher informado: ${data.campaignVoucherCode ?? "Não informado"}.`,
      `Desmembramento aprovado: ${data.splitInstruction ?? "Não informado"}.`,
      `Referência de validade: ${validityLabel}.`,
      `Código do atendimento de referência: ${data.ticketNumber}.`,
    ].join(" ");
  }

  return [
    `A solicitação de parcelamento para ${data.schoolName} foi aprovada em ${formatInstallmentPlan(data.installmentCount)}.`,
    buildRequesterSentence(data),
    buildStudentSentence(data),
    `Validade automática: ${validityLabel}.`,
    `Aplicar a condição a todos os responsáveis cadastrados: ${responsiblesText}.`,
    `Código do atendimento de referência: ${data.ticketNumber}.`,
  ].join(" ");
}

function buildMagentoDescription(
  data: RequestDraft,
  validityLabel: string,
  voucherCode?: string,
) {
  const responsiblesText = buildResponsiblesText(data);

  if (data.requestType === "desconto") {
    return [
      `Voucher de exceção SAF para ${data.schoolName}.`,
      buildRequesterSentence(data),
      buildStudentSentence(data),
      `Desconto aprovado: ${data.discountPercentage}%.`,
      `Responsáveis: ${responsiblesText}.`,
      `Validade: ${validityLabel}.`,
      voucherCode ? `Código: ${voucherCode}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (data.requestType === "desmembramento") {
    return [
      `Desmembramento de voucher para ${data.schoolName}.`,
      buildRequesterSentence(data),
      `Voucher informado: ${data.campaignVoucherCode ?? "Não informado"}.`,
      `Instrução operacional: ${data.splitInstruction ?? "Não informado"}.`,
      `Referência de validade: ${validityLabel}.`,
    ].join(" ");
  }

  return [
    `Parcelamento de exceção SAF para ${data.schoolName} em ${formatInstallmentPlan(data.installmentCount)}.`,
    buildRequesterSentence(data),
    buildStudentSentence(data),
    `Aplicar a condição aos responsáveis cadastrados: ${responsiblesText}.`,
    `Validade: ${validityLabel}.`,
  ].join(" ");
}

export function generateTexts(data: RequestDraft): GeneratedTexts {
  const validityLabel =
    data.requestType === "desconto"
      ? "15 dias corridos após aprovação"
      : data.requestType === "parcelamento"
        ? "10 dias corridos após aprovação"
        : "Mesma validade do voucher de origem";
  const voucherCode =
    data.requestType === "desconto" && data.discountPercentage
      ? buildVoucherCode(
          data.schoolName,
          data.discountPercentage,
          data.requesterName,
        )
      : undefined;

  return {
    validityLabel,
    emailTitle: buildEmailTitle(data),
    emailBody: buildEmailBody(data, validityLabel, voucherCode),
    approvalMessage: buildApprovalMessage(data, validityLabel, voucherCode),
    magentoDescription: buildMagentoDescription(
      data,
      validityLabel,
      voucherCode,
    ),
    voucherCode,
  };
}

export function createVoucherRequest(
  data: RequestDraft,
  status: RequestStatus = "Recebida",
): VoucherRequest {
  const now = new Date().toISOString();
  const normalizedDraft = {
    ...data,
    ticketNumber: data.ticketNumber ?? "TK-PENDENTE",
  };

  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status,
    ...normalizedDraft,
    generatedTexts: generateTexts(normalizedDraft),
  };
}

export function attachGeneratedTexts(
  request: StoredVoucherRequest,
): VoucherRequest {
  const {
    schoolId,
    schoolName,
    schoolExternalId,
    schoolEmail,
    ticketNumber,
    requesterType,
    requesterName,
    origin,
    justification,
    familyGroups,
    studentNames,
    studentClassName,
    requestType,
    responsible1Name,
    responsible1Cpf,
    responsible2Name,
    responsible2Cpf,
    discountPercentage,
    installmentCount,
    campaignVoucherCode,
    splitInstruction,
  } = request;

  return {
    ...request,
    generatedTexts: generateTexts({
      schoolId,
      schoolName,
      schoolExternalId,
      schoolEmail,
      ticketNumber,
      requesterType,
      requesterName,
      origin,
      justification,
      familyGroups,
      studentNames,
      studentClassName,
      requestType,
      responsible1Name,
      responsible1Cpf,
      responsible2Name,
      responsible2Cpf,
      discountPercentage,
      installmentCount,
      campaignVoucherCode,
      splitInstruction,
    }),
  };
}

export function buildRequestStatusMessage(request: VoucherRequest) {
  if (request.status === "Pronta para envio") {
    return request.generatedTexts.approvalMessage;
  }

  if (request.status === "Negada") {
    return [
      `A solicitação para ${request.schoolName} foi negada pelo SAF.`,
      request.decisionReason
        ? `Motivo informado: ${request.decisionReason}.`
        : "",
      `Código do atendimento de referência: ${request.ticketNumber}.`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (request.status === "Em analise") {
    return `A solicitação para ${request.schoolName} está em análise pelo SAF. Código do atendimento de referência: ${request.ticketNumber}.`;
  }

  return `A solicitação para ${request.schoolName} foi recebida e aguarda análise do SAF. Código do atendimento de referência: ${request.ticketNumber}.`;
}
