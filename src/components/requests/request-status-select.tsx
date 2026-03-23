"use client";

import { Select } from "@/components/ui/select";
import { formatRequestStatus } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  REQUEST_STATUS_OPTIONS,
  type RequestStatus,
} from "@/types/request";

interface RequestStatusSelectProps {
  value: RequestStatus;
  onChange: (status: RequestStatus) => void;
  compact?: boolean;
  disabled?: boolean;
}

export function RequestStatusSelect({
  value,
  onChange,
  compact = false,
  disabled = false,
}: RequestStatusSelectProps) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as RequestStatus)}
      className={cn(
        "bg-white",
        compact ? "h-10 min-w-44 rounded-[8px] px-3 text-xs font-semibold" : "",
      )}
    >
      {REQUEST_STATUS_OPTIONS.map((status) => (
        <option key={status} value={status}>
          {formatRequestStatus(status)}
        </option>
      ))}
    </Select>
  );
}
