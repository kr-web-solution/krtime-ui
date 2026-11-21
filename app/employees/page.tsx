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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch } from "@/lib/api";
import type { Employee, EnrollmentCode, Location, Shift } from "@/lib/types";

const schema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2).max(160),
  employee_code: z.string().min(2).max(40),
  phone: z.string().max(32).optional(),
  job_title: z.string().max(120).optional(),
  primary_location_id: z.string().uuid().optional().or(z.literal("")),
  shift_id: z.string().uuid().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

type CreateResponse = {
  employee: Employee;
  enrollment_code: EnrollmentCode | null;
};

function EmployeesBody() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);

  const { data: employees = [] } = useQuery({
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
      setFlash("Employee created.");
      setLastCode(res.enrollment_code?.code ?? null);
      form.reset();
      await qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err) => setFlash(err instanceof ApiError ? err.message : "Create failed"),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<Employee>(`/api/v1/employees/${id}`, {
        method: "PATCH",
        body: { is_active: false },
      }),
    onSuccess: async () => {
      setFlash("Employee deactivated.");
      await qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const codeMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<EnrollmentCode>(`/api/v1/employees/${id}/enrollment-codes`, {
        method: "POST",
        body: { hours: 72 },
      }),
    onSuccess: (code) => {
      setLastCode(code.code);
      setFlash("New enrollment code generated.");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Employees</h1>
        <p className="text-sm text-muted-foreground">
          Create staff, assign a site and shift, and issue enrollment codes.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add employee</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
            >
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" {...form.register("full_name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register("email")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_code">Employee code</Label>
                <Input id="employee_code" {...form.register("employee_code")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...form.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_title">Job title</Label>
                <Input id="job_title" {...form.register("job_title")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_location_id">Primary site</Label>
                <select
                  id="primary_location_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
            {flash ? <p className="mt-3 text-sm text-muted-foreground">{flash}</p> : null}
            {lastCode ? (
              <p className="mt-2 rounded-md border border-border bg-muted/50 p-3 font-mono text-lg tracking-widest">
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
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
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
                        {e.is_active ? "Active" : "Inactive"}
                      </Badge>
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
                        {e.is_active ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => deactivateMutation.mutate(e.id)}
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
          </CardContent>
        </Card>
      </div>
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
