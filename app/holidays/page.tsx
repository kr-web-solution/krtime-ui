"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch } from "@/lib/api";

type Holiday = {
  id: string;
  name: string;
  holiday_date: string;
  is_optional: boolean;
};

function HolidaysBody() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => apiFetch<Holiday[]>("/api/v1/holidays"),
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/holidays", {
        method: "POST",
        body: { name, holiday_date: day, is_optional: false },
      }),
    onSuccess: async () => {
      setFlash("Holiday added.");
      setName("");
      setDay("");
      await qc.invalidateQueries({ queryKey: ["holidays"] });
    },
    onError: (err) => setFlash(err instanceof ApiError ? err.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/holidays/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["holidays"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Holidays</h1>
        <p className="text-sm text-muted-foreground">
          Non-optional holidays block check-in for that calendar day.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add holiday</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
            </div>
            <Button
              type="button"
              disabled={name.length < 2 || !day}
              onClick={() => create.mutate()}
            >
              Save
            </Button>
            {flash ? <p className="text-sm text-muted-foreground">{flash}</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catalogue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No holidays yet.</p>
            ) : (
              data.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>
                    {h.holiday_date} — {h.name}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => remove.mutate(h.id)}>
                    Remove
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

export default function HolidaysPage() {
  return (
    <AuthGate>
      <AppShell>
        <HolidaysBody />
      </AppShell>
    </AuthGate>
  );
}
