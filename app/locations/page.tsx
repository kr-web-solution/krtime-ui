"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { friendlyError } from "@/lib/friendly-error";
import { cn } from "@/lib/utils";
import type { Location, QrDisplayLink } from "@/lib/types";

const MapPicker = dynamic(
  () =>
    import("@/components/map/location-map-picker").then((m) => m.LocationMapPicker),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-xl bg-muted" /> },
);

const schema = z.object({
  name: z.string().min(2, "Enter a site name").max(120, "Name is too long"),
  slug: z
    .string()
    .min(2, "Enter a short site code")
    .max(80, "Site code is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens"),
  lat: z.coerce.number().min(-90, "Latitude is out of range").max(90, "Latitude is out of range"),
  lng: z.coerce.number().min(-180, "Longitude is out of range").max(180, "Longitude is out of range"),
  radius_m: z.coerce.number().min(5, "Radius must be at least 5 metres").max(500, "Radius is too large"),
  notes: z.string().max(2000, "Notes are too long").optional(),
});

type FormValues = z.infer<typeof schema>;
type Flash = { tone: "success" | "error" | "info"; message: string };

function LocationsBody() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [qrLink, setQrLink] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: () => apiFetch<Location[]>("/api/v1/locations"),
  });
  const locations = locationsQuery.data ?? [];

  const selected = useMemo(
    () => locations.find((l) => l.id === selectedId) ?? null,
    [locations, selectedId],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      lat: 13.0827,
      lng: 80.2707,
      radius_m: 30,
      notes: "",
    },
  });
  const errors = form.formState.errors;

  function loadLocation(loc: Location) {
    setSelectedId(loc.id);
    setQrLink(null);
    form.reset({
      name: loc.name,
      slug: loc.slug,
      lat: loc.lat,
      lng: loc.lng,
      radius_m: loc.radius_m,
      notes: loc.notes ?? "",
    });
  }

  function newLocation() {
    setSelectedId(null);
    setQrLink(null);
    form.reset({
      name: "",
      slug: "",
      lat: 13.0827,
      lng: 80.2707,
      radius_m: 30,
      notes: "",
    });
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (selectedId) {
        return apiFetch<Location>(`/api/v1/locations/${selectedId}`, {
          method: "PATCH",
          body: {
            name: values.name,
            lat: values.lat,
            lng: values.lng,
            radius_m: values.radius_m,
            notes: values.notes || null,
          },
        });
      }
      return apiFetch<Location>("/api/v1/locations", {
        method: "POST",
        body: {
          ...values,
          notes: values.notes || null,
          active: true,
        },
      });
    },
    onSuccess: async (loc) => {
      setFlash({ tone: "success", message: selectedId ? "Site updated." : "Site created." });
      await qc.invalidateQueries({ queryKey: ["locations"] });
      loadLocation(loc);
    },
    onError: (err) => {
      setFlash({ tone: "error", message: friendlyError(err, "Could not save this site.") });
    },
  });

  const qrMutation = useMutation({
    mutationFn: async (slug: string) =>
      apiFetch<QrDisplayLink>(`/api/v1/qr/${slug}/display-link`, { method: "POST" }),
    onSuccess: (data) => {
      setQrLink(data.display_url);
      setFlash({ tone: "success", message: "QR display link generated." });
    },
    onError: (err) => {
      setFlash({ tone: "error", message: friendlyError(err, "Could not create a QR link.") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/locations/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setFlash({ tone: "success", message: "Site deactivated." });
      setConfirmDeactivate(false);
      newLocation();
      await qc.invalidateQueries({ queryKey: ["locations"] });
    },
    onError: (err) => {
      setFlash({ tone: "error", message: friendlyError(err, "Could not deactivate this site.") });
    },
  });

  const values = form.watch();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Locations</h1>
          <p className="text-sm text-muted-foreground">
            Drop a pin, set radius, and open the entrance tablet QR page.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={newLocation}>
          New location
        </Button>
      </div>

      {flash ? <Notice tone={flash.tone}>{flash.message}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {locationsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading sites…</p>
            ) : locationsQuery.isError ? (
              <div className="space-y-3">
                <Notice tone="error">
                  {friendlyError(locationsQuery.error, "Could not load sites.")}
                </Notice>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => locationsQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : locationsQuery.isSuccess && locations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sites yet.</p>
            ) : (
              locations.map((loc) => {
                const isSelected = selectedId === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => loadLocation(loc)}
                    aria-current={isSelected ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm",
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <span>
                      <span className="block font-medium">{loc.name}</span>
                      <span className="text-xs text-muted-foreground">{loc.slug}</span>
                    </span>
                    <Badge variant={loc.active ? "success" : "secondary"}>
                      {loc.active ? "Active" : "Off"}
                    </Badge>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedId ? "Edit location" : "Create location"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="grid gap-4 md:grid-cols-2"
              noValidate
              onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
            >
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Site code</Label>
                <Input
                  id="slug"
                  disabled={!!selectedId}
                  aria-invalid={Boolean(errors.slug)}
                  {...form.register("slug")}
                />
                <FieldError message={errors.slug?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  aria-invalid={Boolean(errors.lat)}
                  {...form.register("lat")}
                />
                <FieldError message={errors.lat?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  aria-invalid={Boolean(errors.lng)}
                  {...form.register("lng")}
                />
                <FieldError message={errors.lng?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="radius_m">Radius (metres)</Label>
                <Input
                  id="radius_m"
                  type="number"
                  aria-invalid={Boolean(errors.radius_m)}
                  {...form.register("radius_m")}
                />
                <FieldError message={errors.radius_m?.message} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Calibration notes</Label>
                <Textarea id="notes" {...form.register("notes")} />
                <FieldError message={errors.notes?.message} />
              </div>
              <div className="md:col-span-2">
                <MapPicker
                  lat={Number(values.lat) || 0}
                  lng={Number(values.lng) || 0}
                  radius_m={Number(values.radius_m) || 30}
                  onChange={(lat, lng) => {
                    form.setValue("lat", Number(lat.toFixed(6)));
                    form.setValue("lng", Number(lng.toFixed(6)));
                  }}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Click the map or drag the marker. Circle shows the geofence radius.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving…" : "Save location"}
                </Button>
                {selected ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={qrMutation.isPending}
                    onClick={() => qrMutation.mutate(selected.slug)}
                  >
                    Generate QR display link
                  </Button>
                ) : null}
                {selected?.active ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={deleteMutation.isPending}
                    onClick={() => setConfirmDeactivate(true)}
                  >
                    Deactivate
                  </Button>
                ) : null}
              </div>
            </form>
            {qrLink ? (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Tablet URL</p>
                <a
                  className="break-all text-primary underline"
                  href={qrLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  {qrLink}
                </a>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDeactivate}
        title="Deactivate this site?"
        body={`${selected?.name ?? "This site"} will stop accepting check-ins.`}
        confirmLabel="Deactivate"
        danger
        pending={deleteMutation.isPending}
        onCancel={() => setConfirmDeactivate(false)}
        onConfirm={() => {
          if (selected) deleteMutation.mutate(selected.id);
        }}
      />
    </div>
  );
}

export default function LocationsPage() {
  return (
    <AuthGate>
      <AppShell>
        <LocationsBody />
      </AppShell>
    </AuthGate>
  );
}
