"use client";

import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface SelectOptionItem {
  value: string;
  label: string;
  disabled?: boolean;
}

function normalizeSelectValue(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

function getOptionLabel(children: ReactNode) {
  return Children.toArray(children)
    .map((child) =>
      typeof child === "string" || typeof child === "number" ? String(child) : "",
    )
    .join("");
}

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select(
  {
    children,
    className,
    defaultValue,
    disabled = false,
    name,
    onBlur,
    onChange,
    value,
    ...props
  },
  ref,
) {
  const [internalValue, setInternalValue] = useState(() =>
    normalizeSelectValue(defaultValue),
  );
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isControlled = value !== undefined;
  const selectedValue = isControlled
    ? normalizeSelectValue(value)
    : internalValue;
  const hasError =
    props["aria-invalid"] === true || props["aria-invalid"] === "true";

  const options = useMemo<SelectOptionItem[]>(() => {
    return Children.toArray(children).flatMap((child) => {
      if (
        !isValidElement<{
          value?: string | number;
          disabled?: boolean;
          children?: ReactNode;
        }>(child) ||
        child.type !== "option"
      ) {
        return [];
      }

      return [
        {
          value: normalizeSelectValue(child.props.value),
          label: getOptionLabel(child.props.children),
          disabled: child.props.disabled,
        },
      ];
    });
  }, [children]);

  const selectedOption =
    options.find((option) => option.value === selectedValue) ?? options[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        onBlur?.({
          target: { value: selectedValue, name },
          currentTarget: { value: selectedValue, name },
        } as FocusEvent<HTMLSelectElement>);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        onBlur?.({
          target: { value: selectedValue, name },
          currentTarget: { value: selectedValue, name },
        } as FocusEvent<HTMLSelectElement>);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, name, onBlur, selectedValue]);

  function handleSelect(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onChange?.({
      target: { value: nextValue, name },
      currentTarget: { value: nextValue, name },
    } as ChangeEvent<HTMLSelectElement>);

    onBlur?.({
      target: { value: nextValue, name },
      currentTarget: { value: nextValue, name },
    } as FocusEvent<HTMLSelectElement>);

    setIsOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <select
        {...props}
        ref={ref}
        aria-hidden="true"
        tabIndex={-1}
        name={name}
        value={selectedValue}
        onChange={() => undefined}
        className="sr-only"
      >
        {children}
      </select>

      <button
        type="button"
        aria-expanded={isOpen}
        disabled={disabled}
        data-invalid={hasError ? "true" : "false"}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-left text-sm text-[var(--color-foreground)] outline-none transition",
          "focus:border-[var(--color-primary)] focus:ring-4 focus:ring-red-100",
          "data-[invalid=true]:border-red-400 data-[invalid=true]:bg-red-50/60 data-[invalid=true]:focus:ring-red-100",
          "disabled:cursor-not-allowed disabled:opacity-60",
          !selectedValue && "text-[var(--color-muted-foreground)]",
          className,
        )}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{selectedOption?.label || "Selecione"}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[var(--color-muted-foreground)] transition",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && !disabled ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white shadow-[0_24px_70px_-48px_rgba(22,39,68,0.45)]">
          <div className="max-h-72 overflow-y-auto py-1.5">
            {options.map((option) => {
              const isSelected = option.value === selectedValue;

              return (
                <button
                  key={`${name ?? "select"}-${option.value}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  className={cn(
                    "flex w-full items-center border-b border-[var(--color-border)]/70 px-3.5 py-2.5 text-left text-sm transition last:border-b-0",
                    option.disabled
                      ? "cursor-not-allowed text-[var(--color-muted-foreground)] opacity-60"
                      : isSelected
                        ? "bg-[var(--color-surface-muted)] font-medium text-[var(--color-foreground)]"
                        : "bg-white text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)]",
                  )}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
});
