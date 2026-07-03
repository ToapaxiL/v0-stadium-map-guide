"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import type { Map as LeafletMap } from "leaflet"

export interface CleanMapMarker {
  name: string
  coords: [number, number] // [lat, lng]
  color: string // hex color for the pin
  isStadium?: boolean
}

interface CleanMapProps {
  markers: CleanMapMarker[]
  className?: string
}

// Teardrop pin as an inline SVG. `star` renders the stadium marker.
function pinSvg(color: string, star = false): string {
  const inner = star
    ? `<circle cx="12" cy="9" r="5.5" fill="#ffffff"/><path d="M12 6.2l1 2 2.2.2-1.7 1.5.5 2.1L12 11l-2 1.1.5-2.1L8.8 8.4 11 8.2z" fill="${color}"/>`
    : `<circle cx="12" cy="9" r="3.2" fill="#ffffff"/>`
  return `
    <svg width="30" height="40" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 22 12 22s12-13.6 12-22C24 5.4 18.6 0 12 0z"
        fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
      ${inner}
    </svg>`
}

export function CleanMap({ markers, className }: CleanMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  useEffect(() => {
    let cancelled = false
    let map: LeafletMap | null = null
    let resizeObserver: ResizeObserver | null = null

    // Encuadra el mapa sobre los puntos elegidos.
    function fit(L: typeof import("leaflet"), latlngs: [number, number][]) {
      const el = containerRef.current
      if (!map || !el || el.clientHeight < 50 || el.clientWidth < 50) return
      map.invalidateSize({ animate: false })
      if (latlngs.length === 1) {
        map.setView(latlngs[0], 16, { animate: false })
      } else if (latlngs.length > 1) {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [45, 45], maxZoom: 16, animate: false })
      } else {
        map.setView([-0.1082127, -78.4964961], 15, { animate: false })
      }
    }

    async function init() {
      const L = (await import("leaflet")).default
      if (cancelled || !containerRef.current) return

      map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      })
      mapRef.current = map

      const tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"

      L.tileLayer(tileUrl, {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      const latlngs: [number, number][] = []
      markers.forEach((m) => {
        const icon = L.divIcon({
          className: "clean-map-pin",
          html: pinSvg(m.color, m.isStadium),
          iconSize: [30, 40],
          iconAnchor: [15, 40],
          popupAnchor: [0, -36],
        })
        L.marker(m.coords, { icon, title: m.name })
          .addTo(map!)
          .bindPopup(`<strong>${m.name}</strong>`)
        latlngs.push(m.coords)
      })

      fit(L, latlngs)

      // Reencaja cuando el contenedor obtiene/actualiza su tamaño real,
      // evitando el mosaico parcial de tiles al montar dentro de tabs.
      resizeObserver = new ResizeObserver(() => fit(L, latlngs))
      if (containerRef.current) resizeObserver.observe(containerRef.current)
      requestAnimationFrame(() => fit(L, latlngs))
      setTimeout(() => fit(L, latlngs), 250)
    }

    init()

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      map?.remove()
      mapRef.current = null
    }
  }, [markers, isDark])

  return <div ref={containerRef} className={className} />
}
