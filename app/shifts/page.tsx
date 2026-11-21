"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch } from "@/lib/api";
import type { Shift } from "@/lib/types";
import { useState } from "react";

const schema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().max(40).optional(),
  start_time: z.string().min(4),
  end_time: z.string().min(4),
});

type FormValues = z.infer<typeof schema>;

function ShiftsBody() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<string | null>(null);
  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => apiFetch<Shift[]>("/api/v1/shifts"),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      code: "",
      start_time: "09:00",
      end_time: "18:00",
    },
  });

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
      setFlash("Shift created.");
      form.reset({ name: "", code: "", start_time: "09:00", end_time: "18:00" });
      await qc.invalidateQueries({ queryKey: ["shifts"] });
    },
    onError: (err) => setFlash(err instanceof ApiError ? err.message : "Create failed"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/shifts/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setFlash("Shift deleted.");
      await qc.invalidateQueries({ queryKey: ["shifts"] });
    },
    onError: (err) => setFlash(err instanceof ApiError ? err.message : "Delete failed"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Shifts</h1>
        <p className="text-sm text-muted-foreground">
          Define working windows used when assigning employees.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New shift</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
            >
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...form.register("name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" {...form.register("code")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_time">Start</Label>
                <Input id="start_time" type="time" {...form.register("start_time")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End</Label>
                <Input id="end_time" type="time" {...form.register("end_time")} />
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                Create shift
              </Button>
            </form>
            {flash ? <p className="mt-3 text-sm text-muted-foreground">{flash}</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catalogue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {shifts.length === 0 ? (
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
                      {s.code ?? "—"} · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={removeMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`Delete shift “${s.name}”?`)) {
                        removeMutation.mutate(s.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
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
