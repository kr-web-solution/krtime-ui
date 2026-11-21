"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
};

function LeaveBody() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["leave-admin"],
    queryFn: () => apiFetch<LeaveRequest[]>("/api/v1/leave/admin?pending_only=true"),
  });

  const decide = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      apiFetch(`/api/v1/leave/admin/${id}/decide`, {
        method: "POST",
        body: { approve, notes: approve ? "Approved" : "Rejected" },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["leave-admin"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Leave approvals</h1>
        <p className="text-sm text-muted-foreground">
          Approve or reject employee leave. Approved days mark attendance as on leave.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending leave.</p>
          ) : (
            data.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {r.start_date} → {r.end_date}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Employee {r.employee_id.slice(0, 8)}… · {r.reason ?? "No reason"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => decide.mutate({ id: r.id, approve: true })}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (window.confirm("Delete (reject) this leave request?")) {
                        decide.mutate({ id: r.id, approve: false });
                      }
                    }}
                  >
                    Delete
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

export default function LeavePage() {
  return (
    <AuthGate>
      <AppShell>
        <LeaveBody />
      </AppShell>
    </AuthGate>
  );
}
