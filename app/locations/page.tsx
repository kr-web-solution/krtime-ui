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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiFetch } from "@/lib/api";
import type { Location, QrDisplayLink } from "@/lib/types";

const MapPicker = dynamic(
  () =>
    import("@/components/map/location-map-picker").then((m) => m.LocationMapPicker),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-xl bg-muted" /> },
);

const schema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase kebab-case"),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_m: z.coerce.number().min(5).max(500),
  notes: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

function LocationsBody() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [qrLink, setQrLink] = useState<string | null>(null);

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: () => apiFetch<Location[]>("/api/v1/locations"),
  });

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
      setMessage(selectedId ? "Location updated." : "Location created.");
      await qc.invalidateQueries({ queryKey: ["locations"] });
      loadLocation(loc);
    },
    onError: (err) => {
      setMessage(err instanceof ApiError ? err.message : "Save failed");
    },
  });

  const qrMutation = useMutation({
    mutationFn: async (slug: string) =>
      apiFetch<QrDisplayLink>(`/api/v1/qr/${slug}/display-link`, { method: "POST" }),
    onSuccess: (data) => {
      setQrLink(data.display_url);
      setMessage("QR display link generated.");
    },
    onError: (err) => {
      setMessage(err instanceof ApiError ? err.message : "Could not create QR link");
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

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : locations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sites yet.</p>
            ) : (
              locations.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => loadLocation(loc)}
                  className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span>
                    <span className="block font-medium">{loc.name}</span>
                    <span className="text-xs text-muted-foreground">{loc.slug}</span>
                  </span>
                  <Badge variant={loc.active ? "success" : "secondary"}>
                    {loc.active ? "Active" : "Off"}
                  </Badge>
                </button>
              ))
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
              onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
            >
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...form.register("name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" disabled={!!selectedId} {...form.register("slug")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input id="lat" type="number" step="any" {...form.register("lat")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude</Label>
                <Input id="lng" type="number" step="any" {...form.register("lng")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="radius_m">Radius (metres)</Label>
                <Input id="radius_m" type="number" {...form.register("radius_m")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Calibration notes</Label>
                <Textarea id="notes" {...form.register("notes")} />
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
              </div>
            </form>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
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
