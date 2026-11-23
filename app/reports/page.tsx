"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-storage";
import { API_BASE_URL } from "@/lib/config";
import { friendlyError, humanStatus } from "@/lib/friendly-error";

type ReportJson = {
  title: string;
  start: string;
  end: string;
  kpis: Record<string, number>;
  rows: Array<Record<string, unknown>>;
};

type Flash = { tone: "success" | "error" | "info"; message: string };

function kpiLabel(key: string) {
  const labels: Record<string, string> = {
    present: "Present",
    absent: "Absent",
    late: "Late",
    on_leave: "On leave",
    early_departure: "Early departure",
    checked_in: "Checked in",
    total: "Total",
    rejected: "Rejected",
  };
  return labels[key] ?? key.replaceAll("_", " ");
}

function ReportsBody() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [flash, setFlash] = useState<Flash | null>(null);
  const reportQuery = useQuery({
    queryKey: ["report", period],
    queryFn: () =>
      apiFetch<ReportJson>(`/api/v1/admin/reports?period=${period}&format=json`),
  });
  const data = reportQuery.data;

  async function download(fmt: "xlsx" | "pdf") {
    try {
      const token = getAccessToken();
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/reports?period=${period}&format=${fmt}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) {
        setFlash({
          tone: "error",
          message: "Could not download the report. Please try again.",
        });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `krtime-report.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
      setFlash({ tone: "success", message: "Download started." });
    } catch (err) {
      setFlash({
        tone: "error",
        message: friendlyError(err, "Could not download the report. Check your connection."),
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Daily, weekly, and monthly attendance with Excel and PDF export.
        </p>
      </div>

      {flash ? <Notice tone={flash.tone}>{flash.message}</Notice> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Period</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="report-period">Range</Label>
            <select
              id="report-period"
              className="h-10 rounded-md border border-input bg-background px-3 text-base md:text-sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value as typeof period)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <Button
            type="button"
            onClick={() => reportQuery.refetch()}
            disabled={reportQuery.isFetching}
          >
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

      {reportQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading report…</p>
      ) : reportQuery.isError ? (
        <div className="space-y-3">
          <Notice tone="error">
            {friendlyError(reportQuery.error, "Could not load this report.")}
          </Notice>
          <Button type="button" variant="outline" size="sm" onClick={() => reportQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : data ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{data.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              {Object.entries(data.kpis).map(([k, v]) => (
                <div key={k}>
                  <span className="text-muted-foreground">{kpiLabel(k)}: </span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
            {data.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rows for this period.</p>
            ) : (
              <div className="max-h-[420px] overflow-auto text-sm">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Code</th>
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Punctuality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.slice(0, 100).map((r, i) => (
                      <tr key={i} className="border-b border-border/60">
                        <td className="py-2 pr-3">{String(r.work_date ?? "—")}</td>
                        <td className="py-2 pr-3">{String(r.employee_code ?? "—")}</td>
                        <td className="py-2 pr-3">{String(r.full_name ?? "Staff member")}</td>
                        <td className="py-2 pr-3">{humanStatus(String(r.status ?? ""))}</td>
                        <td className="py-2 pr-3">{r.is_late ? "Late" : "On time"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
