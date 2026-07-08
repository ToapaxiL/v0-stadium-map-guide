"use client"

import { useEffect, useRef, useState } from "react"
import { setOptions, importLibrary } from "@googlemaps/js-api-loader"
import { useLanguage } from "@/lib/language-context"
import { STADIUM, PLACE_CATEGORIES, type PlaceCategory } from "@/lib/nearby-places"
import { Pill, MapPin, AlertCircle } from "lucide-react"

const STADIUM_COLOR = "#2563eb" // azul

// Iconos de categoría (para las chips)
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  pharmacies: <Pill className="w-4 h-4" />,
}

// Marcador SVG en forma de pin, coloreado
function pinIcon(color: string, scale = 1): google.maps.Symbol {
  return {
    path: "M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    scale,
    anchor: new google.maps.Point(12, 24),
    labelOrigin: new google.maps.Point(12, 9),
  }
}

interface NearbyMapProps {
  isDarkMode: boolean
}

export function NearbyMap({ isDarkMode }: NearbyMapProps) {
  const { t, language } = useLanguage()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const infoWindow = useRef<google.maps.InfoWindow | null>(null)
  const stadiumMarker = useRef<google.maps.Marker | null>(null)
  const placeMarkers = useRef<google.maps.Marker[]>([])

  // Conserva la vista (centro/zoom) al recrear el mapa por cambio de tema
  const lastView = useRef<{ center: google.maps.LatLngLiteral; zoom: number }>({
    center: { lat: STADIUM.lat, lng: STADIUM.lng },
    zoom: 15,
  })

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [activeCategories, setActiveCategories] = useState<string[]>(
    PLACE_CATEGORIES.map((c) => c.id),
  )
  // Ref para leer la selección actual dentro del render de marcadores sin re-crear el mapa
  const activeCategoriesRef = useRef(activeCategories)
  activeCategoriesRef.current = activeCategories

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Dibuja / actualiza los marcadores de las categorías activas
  function renderPlaceMarkers(map: google.maps.Map) {
    placeMarkers.current.forEach((m) => m.setMap(null))
    placeMarkers.current = []

    PLACE_CATEGORIES.filter((c) => activeCategoriesRef.current.includes(c.id)).forEach((category) => {
      category.places.forEach((place) => {
        const marker = new google.maps.Marker({
          position: { lat: place.lat, lng: place.lng },
          map,
          title: place.nombre,
          icon: pinIcon(category.color, 1.3),
          zIndex: 10,
        })
        marker.addListener("click", () => {
          if (!infoWindow.current) return
          infoWindow.current.setContent(
            `<div style="max-width:220px;color:#111;">
              <div style="font-weight:600;margin-bottom:4px;">${place.nombre}</div>
              <a href="${place.maps}" target="_blank" rel="noreferrer" style="color:#2563eb;font-size:12px;text-decoration:underline;">
                ${language === "es" ? "Ver en Google Maps" : "View on Google Maps"}
              </a>
            </div>`,
          )
          infoWindow.current.open(map, marker)
        })
        placeMarkers.current.push(marker)
      })
    })
  }

  // Inicializa (o recrea) el mapa. Se recrea al cambiar el tema porque
  // colorScheme sólo se aplica al construir el mapa.
  useEffect(() => {
    if (!apiKey) {
      setStatus("error")
      return
    }
    let cancelled = false

    setOptions({ key: apiKey, v: "weekly" })

    // Importa "marker" para que google.maps.Marker esté disponible globalmente.
    Promise.all([importLibrary("maps"), importLibrary("marker")])
      .then(([{ Map, InfoWindow }]) => {
        if (cancelled || !mapRef.current) return

        const map = new Map(mapRef.current, {
          center: lastView.current.center,
          zoom: lastView.current.zoom,
          // Estilo estándar de Google Maps (claro / oscuro nativo).
          // No se usan estilos personalizados: se muestran calles, parques,
          // transporte y POIs tal cual los ofrece Google.
          colorScheme: isDarkMode ? "DARK" : "LIGHT",
          // Los iconos/lugares de Google NO responden al clic ni abren InfoWindow.
          clickableIcons: false,
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
        })
        mapInstance.current = map
        infoWindow.current = new InfoWindow()

        // Marcador del estadio: azul, prioridad máxima, siempre visible
        stadiumMarker.current = new google.maps.Marker({
          position: { lat: STADIUM.lat, lng: STADIUM.lng },
          map,
          title: STADIUM.nombre,
          icon: pinIcon(STADIUM_COLOR, 1.9),
          zIndex: 9999,
          animation: google.maps.Animation.DROP,
        })
        stadiumMarker.current.addListener("click", () => {
          if (!infoWindow.current || !mapInstance.current) return
          infoWindow.current.setContent(
            `<div style="font-weight:600;color:#111;padding:2px 4px;">${STADIUM.nombre}</div>`,
          )
          infoWindow.current.open(mapInstance.current, stadiumMarker.current!)
        })

        // Guarda la vista cuando el usuario mueve/zoomea el mapa
        map.addListener("idle", () => {
          const c = map.getCenter()
          const z = map.getZoom()
          if (c && typeof z === "number") {
            lastView.current = { center: { lat: c.lat(), lng: c.lng() }, zoom: z }
          }
        })

        renderPlaceMarkers(map)
        setStatus("ready")
      })
      .catch((err) => {
        console.log("[v0] Google Maps load error:", err?.message)
        if (!cancelled) setStatus("error")
      })

    return () => {
      cancelled = true
      placeMarkers.current.forEach((m) => m.setMap(null))
      placeMarkers.current = []
      stadiumMarker.current?.setMap(null)
      stadiumMarker.current = null
      mapInstance.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, isDarkMode])

  // Redibuja los marcadores al cambiar la selección o el idioma
  useEffect(() => {
    if (status !== "ready" || !mapInstance.current) return
    renderPlaceMarkers(mapInstance.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategories, language, status])

  const toggleCategory = (id: string) => {
    setActiveCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  const categoryChipColor = (category: PlaceCategory, active: boolean) => {
    if (!active) return "border-border hover:bg-muted text-foreground"
    // color de fondo según categoría
    if (category.id === "pharmacies") return "bg-red-500 text-white border-red-500"
    return "bg-primary text-primary-foreground border-primary"
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card">
      {/* Encabezado con selector de categorías */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-1">
          <MapPin className="w-4 h-4" />
          <span>{t("nearbyServices")}</span>
        </div>
        {/* Chip fijo del estadio */}
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-600 text-white">
          <span className="w-2.5 h-2.5 rounded-full bg-white" />
          {language === "es" ? "Estadio" : "Stadium"}
        </span>
        {PLACE_CATEGORIES.map((category) => {
          const active = activeCategories.includes(category.id)
          return (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${categoryChipColor(category, active)}`}
            >
              {CATEGORY_ICONS[category.id]}
              {t(category.labelKey as never)}
            </button>
          )
        })}
      </div>

      {/* Contenedor del mapa: responsive, ancho completo */}
      <div className="relative w-full aspect-[16/11] sm:aspect-[16/9]">
        <div ref={mapRef} className="absolute inset-0 h-full w-full" />

        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="w-6 h-6 rounded-full border-2 border-current border-t-transparent animate-spin" />
              <span className="text-sm">{language === "es" ? "Cargando mapa..." : "Loading map..."}</span>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60 p-6 text-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground max-w-sm">
              <AlertCircle className="w-6 h-6 text-destructive" />
              <span className="text-sm">
                {language === "es"
                  ? "No se pudo cargar el mapa. Verifica la clave de Google Maps."
                  : "The map could not be loaded. Check the Google Maps API key."}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
