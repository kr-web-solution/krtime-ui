"use client";

import { cn } from "@/lib/utils";

type NoticeProps = {
  tone?: "success" | "error" | "info";
  children: React.ReactNode;
  className?: string;
};

export function Notice({ tone = "info", children, className }: NoticeProps) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "success" &&
          "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
        tone === "error" &&
          "border-destructive/40 bg-destructive/10 text-destructive",
        tone === "info" && "border-border bg-muted/60 text-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}
