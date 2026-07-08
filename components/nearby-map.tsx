"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Loader } from "@googlemaps/js-api-loader"
import { MapPin, AlertCircle, Navigation } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { STADIUM, STADIUM_COLOR, nearbyCategories, type NearbyPlace } from "@/lib/nearby-places"
import { cn } from "@/lib/utils"

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

/** Genera un pin (teardrop) SVG como data URL para usarlo como icono de marcador. */
function pinDataUrl(color: string, scale = 1) {
  const w = 32 * scale
  const h = 42 * scale
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 32 42">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26s16-15 16-26C32 7.163 24.837 0 16 0z" fill="${color}"/>
    <circle cx="16" cy="16" r="6.5" fill="#ffffff"/>
  </svg>`
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg)
}

// Estilo del mapa en modo oscuro (paleta sobria acorde al sitio).
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1d2733" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d2733" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ea3b5" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#22303c" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a3846" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6b7f92" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a4b5c" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#16202a" }] },
]

const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
]

interface NearbyMapProps {
  isDarkMode?: boolean
  className?: string
}

export function NearbyMap({ isDarkMode = false, className }: NearbyMapProps) {
  const { language } = useLanguage()
  const es = language === "es"

  const mapDivRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const infoRef = useRef<google.maps.InfoWindow | null>(null)
  const stadiumMarkerRef = useRef<google.maps.Marker | null>(null)
  const markersRef = useRef<Record<string, google.maps.Marker[]>>({})

  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<string[]>(nearbyCategories.map((c) => c.id))

  // Ajusta el encuadre para incluir el estadio y los marcadores visibles.
  const fitToVisible = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const bounds = new google.maps.LatLngBounds()
    bounds.extend({ lat: STADIUM.lat, lng: STADIUM.lng })
    let count = 0
    for (const cat of nearbyCategories) {
      if (!active.includes(cat.id)) continue
      for (const p of cat.places) {
        bounds.extend({ lat: p.lat, lng: p.lng })
        count++
      }
    }
    if (count === 0) {
      map.setCenter({ lat: STADIUM.lat, lng: STADIUM.lng })
      map.setZoom(16)
    } else {
      map.fitBounds(bounds, 64)
    }
  }, [active])

  // Carga de la API y creación del mapa (una sola vez).
  useEffect(() => {
    if (!API_KEY) {
      setError("missing-key")
      return
    }
    let cancelled = false
    const loader = new Loader({ apiKey: API_KEY, version: "weekly" })

    loader
      .importLibrary("maps")
      .then(async () => {
        await loader.importLibrary("marker")
        if (cancelled || !mapDivRef.current) return

        const map = new google.maps.Map(mapDivRef.current, {
          center: { lat: STADIUM.lat, lng: STADIUM.lng },
          zoom: 16,
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: isDarkMode ? DARK_STYLE : LIGHT_STYLE,
        })
        mapRef.current = map
        infoRef.current = new google.maps.InfoWindow()

        // Marcador del estadio: azul, prioridad visual, nunca se oculta.
        const stadiumMarker = new google.maps.Marker({
          position: { lat: STADIUM.lat, lng: STADIUM.lng },
          map,
          title: STADIUM.nombre,
          zIndex: 9999,
          icon: {
            url: pinDataUrl(STADIUM_COLOR, 1.35),
            scaledSize: new google.maps.Size(43, 57),
            anchor: new google.maps.Point(21.5, 57),
          },
        })
        stadiumMarker.addListener("click", () => {
          infoRef.current?.setContent(
            `<div style="font-weight:600;color:#111;padding:2px 4px;">${STADIUM.nombre}</div>`,
          )
          infoRef.current?.open(map, stadiumMarker)
        })
        stadiumMarkerRef.current = stadiumMarker

        // Marcadores por categoría.
        for (const cat of nearbyCategories) {
          markersRef.current[cat.id] = cat.places.map((place: NearbyPlace) => {
            const marker = new google.maps.Marker({
              position: { lat: place.lat, lng: place.lng },
              map: active.includes(cat.id) ? map : null,
              title: place.nombre,
              icon: {
                url: pinDataUrl(cat.color),
                scaledSize: new google.maps.Size(32, 42),
                anchor: new google.maps.Point(16, 42),
              },
            })
            marker.addListener("click", () => {
              const label = es ? "Cómo llegar" : "Directions"
              infoRef.current?.setContent(
                `<div style="min-width:160px;padding:2px 4px;">
                  <div style="font-weight:600;color:#111;margin-bottom:4px;">${place.nombre}</div>
                  <a href="${place.maps}" target="_blank" rel="noopener noreferrer" style="color:${cat.color};font-size:13px;font-weight:500;text-decoration:none;">${label} →</a>
                </div>`,
              )
              infoRef.current?.open(map, marker)
            })
            return marker
          })
        }

        setLoaded(true)
        fitToVisible()
      })
      .catch((err) => {
        console.log("[v0] Google Maps load error:", err?.message || err)
        setError("load-failed")
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cambia el estilo del mapa según el tema.
  useEffect(() => {
    mapRef.current?.setOptions({ styles: isDarkMode ? DARK_STYLE : LIGHT_STYLE })
  }, [isDarkMode])

  // Muestra u oculta marcadores al cambiar las categorías activas.
  useEffect(() => {
    if (!loaded) return
    for (const cat of nearbyCategories) {
      const visible = active.includes(cat.id)
      for (const marker of markersRef.current[cat.id] ?? []) {
        marker.setMap(visible ? mapRef.current : null)
      }
    }
    fitToVisible()
  }, [active, loaded, fitToVisible])

  const toggleCategory = (id: string) => {
    setActive((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      {/* Encabezado + chips de categorías */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border">
        <div className="flex items-center gap-2 mr-auto">
          <Navigation className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {es ? "Lugares cercanos al estadio" : "Places near the stadium"}
          </span>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
        >
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STADIUM_COLOR }} />
          {es ? "Estadio" : "Stadium"}
        </button>
        {nearbyCategories.map((cat) => {
          const on = active.includes(cat.id)
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggleCategory(cat.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                on
                  ? "text-white border-transparent"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
              )}
              style={on ? { backgroundColor: cat.color } : undefined}
              aria-pressed={on}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: on ? "#ffffff" : cat.color }}
              />
              {es ? cat.label : cat.labelEn}
            </button>
          )
        })}
      </div>

      {/* Mapa / estados */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[2/1] min-h-[320px]">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {error === "missing-key"
                ? es
                  ? "Falta la clave de Google Maps"
                  : "Google Maps API key is missing"
                : es
                  ? "No se pudo cargar el mapa"
                  : "The map could not be loaded"}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {error === "missing-key"
                ? es
                  ? "Configura la variable de entorno NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para habilitar el mapa interactivo."
                  : "Set the NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable to enable the interactive map."
                : es
                  ? "Verifica la clave y que la API de Maps JavaScript esté habilitada."
                  : "Check the key and that the Maps JavaScript API is enabled."}
            </p>
          </div>
        ) : (
          <>
            <div ref={mapDivRef} className="absolute inset-0" />
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 animate-pulse" />
                  <span className="text-sm">{es ? "Cargando mapa…" : "Loading map…"}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
