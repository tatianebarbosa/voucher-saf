import { createVoucherRequest } from "@/lib/generate-request";
import type { VoucherRequest } from "@/types/request";

import { requestSeeds } from "@/data/request-seeds";

export const mockRequests: VoucherRequest[] = requestSeeds.map(
  ({ data, status }) => createVoucherRequest(data, status),
);
