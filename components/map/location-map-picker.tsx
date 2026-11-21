"use client";

import { useEffect, useMemo } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type Props = {
  lat: number;
  lng: number;
  radius_m: number;
  onChange: (lat: number, lng: number) => void;
};

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationMapPicker({ lat, lng, radius_m, onChange }: Props) {
  const center = useMemo(() => ({ lat, lng }), [lat, lng]);

  useEffect(() => {
    // Fix default icon paths in bundlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
  }, []);

  return (
    <div className="h-72 w-full overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={17}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        <Marker
          position={[lat, lng]}
          icon={markerIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const m = e.target as L.Marker;
              const p = m.getLatLng();
              onChange(p.lat, p.lng);
            },
          }}
        />
        <Circle
          center={[lat, lng]}
          radius={radius_m}
          pathOptions={{ color: "#0f766e", fillColor: "#14b8a6", fillOpacity: 0.2 }}
        />
      </MapContainer>
    </div>
  );
}
