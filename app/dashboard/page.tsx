"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type { Dashboard } from "@/lib/types";

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function DashboardBody() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<Dashboard>("/api/v1/admin/dashboard"),
    refetchInterval: 30_000,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  if (error || !data) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not load dashboard.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {data.work_date} · {data.timezone}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total employees" value={data.total_employees} />
        <Kpi label="Present" value={data.present} />
        <Kpi label="Absent" value={data.absent} />
        <Kpi label="Currently checked in" value={data.currently_checked_in} />
        <Kpi label="Late" value={data.late} />
        <Kpi label="Early departure" value={data.early_departure} />
        <Kpi label="Rejected attempts" value={data.rejected_attempts} />
        <Kpi label="Suspicious events" value={data.suspicious_events} />
        <Kpi label="Geofence exits today" value={data.geofence_exits_today} />
      </div>
      {data.geofence_exits_today > 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {data.geofence_exits_today} geofence exit alert(s) today — see{" "}
          <a href="/security/" className="underline underline-offset-2">
            Security
          </a>
          .
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Present by site</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {data.by_site.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active locations yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.by_site}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="present" fill="hsl(173 80% 28%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      {data.devices_needing_attention > 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {data.devices_needing_attention} device(s) need attention (pending or reset).
        </p>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <AppShell>
        <DashboardBody />
      </AppShell>
    </AuthGate>
  );
}
