"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type { Device, Employee } from "@/lib/types";

function statusVariant(status: string) {
  if (status === "active") return "success" as const;
  if (status === "pending" || status === "reset_requested") return "warning" as const;
  return "secondary" as const;
}

function DevicesBody() {
  const qc = useQueryClient();
  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: () => apiFetch<Device[]>("/api/v1/devices"),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiFetch<Employee[]>("/api/v1/employees"),
  });

  const employeeName = (id: string) =>
    employees.find((e) => e.id === id)?.full_name ?? id.slice(0, 8);

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<Device>(`/api/v1/devices/${id}/approve`, { method: "POST" }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Devices</h1>
        <p className="text-sm text-muted-foreground">
          Approve pending phones and review reset requests.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered devices</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No devices registered yet.</p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">Employee</th>
                  <th className="py-2 pr-3 font-medium">Model</th>
                  <th className="py-2 pr-3 font-medium">OS / App</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Registered</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} className="border-b border-border/70">
                    <td className="py-2 pr-3">{employeeName(d.employee_id)}</td>
                    <td className="py-2 pr-3">{d.device_model ?? "—"}</td>
                    <td className="py-2 pr-3">
                      {d.os_version ?? "—"} / {d.app_version ?? "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      {new Date(d.registered_at).toLocaleString()}
                    </td>
                    <td className="py-2">
                      {d.status === "pending" || d.status === "reset_requested" ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => approveMutation.mutate(d.id)}
                          disabled={approveMutation.isPending}
                        >
                          Approve
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DevicesPage() {
  return (
    <AuthGate>
      <AppShell>
        <DevicesBody />
      </AppShell>
    </AuthGate>
  );
}
