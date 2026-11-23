"use client";

import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { apiFetch } from "@/lib/api";
import { friendlyError } from "@/lib/friendly-error";
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

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="h-72 pt-6">
          <div className="h-full animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardBody() {
  const dashQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<Dashboard>("/api/v1/admin/dashboard"),
    refetchInterval: 30_000,
  });
  const data = dashQuery.data;

  if (dashQuery.isLoading) return <DashboardSkeleton />;
  if (dashQuery.isError || !data) {
    return (
      <div className="space-y-3">
        <Notice tone="error">
          {friendlyError(dashQuery.error, "Could not load the dashboard.")}
        </Notice>
        <Button type="button" variant="outline" size="sm" onClick={() => dashQuery.refetch()}>
          Retry
        </Button>
      </div>
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
        <Notice tone="info">
          {data.geofence_exits_today} geofence exit alert{data.geofence_exits_today === 1 ? "" : "s"} today — see{" "}
          <Link href="/security/" className="font-medium underline underline-offset-2">
            Security
          </Link>
          .
        </Notice>
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
                <Bar dataKey="present" fill="hsl(0 84% 42%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      {data.devices_needing_attention > 0 ? (
        <Notice tone="info">
          {data.devices_needing_attention} device
          {data.devices_needing_attention === 1 ? "" : "s"} need attention.{" "}
          <Link href="/devices/" className="font-medium underline underline-offset-2">
            Open devices
          </Link>
          .
        </Notice>
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
