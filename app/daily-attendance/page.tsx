"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, apiFetch } from "@/lib/api";

type DailyEmployee = {
  employee_id: string;
  full_name: string;
  employee_code: string;
  record_id: string;
  status: string;
  check_in_at: string | null;
  check_out_at: string | null;
  is_late: boolean;
  presence_status: string;
  presence_at: string | null;
  distance_m: number | null;
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
};

type DailyLocation = {
  location_id: string | null;
  name: string;
  slug: string | null;
  checked_in_count: number;
  inside_count: number;
  outside_count: number;
  employees: DailyEmployee[];
};

type DailyAttendance = {
  work_date: string;
  timezone: string;
  total_checked_in: number;
  currently_open: number;
  inside_count: number;
  outside_count: number;
  locations: DailyLocation[];
};

function presenceBadge(status: string) {
  if (status === "inside") return { label: "In location", variant: "success" as const };
  if (status === "outside") return { label: "Out of location", variant: "danger" as const };
  if (status === "mocked") return { label: "Mock GPS", variant: "warning" as const };
  if (status === "checked_out") return { label: "Checked out", variant: "secondary" as const };
  if (status === "on_leave") return { label: "On leave", variant: "secondary" as const };
  return { label: "Awaiting ping", variant: "outline" as const };
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function DailyAttendanceBody() {
  const qc = useQueryClient();
  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ["daily-attendance"],
    queryFn: () => apiFetch<DailyAttendance>("/api/v1/admin/daily-attendance"),
    refetchInterval: 30_000,
  });

  const remove = useMutation({
    mutationFn: (recordId: string) =>
      apiFetch(`/api/v1/admin/daily-attendance/${recordId}`, { method: "DELETE" }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["daily-attendance"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading today’s attendance…</p>;
  }
  if (error || !data) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not load daily attendance.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Daily attendance</h1>
          <p className="text-sm text-muted-foreground">
            {data.work_date} · {data.timezone} · auto-refresh 30s
            {dataUpdatedAt ? ` · updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : ""}
          </p>
        </div>
      </div>

      {remove.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {remove.error instanceof ApiError
            ? remove.error.message
            : "Could not delete attendance record."}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Checked in today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl tracking-tight">{data.total_checked_in}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Still open
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl tracking-tight">{data.currently_open}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl tracking-tight text-emerald-700 dark:text-emerald-300">
              {data.inside_count}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Out of location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl tracking-tight text-rose-700 dark:text-rose-300">
              {data.outside_count}
            </p>
          </CardContent>
        </Card>
      </div>

      {data.locations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No check-ins yet today.
          </CardContent>
        </Card>
      ) : (
        data.locations.map((loc) => (
          <Card key={loc.location_id ?? "unassigned"}>
            <CardHeader className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg">
                  {loc.name}
                  {loc.slug ? (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      /{loc.slug}
                    </span>
                  ) : null}
                </CardTitle>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{loc.checked_in_count} checked in</span>
                  <span className="text-emerald-700 dark:text-emerald-300">
                    {loc.inside_count} in
                  </span>
                  <span className="text-rose-700 dark:text-rose-300">
                    {loc.outside_count} out
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3 font-medium">Employee</th>
                    <th className="py-2 pr-3 font-medium">Check-in</th>
                    <th className="py-2 pr-3 font-medium">Check-out</th>
                    <th className="py-2 pr-3 font-medium">Current location</th>
                    <th className="py-2 pr-3 font-medium">Distance</th>
                    <th className="py-2 pr-3 font-medium">Last GPS</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loc.employees.map((emp) => {
                    const badge = presenceBadge(emp.presence_status);
                    return (
                      <tr key={emp.record_id} className="border-b border-border/70">
                        <td className="py-2.5 pr-3">
                          <div className="font-medium">{emp.full_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {emp.employee_code}
                            {emp.is_late ? " · late" : ""}
                            {emp.status !== "open" ? ` · ${emp.status}` : ""}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3">{formatTime(emp.check_in_at)}</td>
                        <td className="py-2.5 pr-3">{formatTime(emp.check_out_at)}</td>
                        <td className="py-2.5 pr-3">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="py-2.5 pr-3">
                          {emp.distance_m != null ? `${emp.distance_m.toFixed(0)} m` : "—"}
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground">
                          {emp.lat != null && emp.lng != null ? (
                            <div>
                              <div>
                                {emp.lat.toFixed(5)}, {emp.lng.toFixed(5)}
                              </div>
                              <div>
                                ±{emp.accuracy_m != null ? emp.accuracy_m.toFixed(0) : "?"} m
                                {emp.presence_at
                                  ? ` · ${new Date(emp.presence_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}`
                                  : ""}
                              </div>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={remove.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete attendance for ${emp.full_name}? They can check in again today.`,
                                )
                              ) {
                                remove.mutate(emp.record_id);
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export default function DailyAttendancePage() {
  return (
    <AuthGate>
      <AppShell>
        <DailyAttendanceBody />
      </AppShell>
    </AuthGate>
  );
}
