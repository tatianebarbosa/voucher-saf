"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";

import type { ApiResponse } from "@/types/api";
import type { PublicSchoolOption } from "@/types/school";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PublicSchoolsData {
  schools: PublicSchoolOption[];
}

interface SchoolAutocompleteFieldProps {
  value: string;
  selectedSchool: PublicSchoolOption | null;
  hasError?: boolean;
  onBlur?: () => void;
  onSelect: (school: PublicSchoolOption) => void;
  onValueChange: (value: string) => void;
}

async function readApiResponse<T>(response: Response) {
  return (await response.json()) as ApiResponse<T>;
}

export function SchoolAutocompleteField({
  value,
  selectedSchool,
  hasError = false,
  onBlur,
  onSelect,
  onValueChange,
}: SchoolAutocompleteFieldProps) {
  const [options, setOptions] = useState<PublicSchoolOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    const normalizedQuery = value.trim();

    if (
      normalizedQuery.length < 2 ||
      (selectedSchool && normalizedQuery === selectedSchool.schoolName)
    ) {
      setOptions([]);
      setIsLoading(false);
      setRequestError(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setRequestError(null);

      try {
        const response = await fetch(
          `/api/public/schools?query=${encodeURIComponent(normalizedQuery)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const payload = await readApiResponse<PublicSchoolsData>(response);

        if (!response.ok || !payload.success) {
          throw new Error("Não foi possível buscar as escolas.");
        }

        setOptions(payload.data.schools);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setOptions([]);
        setRequestError("Não foi possível buscar as escolas agora.");
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [selectedSchool, value]);

  const showDropdown =
    isOpen &&
    (isLoading || requestError !== null || value.trim().length >= 2);

  const helperParts = [
    selectedSchool?.city || selectedSchool?.state
      ? `Localização: ${selectedSchool.city ?? "Cidade"}${
          selectedSchool?.state ? ` - ${selectedSchool.state}` : ""
        }`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <Input
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-invalid={hasError}
          className="pl-11 pr-11"
          placeholder="Pesquise a escola pelo nome"
          value={value}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => {
              setIsOpen(false);
              onBlur?.();
            }, 120);
          }}
          onChange={(event) => {
            onValueChange(event.target.value);
            setIsOpen(true);
          }}
        />

        {isLoading ? (
          <LoaderCircle className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-[var(--color-primary)]" />
        ) : null}
      </div>

      {helperParts.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
          {helperParts.map((part) => (
            <span key={part}>{part}</span>
          ))}
        </div>
      ) : null}

      {showDropdown ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-[8px] border border-[var(--color-border)] bg-white shadow-[0_28px_80px_-64px_rgba(22,39,68,0.4)]">
          {value.trim().length < 2 ? (
            <p className="px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
              Digite pelo menos 2 letras para buscar a escola.
            </p>
          ) : requestError ? (
            <p className="px-4 py-3 text-sm text-[var(--color-primary)]">
              {requestError}
            </p>
          ) : options.length === 0 && !isLoading ? (
            <p className="px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
              Nenhuma escola encontrada. Verifique o nome informado.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto py-2">
              {options.map((school) => (
                <button
                  key={school.id}
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition hover:bg-[var(--color-surface-muted)]",
                    selectedSchool?.id === school.id
                      ? "bg-red-50"
                      : "bg-white",
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelect(school);
                    setIsOpen(false);
                  }}
                >
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {school.schoolName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
