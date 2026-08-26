"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle: string;
};

const TAMPERE_CENTER: [number, number] = [61.4978, 23.761];

/** Renders pins on a Leaflet/OpenStreetMap map; clicking one opens a popup
 * with a link to `${basePath}/${pin.id}` for full details. */
export function ServiceMap({ pins, basePath }: { pins: MapPin[]; basePath: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | undefined;

    (async () => {
      if (!containerRef.current) return;
      const L = (await import("leaflet")).default;
      // Effects run twice under React Strict Mode in dev; bail out if this
      // instance's cleanup already fired before the dynamic import resolved.
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, {
        center: TAMPERE_CENTER,
        zoom: 12,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: '<span class="service-pin"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      for (const pin of pins) {
        L.marker([pin.lat, pin.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<strong>${escapeHtml(pin.name)}</strong><br/>${escapeHtml(pin.subtitle)}<br/>` +
              `<a href="${basePath}/${pin.id}" style="color:#2f8fe0;">Näytä tiedot &rarr;</a>`,
          );
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [pins, basePath]);

  return (
    <>
      <style>{`.service-pin {
        display: block;
        width: 14px;
        height: 14px;
        border-radius: 999px;
        background: #7137e3;
        border: 2px solid white;
        box-shadow: 0 0 0 1px rgba(30,27,41,0.3);
      }`}</style>
      <div ref={containerRef} className="h-80 w-full rounded border border-line" />
    </>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
