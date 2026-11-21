"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

type Review = {
  event_id: string;
  employee_id: string;
  outcome: string;
  reason_code: string | null;
  face_similarity: number | null;
  spoof_score: number | null;
  server_timestamp: string;
  review_photo_path: string | null;
  review_photo_url: string | null;
};

function ReviewsBody() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["reviews"],
    queryFn: () => apiFetch<Review[]>("/api/v1/admin/reviews"),
  });

  const decide = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      apiFetch(`/api/v1/admin/reviews/${id}/decide`, {
        method: "POST",
        body: {
          approve,
          reason: approve ? "Manual approve after photo review" : "Manual reject after photo review",
        },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["reviews"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Review queue</h1>
        <p className="text-sm text-muted-foreground">
          Borderline face matches and spoof suspects. Events stay append-only; decisions are audited.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PENDING_REVIEW</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Queue is empty.</p>
          ) : (
            data.map((r) => (
              <div
                key={r.event_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{r.event_id.slice(0, 8)}…</p>
                  <p className="text-xs text-muted-foreground">
                    {r.reason_code ?? "—"} · sim {r.face_similarity?.toFixed(3) ?? "—"} · spoof{" "}
                    {r.spoof_score?.toFixed(2) ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.server_timestamp).toLocaleString()}
                  </p>
                  {r.review_photo_url ? (
                    <p className="text-xs text-muted-foreground">Photo: {r.review_photo_url}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => decide.mutate({ id: r.event_id, approve: true })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decide.mutate({ id: r.event_id, approve: false })}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <AuthGate>
      <AppShell>
        <ReviewsBody />
      </AppShell>
    </AuthGate>
  );
}
