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

    const latlngs = markers.map((m) => m.coords)

    // Encuadra el mapa sobre los puntos elegidos.
    function fit(L: typeof import("leaflet")) {
      if (!map) return
      map.invalidateSize({ animate: false })
      if (latlngs.length === 1) {
        map.setView(latlngs[0], 16, { animate: false })
      } else if (latlngs.length > 1) {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [45, 45], maxZoom: 16, animate: false })
      } else {
        map.setView([-0.1082127, -78.4964961], 15, { animate: false })
      }
    }

    // Crea el mapa solo cuando el contenedor ya tiene su tamaño real, para que
    // Leaflet calcule bien el origen de píxeles (evita marcadores desplazados).
    function build(L: typeof import("leaflet")) {
      const el = containerRef.current
      if (cancelled || !el || map) return

      map = L.map(el, {
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      })
      mapRef.current = map

      // Vista inicial ANTES de añadir capas para que los marcadores se
      // posicionen con un origen de píxeles válido desde el inicio.
      map.setView([-0.1082127, -78.4964961], 15, { animate: false })

      const tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"

      L.tileLayer(tileUrl, {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

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
      })

      fit(L)
      ;(window as any).__cleanMap = map
      console.log("[v0] map built", { center: map.getCenter(), zoom: map.getZoom(), size: map.getSize() })
    }

    async function init() {
      const L = (await import("leaflet")).default
      if (cancelled || !containerRef.current) return
      const el = containerRef.current

      // Observa el contenedor: construye el mapa en cuanto tenga tamaño válido
      // y lo reencuadra en cambios posteriores (p. ej. al mostrarse en un tab).
      resizeObserver = new ResizeObserver(() => {
        if (el.clientHeight < 50 || el.clientWidth < 50) return
        if (!map) build(L)
        else fit(L)
      })
      resizeObserver.observe(el)

      // Si el contenedor ya tiene tamaño, construye de inmediato.
      if (el.clientHeight >= 50 && el.clientWidth >= 50) build(L)
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
