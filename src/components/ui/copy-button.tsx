"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

type CopyState = "idle" | "copied" | "error";

export function CopyButton({ value }: { value: string }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }

    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  return (
    <Button variant="secondary" className="shrink-0" onClick={handleCopy}>
      {copyState === "copied" ? (
        <Check className="size-4" />
      ) : copyState === "error" ? (
        <AlertCircle className="size-4" />
      ) : (
        <Copy className="size-4" />
      )}
      {copyState === "copied"
        ? "Copiado"
        : copyState === "error"
          ? "Falha ao copiar"
          : "Copiar"}
    </Button>
  );
}
