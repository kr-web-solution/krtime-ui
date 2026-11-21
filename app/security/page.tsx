"use client";

import { useQuery } from "@tanstack/react-query";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type SecurityEvent = {
  id: string;
  event_type: string;
  severity: string;
  message: string;
  employee_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

function eventLabel(type: string): string {
  if (type === "geofence_exit") return "Left site while checked in";
  if (type === "mock_location") return "Mock GPS";
  return type.replaceAll("_", " ");
}

function SecurityBody() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["security-events"],
    queryFn: () => apiFetch<SecurityEvent[]>("/api/v1/admin/security-events?limit=100"),
    refetchInterval: 30_000,
  });

  const exits = data.filter((e) => e.event_type === "geofence_exit");
  const activeExits = exits.filter((e) => e.details?.active === true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Security events</h1>
        <p className="text-sm text-muted-foreground">
          Geofence exits while checked in, mock GPS, bad signatures, and other client signals.
        </p>
      </div>

      {activeExits.length > 0 ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base text-amber-800 dark:text-amber-200">
              Active site exits ({activeExits.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeExits.map((e) => (
              <div
                key={e.id}
                className="rounded-lg border border-amber-500/30 bg-background/60 px-3 py-2 text-sm"
              >
                <p className="font-medium">{e.message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                  {typeof e.details?.distance_m === "number"
                    ? ` · ${e.details.distance_m} m from site`
                    : null}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            data.map((e) => {
              const isExit = e.event_type === "geofence_exit";
              const active = e.details?.active === true;
              return (
                <div
                  key={e.id}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm",
                    isExit
                      ? "border-amber-500/35 bg-amber-500/5"
                      : "border-border",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{eventLabel(e.event_type)}</span>
                    <span className="text-xs uppercase text-muted-foreground">
                      {e.severity}
                      {isExit ? (active ? " · active" : " · returned") : null}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{e.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <AuthGate>
      <AppShell>
        <SecurityBody />
      </AppShell>
    </AuthGate>
  );
}
