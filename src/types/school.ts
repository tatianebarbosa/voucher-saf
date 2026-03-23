import type {
  RequesterType,
  RequestStatus,
  RequestType,
} from "@/types/request";
import type { VoucherStatus, VoucherType } from "@/types/voucher";

export interface School {
  id: string;
  externalSchoolId?: string;
  schoolName: string;
  schoolEmail?: string;
  schoolStatus?: string;
  cluster?: string;
  safOwner?: string;
  city?: string;
  state?: string;
  cnpj?: string;
  tradeName?: string;
  region?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolDraft {
  externalSchoolId?: string;
  schoolName: string;
  schoolEmail?: string;
  schoolStatus?: string;
  cluster?: string;
  safOwner?: string;
  city?: string;
  state?: string;
  cnpj?: string;
  tradeName?: string;
  region?: string;
  contactPhone?: string;
}

export interface PublicSchoolOption {
  id: string;
  schoolName: string;
  schoolEmail?: string;
  city?: string;
  state?: string;
}

export interface SchoolRequestHistoryItem {
  id: string;
  ticketNumber: string;
  requestType: RequestType;
  requesterType: RequesterType;
  requesterName: string;
  status: RequestStatus;
  createdAt: string;
  conditionLabel: string;
  voucherCode?: string;
  origin?: string;
}

export interface SchoolHistoryPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SchoolVoucherPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SchoolVoucherSummaryItem {
  id: string;
  voucherType: VoucherType;
  campaignName: string;
  voucherCode: string;
  quantityAvailable: number;
  quantitySent: number;
  sentToEmail?: string;
  sentAt?: string;
  expiresAt?: string;
  status: VoucherStatus;
  notesExcerpt?: string;
}

export interface SchoolDetails {
  school: School;
  requests: SchoolRequestHistoryItem[];
  pagination: SchoolHistoryPagination;
  vouchers: SchoolVoucherSummaryItem[];
  voucherPagination: SchoolVoucherPagination;
}
