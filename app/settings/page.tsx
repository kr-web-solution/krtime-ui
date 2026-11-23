"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { apiFetch } from "@/lib/api";
import { friendlyError } from "@/lib/friendly-error";

type Setting = { key: string; value: Record<string, unknown>; description?: string | null };
type Flash = { tone: "success" | "error" | "info"; message: string };

function settingNumber(value: Record<string, unknown> | undefined, field: string) {
  const raw = value?.[field];
  return typeof raw === "number" ? String(raw) : "";
}

function SettingsBody() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<Flash | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<Setting[]>("/api/v1/admin/settings"),
  });
  const data = settingsQuery.data ?? [];

  const faceMatch = data.find((s) => s.key === "face.match_threshold");
  const band = data.find((s) => s.key === "face.borderline_band");
  const spoof = data.find((s) => s.key === "face.spoof_min_score");

  const [match, setMatch] = useState("");
  const [bandVal, setBandVal] = useState("");
  const [spoofVal, setSpoofVal] = useState("");

  useEffect(() => {
    if (!settingsQuery.isSuccess || hydrated) return;
    setMatch(settingNumber(faceMatch?.value, "value"));
    setBandVal(settingNumber(band?.value, "below_accept"));
    setSpoofVal(settingNumber(spoof?.value, "value"));
    setHydrated(true);
  }, [settingsQuery.isSuccess, hydrated, faceMatch, band, spoof]);

  const mutation = useMutation({
    mutationFn: async () => {
      const jobs: Promise<unknown>[] = [];
      if (match) {
        jobs.push(
          apiFetch(`/api/v1/admin/settings/face.match_threshold`, {
            method: "PATCH",
            body: { value: { value: Number(match) } },
          }),
        );
      }
      if (bandVal) {
        jobs.push(
          apiFetch(`/api/v1/admin/settings/face.borderline_band`, {
            method: "PATCH",
            body: { value: { below_accept: Number(bandVal) } },
          }),
        );
      }
      if (spoofVal) {
        jobs.push(
          apiFetch(`/api/v1/admin/settings/face.spoof_min_score`, {
            method: "PATCH",
            body: { value: { value: Number(spoofVal) } },
          }),
        );
      }
      await Promise.all(jobs);
      return jobs.length;
    },
    onSuccess: async (sent) => {
      if (!sent) {
        setFlash({ tone: "info", message: "Nothing to save yet — enter a value first." });
        return;
      }
      setFlash({ tone: "success", message: "Thresholds saved." });
      await qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err) => {
      setFlash({ tone: "error", message: friendlyError(err, "Could not save settings.") });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Tune face match and review thresholds for the pilot.
        </p>
      </div>

      {flash ? <Notice tone={flash.tone}>{flash.message}</Notice> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Face thresholds</CardTitle>
        </CardHeader>
        <CardContent className="grid max-w-lg gap-4">
          {settingsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading settings…</p>
          ) : settingsQuery.isError ? (
            <div className="space-y-3">
              <Notice tone="error">
                {friendlyError(settingsQuery.error, "Could not load settings.")}
              </Notice>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => settingsQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <>
              <form
                className="grid gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="match-threshold">Match threshold</Label>
                  <Input
                    id="match-threshold"
                    type="number"
                    step="0.001"
                    value={match}
                    onChange={(e) => setMatch(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="borderline-band">Borderline band below accept</Label>
                  <Input
                    id="borderline-band"
                    type="number"
                    step="0.001"
                    value={bandVal}
                    onChange={(e) => setBandVal(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spoof-min">Photo quality minimum</Label>
                  <Input
                    id="spoof-min"
                    type="number"
                    step="0.01"
                    value={spoofVal}
                    onChange={(e) => setSpoofVal(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={mutation.isPending}>
                  Save face settings
                </Button>
              </form>
              <p className="text-xs text-muted-foreground">
                Anti-spoof today is a basic quality proxy unless extra liveness weights are
                installed separately.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGate>
      <AppShell>
        <SettingsBody />
      </AppShell>
    </AuthGate>
  );
}
