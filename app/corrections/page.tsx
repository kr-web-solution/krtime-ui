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
import { staffName } from "@/lib/utils";

type Correction = {
  id: string;
  attendance_record_id: string;
  employee_name?: string | null;
  full_name?: string | null;
  reason: string;
  status: string;
  proposed_check_in_at: string | null;
  proposed_check_out_at: string | null;
};

type DailyEmployee = {
  full_name: string;
  employee_code: string;
  record_id: string;
};

type DailyAttendance = {
  locations: Array<{ employees: DailyEmployee[] }>;
};

type Flash = { tone: "success" | "error" | "info"; message: string };

function formatStamp(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function CorrectionsBody() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<Flash | null>(null);
  const [recordId, setRecordId] = useState("");
  const [reason, setReason] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [confirmLock, setConfirmLock] = useState(false);

  const correctionsQuery = useQuery({
    queryKey: ["corrections"],
    queryFn: () => apiFetch<Correction[]>("/api/v1/corrections?status=pending"),
  });
  const { data: daily } = useQuery({
    queryKey: ["daily-attendance"],
    queryFn: () => apiFetch<DailyAttendance>("/api/v1/admin/daily-attendance"),
  });
  const pending = correctionsQuery.data ?? [];
  const recordChoices =
    daily?.locations.flatMap((loc) =>
      loc.employees.map((emp) => ({
        id: emp.record_id,
        label: `${emp.full_name} (${emp.employee_code})`,
      })),
    ) ?? [];

  const create = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/corrections", {
        method: "POST",
        body: {
          attendance_record_id: recordId,
          reason,
          proposed_check_out_at: checkOut ? new Date(checkOut).toISOString() : null,
        },
      }),
    onSuccess: async () => {
      setFlash({ tone: "success", message: "Correction requested." });
      setRecordId("");
      setReason("");
      setCheckOut("");
      await qc.invalidateQueries({ queryKey: ["corrections"] });
    },
    onError: (err) =>
      setFlash({ tone: "error", message: friendlyError(err, "Could not submit this correction.") }),
  });

  const decide = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      apiFetch(`/api/v1/corrections/${id}/decide`, {
        method: "POST",
        body: { approve, notes: approve ? "Approved" : "Rejected" },
      }),
    onSuccess: async (_res, vars) => {
      setFlash({
        tone: "success",
        message: vars.approve ? "Correction approved." : "Correction rejected.",
      });
      await qc.invalidateQueries({ queryKey: ["corrections"] });
    },
    onError: (err) =>
      setFlash({ tone: "error", message: friendlyError(err, "Could not update this correction.") }),
  });

  const lock = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/corrections/month-lock", {
        method: "POST",
        body: { year: Number(year), month: Number(month) },
      }),
    onSuccess: () => {
      setConfirmLock(false);
      setFlash({
        tone: "success",
        message: `Payroll for ${month}/${year} is locked.`,
      });
    },
    onError: (err) =>
      setFlash({ tone: "error", message: friendlyError(err, "Could not lock this month.") }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Corrections</h1>
        <p className="text-sm text-muted-foreground">
          Fix forgotten check-outs with audited approvals. Lock a month when payroll is closed.
        </p>
      </div>

      {flash ? <Notice tone={flash.tone}>{flash.message}</Notice> : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request correction</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (recordId && reason.length >= 3) create.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="correction-record">Staff check-in</Label>
                {recordChoices.length > 0 ? (
                  <select
                    id="correction-record"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
                    value={recordId}
                    onChange={(e) => setRecordId(e.target.value)}
                  >
                    <option value="">Select a person</option>
                    {recordChoices.map((choice) => (
                      <option key={choice.id} value={choice.id}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="correction-record"
                    value={recordId}
                    onChange={(e) => setRecordId(e.target.value)}
                    placeholder="No check-ins loaded yet"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="correction-checkout">Proposed check-out</Label>
                <Input
                  id="correction-checkout"
                  type="datetime-local"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correction-reason">Reason</Label>
                <Input
                  id="correction-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                disabled={!recordId || reason.length < 3 || create.isPending}
              >
                Submit
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Month lock</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                setConfirmLock(true);
              }}
            >
              <div className="flex gap-3">
                <div className="space-y-2">
                  <Label htmlFor="lock-year">Year</Label>
                  <Input
                    id="lock-year"
                    inputMode="numeric"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lock-month">Month</Label>
                  <Input
                    id="lock-month"
                    inputMode="numeric"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" variant="outline">
                Lock month
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {correctionsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading corrections…</p>
          ) : correctionsQuery.isError ? (
            <div className="space-y-3">
              <Notice tone="error">
                {friendlyError(correctionsQuery.error, "Could not load corrections.")}
              </Notice>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => correctionsQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : correctionsQuery.isSuccess && pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending corrections.</p>
          ) : (
            pending.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {staffName(c.full_name || c.employee_name)}
                  </p>
                  <p className="text-sm text-foreground">{c.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    Proposed check-out {formatStamp(c.proposed_check_out_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: c.id, approve: true })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decide.isPending}
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

      <ConfirmDialog
        open={confirmLock}
        title="Lock this month?"
        body={`Attendance for ${month}/${year} will be closed for payroll. This cannot be easily undone.`}
        confirmLabel="Lock month"
        danger
        pending={lock.isPending}
        onCancel={() => setConfirmLock(false)}
        onConfirm={() => lock.mutate()}
      />
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
