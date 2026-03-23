export type RequestType =
  | "desconto"
  | "parcelamento"
  | "desmembramento";

export type RequesterType = "responsavel" | "escola";

export type RequestStatus =
  | "Recebida"
  | "Em analise"
  | "Pronta para envio"
  | "Negada";

export type RequestTypeFilter = "todos" | RequestType;

export type RequestStatusFilter = "todos" | RequestStatus;

export const REQUEST_STATUS_OPTIONS: RequestStatus[] = [
  "Recebida",
  "Em analise",
  "Pronta para envio",
  "Negada",
];

export const REQUESTER_TYPE_OPTIONS: RequesterType[] = [
  "responsavel",
  "escola",
];

export interface RequestStudentEntry {
  studentName: string;
  studentClassName: string;
}

export interface RequestFamilyGroup {
  students: RequestStudentEntry[];
  responsible1Name: string;
  responsible1Cpf: string;
  responsible2Name: string;
  responsible2Cpf: string;
}

export interface GeneratedTexts {
  validityLabel: string;
  emailTitle: string;
  emailBody: string;
  approvalMessage: string;
  magentoDescription: string;
  voucherCode?: string;
}

export interface VoucherRequest {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: RequestStatus;
  decisionReason?: string;
  schoolId?: string;
  schoolName: string;
  schoolExternalId?: string;
  schoolEmail?: string;
  ticketNumber: string;
  requesterType: RequesterType;
  requesterName: string;
  origin: string;
  justification: string;
  familyGroups?: RequestFamilyGroup[];
  studentNames: string;
  studentClassName: string;
  requestType: RequestType;
  responsible1Name: string;
  responsible1Cpf: string;
  responsible2Name: string;
  responsible2Cpf: string;
  discountPercentage?: number;
  installmentCount?: number;
  campaignVoucherCode?: string;
  splitInstruction?: string;
  generatedTexts: GeneratedTexts;
}

export type StoredVoucherRequest = Omit<VoucherRequest, "generatedTexts">;

export interface RequestDraft {
  schoolId?: string;
  schoolName: string;
  schoolExternalId?: string;
  schoolEmail?: string;
  ticketNumber?: string;
  requesterType: RequesterType;
  requesterName: string;
  origin: string;
  justification: string;
  familyGroups?: RequestFamilyGroup[];
  studentNames: string;
  studentClassName: string;
  requestType: RequestType;
  responsible1Name: string;
  responsible1Cpf: string;
  responsible2Name: string;
  responsible2Cpf: string;
  discountPercentage?: number;
  installmentCount?: number;
  campaignVoucherCode?: string;
  splitInstruction?: string;
}

export interface PublicRequestTracking {
  schoolName: string;
  ticketNumber: string;
  createdAt: string;
  requestType: RequestType;
  requesterType: RequesterType;
  status: RequestStatus;
  outcomeLabel: string;
  conditionLabel: string;
  schoolFacingMessage: string;
  validityLabel?: string;
}
