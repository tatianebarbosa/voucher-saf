export const VOUCHER_TYPE_OPTIONS = ["campanha", "outro"] as const;

export type VoucherType = (typeof VOUCHER_TYPE_OPTIONS)[number];

export const VOUCHER_STATUS_OPTIONS = [
  "rascunho",
  "ativo",
  "enviado",
  "esgotado",
  "expirado",
  "cancelado",
] as const;

export type VoucherStatus = (typeof VOUCHER_STATUS_OPTIONS)[number];

export interface SchoolVoucher {
  id: string;
  schoolId?: string;
  schoolExternalId?: string;
  schoolName: string;
  voucherType: VoucherType;
  campaignName: string;
  voucherCode: string;
  quantityAvailable: number;
  quantitySent: number;
  sentToEmail?: string;
  sentAt?: string;
  expiresAt?: string;
  status: VoucherStatus;
  sourceFile?: string;
  sourceSheet?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherDraft {
  schoolId?: string;
  schoolExternalId?: string;
  schoolName: string;
  voucherType: VoucherType;
  campaignName: string;
  voucherCode: string;
  quantityAvailable: number;
  quantitySent: number;
  sentToEmail?: string;
  sentAt?: string;
  expiresAt?: string;
  status: VoucherStatus;
  sourceFile?: string;
  sourceSheet?: string;
  notes?: string;
}

export type VoucherUpdateDraft = Partial<VoucherDraft>;

export interface VoucherListFilters {
  query?: string;
  schoolId?: string;
  campaignName?: string;
  voucherType?: VoucherType;
  status?: VoucherStatus;
}
