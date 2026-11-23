"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { apiFetch } from "@/lib/api";
import { friendlyError } from "@/lib/friendly-error";
import type { Shift } from "@/lib/types";
import { useState } from "react";

const schema = z.object({
  name: z.string().min(2, "Enter a shift name").max(120, "Name is too long"),
  code: z.string().max(40, "Code is too long").optional(),
  start_time: z.string().min(4, "Choose a start time"),
  end_time: z.string().min(4, "Choose an end time"),
});

type FormValues = z.infer<typeof schema>;
type Flash = { tone: "success" | "error" | "info"; message: string };

function ShiftsBody() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<Flash | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Shift | null>(null);

  const shiftsQuery = useQuery({
    queryKey: ["shifts"],
    queryFn: () => apiFetch<Shift[]>("/api/v1/shifts"),
  });
  const shifts = shiftsQuery.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      code: "",
      start_time: "09:00",
      end_time: "18:00",
    },
  });
  const errors = form.formState.errors;

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch<Shift>("/api/v1/shifts", {
        method: "POST",
        body: {
          name: values.name,
          code: values.code || null,
          start_time: `${values.start_time}:00`,
          end_time: `${values.end_time}:00`,
        },
      }),
    onSuccess: async () => {
      setFlash({ tone: "success", message: "Shift created." });
      form.reset({ name: "", code: "", start_time: "09:00", end_time: "18:00" });
      await qc.invalidateQueries({ queryKey: ["shifts"] });
    },
    onError: (err) =>
      setFlash({ tone: "error", message: friendlyError(err, "Could not create this shift.") }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/shifts/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setRemoveTarget(null);
      setFlash({ tone: "success", message: "Shift removed." });
      await qc.invalidateQueries({ queryKey: ["shifts"] });
    },
    onError: (err) =>
      setFlash({ tone: "error", message: friendlyError(err, "Could not remove this shift.") }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Shifts</h1>
        <p className="text-sm text-muted-foreground">
          Define working windows used when assigning employees.
        </p>
      </div>

      {flash ? <Notice tone={flash.tone}>{flash.message}</Notice> : null}

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New shift</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              noValidate
              onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
            >
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" aria-invalid={Boolean(errors.code)} {...form.register("code")} />
                <FieldError message={errors.code?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_time">Start</Label>
                <Input
                  id="start_time"
                  type="time"
                  aria-invalid={Boolean(errors.start_time)}
                  {...form.register("start_time")}
                />
                <FieldError message={errors.start_time?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End</Label>
                <Input
                  id="end_time"
                  type="time"
                  aria-invalid={Boolean(errors.end_time)}
                  {...form.register("end_time")}
                />
                <FieldError message={errors.end_time?.message} />
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                Create shift
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catalogue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {shiftsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading shifts…</p>
            ) : shiftsQuery.isError ? (
              <div className="space-y-3">
                <Notice tone="error">
                  {friendlyError(shiftsQuery.error, "Could not load shifts.")}
                </Notice>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => shiftsQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : shiftsQuery.isSuccess && shifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shifts yet.</p>
            ) : (
              shifts.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                      {s.code ? ` · ${s.code}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={removeMutation.isPending}
                    onClick={() => setRemoveTarget(s)}
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
        title="Remove this shift?"
        body={`${removeTarget?.name ?? "This shift"} will no longer be available for assignment.`}
        confirmLabel="Remove"
        danger
        pending={removeMutation.isPending}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) removeMutation.mutate(removeTarget.id);
        }}
      />
    </div>
  );
}

export default function ShiftsPage() {
  return (
    <AuthGate>
      <AppShell>
        <ShiftsBody />
      </AppShell>
    </AuthGate>
  );
}
