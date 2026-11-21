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

type Correction = {
  id: string;
  attendance_record_id: string;
  reason: string;
  status: string;
  proposed_check_in_at: string | null;
  proposed_check_out_at: string | null;
};

function CorrectionsBody() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<string | null>(null);
  const [recordId, setRecordId] = useState("");
  const [reason, setReason] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));

  const { data = [] } = useQuery({
    queryKey: ["corrections"],
    queryFn: () => apiFetch<Correction[]>("/api/v1/corrections?status=pending"),
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/corrections", {
        method: "POST",
        body: {
          attendance_record_id: recordId,
          reason,
          proposed_check_out_at: checkOut || null,
        },
      }),
    onSuccess: async () => {
      setFlash("Correction requested.");
      setRecordId("");
      setReason("");
      setCheckOut("");
      await qc.invalidateQueries({ queryKey: ["corrections"] });
    },
    onError: (err) => setFlash(err instanceof ApiError ? err.message : "Request failed"),
  });

  const decide = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      apiFetch(`/api/v1/corrections/${id}/decide`, {
        method: "POST",
        body: { approve, notes: approve ? "Approved" : "Rejected" },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["corrections"] });
    },
  });

  const lock = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/corrections/month-lock", {
        method: "POST",
        body: { year: Number(year), month: Number(month) },
      }),
    onSuccess: (res) => setFlash(`Month locked (${JSON.stringify(res)})`),
    onError: (err) => setFlash(err instanceof ApiError ? err.message : "Lock failed"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Corrections</h1>
        <p className="text-sm text-muted-foreground">
          Fix forgotten check-outs with audited approvals. Lock a month when payroll is closed.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request correction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Attendance record ID</Label>
              <Input value={recordId} onChange={(e) => setRecordId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Proposed check-out (ISO)</Label>
              <Input
                placeholder="2026-03-21T18:05:00+05:30"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <Button
              type="button"
              disabled={!recordId || reason.length < 3 || create.isPending}
              onClick={() => create.mutate()}
            >
              Submit
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Month lock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Input value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => lock.mutate()}>
              Lock month
            </Button>
            {flash ? <p className="text-sm text-muted-foreground">{flash}</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending corrections.</p>
          ) : (
            data.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{c.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    Record {c.attendance_record_id.slice(0, 8)}… · out{" "}
                    {c.proposed_check_out_at ?? "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => decide.mutate({ id: c.id, approve: true })}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decide.mutate({ id: c.id, approve: false })}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CorrectionsPage() {
  return (
    <AuthGate>
      <AppShell>
        <CorrectionsBody />
      </AppShell>
    </AuthGate>
  );
}
