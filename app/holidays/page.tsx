"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { apiFetch } from "@/lib/api";
import { friendlyError } from "@/lib/friendly-error";

type Holiday = {
  id: string;
  name: string;
  holiday_date: string;
  is_optional: boolean;
};

type Flash = { tone: "success" | "error" | "info"; message: string };

function HolidaysBody() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const [flash, setFlash] = useState<Flash | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Holiday | null>(null);

  const holidaysQuery = useQuery({
    queryKey: ["holidays"],
    queryFn: () => apiFetch<Holiday[]>("/api/v1/holidays"),
  });
  const holidays = holidaysQuery.data ?? [];

  const create = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/holidays", {
        method: "POST",
        body: { name, holiday_date: day, is_optional: false },
      }),
    onSuccess: async () => {
      setFlash({ tone: "success", message: "Holiday added." });
      setName("");
      setDay("");
      await qc.invalidateQueries({ queryKey: ["holidays"] });
    },
    onError: (err) =>
      setFlash({ tone: "error", message: friendlyError(err, "Could not add this holiday.") }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/holidays/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setRemoveTarget(null);
      setFlash({ tone: "success", message: "Holiday removed." });
      await qc.invalidateQueries({ queryKey: ["holidays"] });
    },
    onError: (err) =>
      setFlash({ tone: "error", message: friendlyError(err, "Could not remove this holiday.") }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Holidays</h1>
        <p className="text-sm text-muted-foreground">
          Non-optional holidays block check-in for that calendar day.
        </p>
      </div>

      {flash ? <Notice tone={flash.tone}>{flash.message}</Notice> : null}

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add holiday</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (name.length >= 2 && day) create.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="holiday-name">Name</Label>
                <Input
                  id="holiday-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday-date">Date</Label>
                <Input
                  id="holiday-date"
                  type="date"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={name.length < 2 || !day || create.isPending}>
                Save
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catalogue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {holidaysQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading holidays…</p>
            ) : holidaysQuery.isError ? (
              <div className="space-y-3">
                <Notice tone="error">
                  {friendlyError(holidaysQuery.error, "Could not load holidays.")}
                </Notice>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => holidaysQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : holidaysQuery.isSuccess && holidays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No holidays yet.</p>
            ) : (
              holidays.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>
                    {h.holiday_date} — {h.name}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRemoveTarget(h)}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove this holiday?"
        body={`${removeTarget?.name ?? "This holiday"} will no longer block check-in.`}
        confirmLabel="Remove"
        danger
        pending={remove.isPending}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) remove.mutate(removeTarget.id);
        }}
      />
    </div>
  );
}

export default function HolidaysPage() {
  return (
    <AuthGate>
      <AppShell>
        <HolidaysBody />
      </AppShell>
    </AuthGate>
  );
}
