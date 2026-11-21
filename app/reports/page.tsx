"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-storage";
import { API_BASE_URL } from "@/lib/config";

type ReportJson = {
  title: string;
  start: string;
  end: string;
  kpis: Record<string, number>;
  rows: Array<Record<string, unknown>>;
};

function ReportsBody() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["report", period],
    queryFn: () =>
      apiFetch<ReportJson>(`/api/v1/admin/reports?period=${period}&format=json`),
  });

  async function download(fmt: "xlsx" | "pdf") {
    const token = getAccessToken();
    const res = await fetch(
      `${API_BASE_URL}/api/v1/admin/reports?period=${period}&format=${fmt}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendguard-report.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Daily, weekly, and monthly attendance with Excel and PDF export.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Period</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label>Range</Label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value as typeof period)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <Button type="button" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Button>
          <Button type="button" variant="outline" onClick={() => download("xlsx")}>
            Excel
          </Button>
          <Button type="button" variant="outline" onClick={() => download("pdf")}>
            PDF
          </Button>
        </CardContent>
      </Card>

      {data ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{data.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              {Object.entries(data.kpis).map(([k, v]) => (
                <div key={k}>
                  <span className="text-muted-foreground">{k}: </span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
            <div className="max-h-[420px] overflow-auto text-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Late</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.slice(0, 100).map((r, i) => (
                    <tr key={i} className="border-b border-border/60">
                      <td className="py-2 pr-3">{String(r.work_date)}</td>
                      <td className="py-2 pr-3">{String(r.employee_code)}</td>
                      <td className="py-2 pr-3">{String(r.full_name)}</td>
                      <td className="py-2 pr-3">{String(r.status)}</td>
                      <td className="py-2 pr-3">{r.is_late ? "yes" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <AuthGate>
      <AppShell>
        <ReportsBody />
      </AppShell>
    </AuthGate>
  );
}
