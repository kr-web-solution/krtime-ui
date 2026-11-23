"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Notice } from "@/components/ui/notice";
import { apiFetch } from "@/lib/api";
import { friendlyError, humanStatus } from "@/lib/friendly-error";
import { staffName } from "@/lib/utils";
import type { Device, Employee } from "@/lib/types";
import { useState } from "react";

function statusVariant(status: string) {
  if (status === "active") return "success" as const;
  if (status === "pending" || status === "reset_requested") return "warning" as const;
  return "secondary" as const;
}

type Flash = { tone: "success" | "error" | "info"; message: string };

function DevicesBody() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<Flash | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Device | null>(null);

  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: () => apiFetch<Device[]>("/api/v1/devices"),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiFetch<Employee[]>("/api/v1/employees"),
  });
  const devices = devicesQuery.data ?? [];

  const employeeName = (id: string) =>
    staffName(employees.find((e) => e.id === id)?.full_name);

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<Device>(`/api/v1/devices/${id}/approve`, { method: "POST" }),
    onSuccess: async () => {
      setFlash({ tone: "success", message: "Device approved." });
      await qc.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (err) =>
      setFlash({ tone: "error", message: friendlyError(err, "Could not approve this device.") }),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<Device>(`/api/v1/devices/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setFlash({ tone: "success", message: "Device revoked." });
      setRevokeTarget(null);
      await qc.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (err) =>
      setFlash({ tone: "error", message: friendlyError(err, "Could not revoke this device.") }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Devices</h1>
        <p className="text-sm text-muted-foreground">
          Approve pending phones and review reset requests.
        </p>
      </div>

      {flash ? <Notice tone={flash.tone}>{flash.message}</Notice> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered devices</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {devicesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading devices…</p>
          ) : devicesQuery.isError ? (
            <div className="space-y-3">
              <Notice tone="error">
                {friendlyError(devicesQuery.error, "Could not load devices.")}
              </Notice>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => devicesQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : devicesQuery.isSuccess && devices.length === 0 ? (
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
                      <Badge variant={statusVariant(d.status)}>{humanStatus(d.status)}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      {new Date(d.registered_at).toLocaleString()}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        {d.status === "pending" || d.status === "reset_requested" ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => approveMutation.mutate(d.id)}
                            disabled={approveMutation.isPending}
                          >
                            Approve
                          </Button>
                        ) : null}
                        {d.status !== "revoked" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={revokeMutation.isPending}
                            onClick={() => setRevokeTarget(d)}
                          >
                            Revoke
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Revoked</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title="Revoke this device?"
        body={`${employeeName(revokeTarget?.employee_id ?? "")} will need to register a phone again.`}
        confirmLabel="Revoke"
        danger
        pending={revokeMutation.isPending}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (revokeTarget) revokeMutation.mutate(revokeTarget.id);
        }}
      />
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
