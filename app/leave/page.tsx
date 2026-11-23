"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Notice } from "@/components/ui/notice";
import { apiFetch } from "@/lib/api";
import { friendlyError } from "@/lib/friendly-error";
import { staffName } from "@/lib/utils";
import type { Employee } from "@/lib/types";

type LeaveRequest = {
  id: string;
  employee_id: string;
  employee_name?: string | null;
  full_name?: string | null;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
};

function LeaveBody() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);

  const leaveQuery = useQuery({
    queryKey: ["leave-admin"],
    queryFn: () => apiFetch<LeaveRequest[]>("/api/v1/leave/admin?pending_only=true"),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiFetch<Employee[]>("/api/v1/employees"),
  });
  const requests = leaveQuery.data ?? [];

  function personName(row: LeaveRequest) {
    return staffName(
      row.full_name ||
        row.employee_name ||
        employees.find((e) => e.id === row.employee_id)?.full_name,
    );
  }

  const decide = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      apiFetch(`/api/v1/leave/admin/${id}/decide`, {
        method: "POST",
        body: { approve, notes: approve ? "Approved" : "Rejected" },
      }),
    onSuccess: async (_res, vars) => {
      setRejectTarget(null);
      setFlash({
        tone: "success",
        message: vars.approve ? "Leave approved." : "Leave rejected.",
      });
      await qc.invalidateQueries({ queryKey: ["leave-admin"] });
    },
    onError: (err) =>
      setFlash({ tone: "error", message: friendlyError(err, "Could not update this leave request.") }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Leave approvals</h1>
        <p className="text-sm text-muted-foreground">
          Approve or reject employee leave. Approved days mark attendance as on leave.
        </p>
      </div>

      {flash ? <Notice tone={flash.tone}>{flash.message}</Notice> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {leaveQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading leave requests…</p>
          ) : leaveQuery.isError ? (
            <div className="space-y-3">
              <Notice tone="error">
                {friendlyError(leaveQuery.error, "Could not load leave requests.")}
              </Notice>
              <Button type="button" variant="outline" size="sm" onClick={() => leaveQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : leaveQuery.isSuccess && requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending leave.</p>
          ) : (
            requests.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{personName(r)}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.start_date} → {r.end_date}
                    {r.reason ? ` · ${r.reason}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: r.id, approve: true })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decide.isPending}
                    onClick={() => setRejectTarget(r)}
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
        open={Boolean(rejectTarget)}
        title="Reject this leave request?"
        body={`${rejectTarget ? personName(rejectTarget) : "This person"} will not be marked on leave for these dates.`}
        confirmLabel="Reject"
        danger
        pending={decide.isPending}
        onCancel={() => setRejectTarget(null)}
        onConfirm={() => {
          if (rejectTarget) decide.mutate({ id: rejectTarget.id, approve: false });
        }}
      />
    </div>
  );
}

export default function LeavePage() {
  return (
    <AuthGate>
      <AppShell>
        <LeaveBody />
      </AppShell>
    </AuthGate>
  );
}
