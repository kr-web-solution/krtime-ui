"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Notice } from "@/components/ui/notice";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-storage";
import { API_BASE_URL } from "@/lib/config";
import { friendlyError } from "@/lib/friendly-error";
import { staffName } from "@/lib/utils";
import type { Employee } from "@/lib/types";

type Review = {
  event_id: string;
  employee_id: string;
  employee_name?: string | null;
  full_name?: string | null;
  outcome: string;
  reason_code: string | null;
  face_similarity: number | null;
  spoof_score: number | null;
  server_timestamp: string;
  review_photo_path: string | null;
  review_photo_url: string | null;
};

function humanReason(code: string | null): string {
  switch ((code ?? "").toLowerCase()) {
    case "low_face_similarity":
    case "face_mismatch":
      return "Face match was uncertain";
    case "spoof_suspected":
    case "liveness_failed":
      return "Liveness check needed a second look";
    case "blurry_photo":
    case "poor_image":
      return "Photo quality was too low";
    case "multiple_faces":
      return "More than one face was detected";
    case "no_face":
      return "No clear face in the photo";
    case "":
      return "Needs a closer look";
    default:
      return "Needs a closer look";
  }
}

function ReviewPhoto({ url, alt }: { url: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    const token = getAccessToken();
    const full = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
    const controller = new AbortController();

    fetch(full, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.blob() : Promise.reject()))
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setSrc(null));

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="mt-2 h-28 w-28 rounded-lg border border-border object-cover"
    />
  );
}

function ReviewsBody() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );
  const [rejectTarget, setRejectTarget] = useState<Review | null>(null);

  const reviewsQuery = useQuery({
    queryKey: ["reviews"],
    queryFn: () => apiFetch<Review[]>("/api/v1/admin/reviews"),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiFetch<Employee[]>("/api/v1/employees"),
  });
  const reviews = reviewsQuery.data ?? [];

  function personName(row: Review) {
    return staffName(
      row.full_name ||
        row.employee_name ||
        employees.find((e) => e.id === row.employee_id)?.full_name,
    );
  }

  const decide = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      apiFetch(`/api/v1/admin/reviews/${id}/decide`, {
        method: "POST",
        body: {
          approve,
          reason: approve
            ? "Manual approve after photo review"
            : "Manual reject after photo review",
        },
      }),
    onSuccess: async (_res, vars) => {
      setRejectTarget(null);
      setFlash({
        tone: "success",
        message: vars.approve ? "Check-in approved." : "Check-in rejected.",
      });
      await qc.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (err) =>
      setFlash({ tone: "error", message: friendlyError(err, "Could not save that decision.") }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Pending photo reviews</h1>
        <p className="text-sm text-muted-foreground">
          Check-ins that need a quick photo decision before attendance is finalized.
        </p>
      </div>

      {flash ? <Notice tone={flash.tone}>{flash.message}</Notice> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviewsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading reviews…</p>
          ) : reviewsQuery.isError ? (
            <div className="space-y-3">
              <Notice tone="error">
                {friendlyError(reviewsQuery.error, "Could not load photo reviews.")}
              </Notice>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => reviewsQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : reviewsQuery.isSuccess && reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Queue is empty.</p>
          ) : (
            reviews.map((r) => {
              const name = personName(r);
              return (
                <div
                  key={r.event_id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">{humanReason(r.reason_code)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.server_timestamp).toLocaleString()}
                    </p>
                    {r.review_photo_url ? (
                      <ReviewPhoto url={r.review_photo_url} alt={`Review photo for ${name}`} />
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: r.event_id, approve: true })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={decide.isPending}
                      onClick={() => setRejectTarget(r)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title="Reject this check-in?"
        body={`${rejectTarget ? personName(rejectTarget) : "This person"} will not be marked present for this attempt.`}
        confirmLabel="Reject"
        danger
        pending={decide.isPending}
        onCancel={() => setRejectTarget(null)}
        onConfirm={() => {
          if (rejectTarget) decide.mutate({ id: rejectTarget.event_id, approve: false });
        }}
      />
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
