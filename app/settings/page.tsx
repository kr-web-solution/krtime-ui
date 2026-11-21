"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch } from "@/lib/api";

type Setting = { key: string; value: Record<string, unknown>; description?: string | null };

function SettingsBody() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<string | null>(null);
  const { data = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<Setting[]>("/api/v1/admin/settings"),
  });

  const faceMatch = data.find((s) => s.key === "face.match_threshold");
  const band = data.find((s) => s.key === "face.borderline_band");
  const spoof = data.find((s) => s.key === "face.spoof_min_score");

  const [match, setMatch] = useState("");
  const [bandVal, setBandVal] = useState("");
  const [spoofVal, setSpoofVal] = useState("");

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
    },
    onSuccess: async () => {
      setFlash("Thresholds saved.");
      await qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err) => setFlash(err instanceof ApiError ? err.message : "Save failed"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Tune face match and review thresholds for the pilot.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Face thresholds</CardTitle>
        </CardHeader>
        <CardContent className="grid max-w-lg gap-4">
          <div className="space-y-2">
            <Label>Match threshold (current {String(faceMatch?.value?.value ?? "—")})</Label>
            <Input
              type="number"
              step="0.001"
              placeholder="0.363"
              value={match}
              onChange={(e) => setMatch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>
              Borderline band below accept (current{" "}
              {String(band?.value?.below_accept ?? "—")})
            </Label>
            <Input
              type="number"
              step="0.001"
              placeholder="0.02"
              value={bandVal}
              onChange={(e) => setBandVal(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Spoof/quality min (current {String(spoof?.value?.value ?? "—")})</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.35"
              value={spoofVal}
              onChange={(e) => setSpoofVal(e.target.value)}
            />
          </div>
          <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Save face settings
          </Button>
          {flash ? <p className="text-sm text-muted-foreground">{flash}</p> : null}
          <p className="text-xs text-muted-foreground">
            Anti-spoof today is a basic quality proxy unless MiniFASNet weights are
            licence-cleared and installed separately.
          </p>
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
