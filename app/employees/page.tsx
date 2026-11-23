"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { apiFetch } from "@/lib/api";
import { friendlyError, humanStatus } from "@/lib/friendly-error";
import type { Employee, EnrollmentCode, Location, Shift } from "@/lib/types";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  full_name: z.string().min(2, "Enter the person’s name").max(160, "Name is too long"),
  employee_code: z.string().min(2, "Enter a staff code").max(40, "Staff code is too long"),
  phone: z.string().max(32, "Phone number is too long").optional(),
  job_title: z.string().max(120, "Job title is too long").optional(),
  primary_location_id: z.string().optional().or(z.literal("")),
  shift_id: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

type CreateResponse = {
  employee: Employee;
  enrollment_code: EnrollmentCode | null;
};

type AlertType =
  | "check_in"
  | "check_out"
  | "return_site"
  | "call_admin"
  | "urgent"
  | "custom";

const ALERT_BUTTONS: { type: AlertType; label: string }[] = [
  { type: "check_in", label: "Check in" },
  { type: "check_out", label: "Check out" },
  { type: "return_site", label: "Return site" },
  { type: "call_admin", label: "Call admin" },
  { type: "urgent", label: "Urgent" },
];

type Flash = { tone: "success" | "error" | "info"; message: string };

type ConfirmKind =
  | { kind: "urgent"; id: string; name: string }
  | { kind: "deactivate"; id: string; name: string }
  | { kind: "delete-face"; id: string; name: string };

function EmployeesBody() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<Flash | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [alertTarget, setAlertTarget] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);

  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiFetch<Employee[]>("/api/v1/employees"),
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: () => apiFetch<Location[]>("/api/v1/locations"),
  });
  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => apiFetch<Shift[]>("/api/v1/shifts"),
  });

  const employees = employeesQuery.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      full_name: "",
      employee_code: "",
      phone: "",
      job_title: "",
      primary_location_id: "",
      shift_id: "",
    },
  });
  const errors = form.formState.errors;

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const locationIds = values.primary_location_id
        ? [values.primary_location_id]
        : [];
      return apiFetch<CreateResponse>("/api/v1/employees", {
        method: "POST",
        body: {
          email: values.email,
          full_name: values.full_name,
          employee_code: values.employee_code,
          phone: values.phone || null,
          job_title: values.job_title || null,
          location_ids: locationIds,
          primary_location_id: values.primary_location_id || null,
          shift_id: values.shift_id || null,
          create_enrollment_code: true,
        },
      });
    },
    onSuccess: async (res) => {
      setFlash({ tone: "success", message: "Employee created." });
      setLastCode(res.enrollment_code?.code ?? null);
      form.reset();
      await qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err) =>
      setFlash({ tone: "error", message: friendlyError(err, "Could not create this person.") }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<Employee>(`/api/v1/employees/${id}`, {
        method: "PATCH",
        body: { is_active: false },
      }),
    onSuccess: async () => {
      setFlash({ tone: "success", message: "Employee deactivated." });
      setConfirm(null);
      await qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err) =>
      setFlash({ tone: "error", message: friendlyError(err, "Could not deactivate this person.") }),
  });

  const deleteFaceMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/biometrics/employees/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setFlash({ tone: "success", message: "Face enrollment removed." });
      setConfirm(null);
    },
    onError: (err) =>
      setFlash({ tone: "error", message: friendlyError(err, "Could not remove face enrollment.") }),
  });

  const codeMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<EnrollmentCode>(`/api/v1/employees/${id}/enrollment-codes`, {
        method: "POST",
        body: { hours: 72 },
      }),
    onSuccess: (code) => {
      setLastCode(code.code);
      setFlash({ tone: "success", message: "New enrollment code generated." });
    },
    onError: (err) =>
      setFlash({ tone: "error", message: friendlyError(err, "Could not create an enrollment code.") }),
  });

  const alertMutation = useMutation({
    mutationFn: ({
      id,
      alertType,
      title,
      message,
    }: {
      id: string;
      alertType: AlertType;
      title?: string;
      message?: string;
    }) =>
      apiFetch<{ title: string; delivered: number }>(
        `/api/v1/employees/${id}/alerts`,
        {
          method: "POST",
          body: {
            alert_type: alertType,
            ...(title ? { title } : {}),
            ...(message ? { message } : {}),
          },
        },
      ),
    onMutate: ({ id }) => setAlertTarget(id),
    onSuccess: (res) => {
      setConfirm(null);
      setFlash({
        tone: "success",
        message: `Notification sent: ${res.title} (${res.delivered} device${res.delivered === 1 ? "" : "s"}).`,
      });
    },
    onError: (err) =>
      setFlash({ tone: "error", message: friendlyError(err, "Could not send that notification.") }),
    onSettled: () => setAlertTarget(null),
  });

  function sendCustomMessage(employeeId: string, employeeName: string) {
    const title =
      window.prompt(`Notification title for ${employeeName}`, "Message from admin") ??
      "";
    if (!title.trim()) return;
    const message = window.prompt("Notification message", "") ?? "";
    if (!message.trim()) {
      setFlash({ tone: "info", message: "Message is required for a normal notification." });
      return;
    }
    alertMutation.mutate({
      id: employeeId,
      alertType: "custom",
      title: title.trim(),
      message: message.trim(),
    });
  }

  const confirmPending =
    (confirm?.kind === "urgent" && alertMutation.isPending) ||
    (confirm?.kind === "deactivate" && deactivateMutation.isPending) ||
    (confirm?.kind === "delete-face" && deleteFaceMutation.isPending);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Employees</h1>
        <p className="text-sm text-muted-foreground">
          Create staff, assign a site and shift, and issue enrollment codes.
        </p>
      </div>

      {flash ? <Notice tone={flash.tone}>{flash.message}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add employee</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              noValidate
              onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
            >
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  aria-invalid={Boolean(errors.full_name)}
                  {...form.register("full_name")}
                />
                <FieldError message={errors.full_name?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  aria-invalid={Boolean(errors.email)}
                  {...form.register("email")}
                />
                <FieldError message={errors.email?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_code">Staff code</Label>
                <Input
                  id="employee_code"
                  aria-invalid={Boolean(errors.employee_code)}
                  {...form.register("employee_code")}
                />
                <FieldError message={errors.employee_code?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  aria-invalid={Boolean(errors.phone)}
                  {...form.register("phone")}
                />
                <FieldError message={errors.phone?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_title">Job title</Label>
                <Input
                  id="job_title"
                  aria-invalid={Boolean(errors.job_title)}
                  {...form.register("job_title")}
                />
                <FieldError message={errors.job_title?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_location_id">Primary site</Label>
                <select
                  id="primary_location_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
                  {...form.register("primary_location_id")}
                >
                  <option value="">Unassigned</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift_id">Shift</Label>
                <select
                  id="shift_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
                  {...form.register("shift_id")}
                >
                  <option value="">None</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)})
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create + enrollment code"}
              </Button>
            </form>
            {lastCode ? (
              <p className="mt-3 rounded-md border border-border bg-muted/50 p-3 font-mono text-lg tracking-widest">
                {lastCode}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Directory</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {employeesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading staff…</p>
            ) : employeesQuery.isError ? (
              <div className="space-y-3">
                <Notice tone="error">
                  {friendlyError(employeesQuery.error, "Could not load staff.")}
                </Notice>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => employeesQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : employeesQuery.isSuccess && employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No staff yet. Add someone to get started.
              </p>
            ) : (
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3 font-medium">Code</th>
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Email</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Alerts</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => (
                    <tr key={e.id} className="border-b border-border/70">
                      <td className="py-2 pr-3 font-mono text-xs">{e.employee_code}</td>
                      <td className="py-2 pr-3">{e.full_name}</td>
                      <td className="py-2 pr-3">{e.email}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={e.is_active ? "success" : "secondary"}>
                          {humanStatus(e.is_active ? "active" : "inactive")}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              !e.is_active ||
                              (alertMutation.isPending && alertTarget === e.id)
                            }
                            onClick={() => sendCustomMessage(e.id, e.full_name)}
                          >
                            Message
                          </Button>
                          {ALERT_BUTTONS.map((alert) => (
                            <Button
                              key={alert.type}
                              type="button"
                              size="sm"
                              variant={alert.type === "urgent" ? "danger" : "secondary"}
                              disabled={
                                !e.is_active ||
                                (alertMutation.isPending && alertTarget === e.id)
                              }
                              onClick={() => {
                                if (alert.type === "urgent") {
                                  setConfirm({ kind: "urgent", id: e.id, name: e.full_name });
                                  return;
                                }
                                alertMutation.mutate({
                                  id: e.id,
                                  alertType: alert.type,
                                });
                              }}
                            >
                              {alert.label}
                            </Button>
                          ))}
                        </div>
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => codeMutation.mutate(e.id)}
                          >
                            Enrollment code
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={deleteFaceMutation.isPending}
                            onClick={() =>
                              setConfirm({ kind: "delete-face", id: e.id, name: e.full_name })
                            }
                          >
                            Remove face
                          </Button>
                          {e.is_active ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setConfirm({ kind: "deactivate", id: e.id, name: e.full_name })
                              }
                            >
                              Deactivate
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm?.kind === "urgent"}
        title="Send urgent alert?"
        body={`This sends an urgent notification to ${confirm?.name ?? "this person"}.`}
        confirmLabel="Send urgent"
        danger
        pending={confirmPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind !== "urgent") return;
          alertMutation.mutate({ id: confirm.id, alertType: "urgent" });
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === "deactivate"}
        title="Deactivate this person?"
        body={`${confirm?.name ?? "This person"} will no longer be able to check in.`}
        confirmLabel="Deactivate"
        danger
        pending={confirmPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind !== "deactivate") return;
          deactivateMutation.mutate(confirm.id);
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === "delete-face"}
        title="Remove face enrollment?"
        body={`${confirm?.name ?? "This person"} will need to enroll their face again.`}
        confirmLabel="Remove"
        danger
        pending={confirmPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind !== "delete-face") return;
          deleteFaceMutation.mutate(confirm.id);
        }}
      />
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <AuthGate>
      <AppShell>
        <EmployeesBody />
      </AppShell>
    </AuthGate>
  );
}
