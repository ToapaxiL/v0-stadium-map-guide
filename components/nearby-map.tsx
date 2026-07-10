"use client"

import { useEffect, useRef, useState } from "react"
import { setOptions, importLibrary } from "@googlemaps/js-api-loader"
import { useLanguage } from "@/lib/language-context"
import { STADIUM, PLACE_CATEGORIES, type PlaceCategory, type NearbyPlace } from "@/lib/nearby-places"
import { Button } from "@/components/ui/button"
import { Pill, Bus, Hospital, Banknote, MapPin, AlertCircle, Navigation } from "lucide-react"

// Color del estadio: azul andino de marca. Distinto de todas las categorías
// para diferenciar el punto principal del resto de servicios.
const STADIUM_COLOR = "#1e345b"

// Iconos por categoría (chips + lista)
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  pharmacies: <Pill className="w-4 h-4" />,
  transport: <Bus className="w-4 h-4" />,
  hospitals: <Hospital className="w-4 h-4" />,
  atm: <Banknote className="w-4 h-4" />,
}

// --- Utilidades de color de marca ---
// Los colores viven en lib/nearby-places.ts (paleta oficial). Aquí derivamos
// variantes legibles para chips activos, badges e iconos en claro y oscuro.
function hexToRgb(hex: string) {
  const h = hex.replace("#", "")
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
  const n = parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgba(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

// Luminancia relativa aproximada (0 = oscuro, 1 = claro)
function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

// Mezcla un color con blanco o negro para asegurar contraste sobre la tarjeta
function mix(hex: string, target: "#ffffff" | "#000000", ratio: number) {
  const c = hexToRgb(hex)
  const t = hexToRgb(target)
  const m = (a: number, b: number) => Math.round(a * (1 - ratio) + b * ratio)
  return `rgb(${m(c.r, t.r)}, ${m(c.g, t.g)}, ${m(c.b, t.b)})`
}

// Color de texto/icono legible sobre la tarjeta de la lista, según el tema
function textOnCard(hex: string, isDark: boolean) {
  if (isDark) {
    // en oscuro: aclarar los colores apagados para que resalten
    return luminance(hex) < 0.5 ? mix(hex, "#ffffff", 0.35) : hex
  }
  // en claro: oscurecer los colores muy claros (amarillo, azul claro)
  return luminance(hex) > 0.6 ? mix(hex, "#000000", 0.45) : hex
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

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  // Selección única de categoría (por defecto, farmacias) — como en el diseño
  const [activeCategory, setActiveCategory] = useState<string>(PLACE_CATEGORIES[0]?.id ?? "pharmacies")
  const activeCategoryRef = useRef(activeCategory)
  activeCategoryRef.current = activeCategory

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const selectedCategory: PlaceCategory | undefined = PLACE_CATEGORIES.find((c) => c.id === activeCategory)

  // Dibuja / actualiza los marcadores de la categoría activa y ajusta el encuadre
  function renderPlaceMarkers(map: google.maps.Map) {
    placeMarkers.current.forEach((m) => m.setMap(null))
    placeMarkers.current = []

    const category = PLACE_CATEGORIES.find((c) => c.id === activeCategoryRef.current)
    const bounds = new google.maps.LatLngBounds()
    bounds.extend({ lat: STADIUM.lat, lng: STADIUM.lng })

    category?.places.forEach((place) => {
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
      bounds.extend({ lat: place.lat, lng: place.lng })
    })

    // Encuadra el estadio + los lugares de la categoría, sin acercarse en exceso
    if (!bounds.isEmpty()) {
      google.maps.event.addListenerOnce(map, "bounds_changed", () => {
        const z = map.getZoom()
        if (typeof z === "number" && z > 16) map.setZoom(16)
      })
      map.fitBounds(bounds, 64)
    }
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
          center: { lat: STADIUM.lat, lng: STADIUM.lng },
          zoom: 15,
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
          icon: pinIcon(STADIUM_COLOR, 1.3),
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

  // Redibuja los marcadores al cambiar la categoría o el idioma
  useEffect(() => {
    if (status !== "ready" || !mapInstance.current) return
    renderPlaceMarkers(mapInstance.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, language, status])

  const chipClass = (category: PlaceCategory) => {
    const active = activeCategory === category.id
    return active ? "" : "border-border hover:bg-muted text-foreground"
  }

  // Estilo del chip activo con el color de marca de la categoría.
  // El texto y el icono siempre van en blanco (como en Hospitales), sin
  // importar el color de la categoría, para un estado activo uniforme.
  const chipStyle = (category: PlaceCategory): React.CSSProperties | undefined => {
    if (activeCategory !== category.id) return undefined
    return {
      backgroundColor: category.color,
      borderColor: category.color,
      color: "#ffffff",
    }
  }

  // Abre la ruta hacia el lugar según el dispositivo:
  // - Apple (iPhone, iPad, Mac): Apple Maps (maps.apple.com), que abre la app
  //   Mapas si está instalada o la web en su defecto.
  // - Resto (Android, Windows, etc.): Google Maps, que abre la app si existe o
  //   la web en su defecto.
  // No se pasa "origin", por lo que cada app usa la ubicación actual del
  // dispositivo como punto de partida automáticamente.
  const handleDirections = (place: NearbyPlace) => {
    const destination = `${place.lat},${place.lng}`

    const ua = typeof navigator !== "undefined" ? navigator.userAgent : ""
    const platform = typeof navigator !== "undefined" ? navigator.platform || "" : ""
    // iPadOS moderno se reporta como Mac con soporte táctil.
    const isIpadOS = platform === "MacIntel" && typeof document !== "undefined" && (navigator as Navigator).maxTouchPoints > 1
    const isApple = /iPhone|iPad|iPod|Macintosh/i.test(ua) || isIpadOS

    const url = isApple
      ? `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`

    window.open(url, "_blank", "noopener,noreferrer")
  }

  const renderTag = (place: NearbyPlace, categoryColor: string) => {
    const tags = Array.isArray(place.tag) ? place.tag : [place.tag]
    return tags.map((tag, i) => (
      <span
        key={i}
        className="px-2 py-0.5 rounded-full text-xs font-medium"
        style={{
          backgroundColor: rgba(categoryColor, isDarkMode ? 0.22 : 0.16),
          color: textOnCard(categoryColor, isDarkMode),
        }}
      >
        {tag}
      </span>
    ))
  }

  return (
    <div className="space-y-4">
      {/* 1) Chips de categorías — "Servicios cerca del estadio" */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{t("nearbyServices")}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PLACE_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              aria-pressed={activeCategory === category.id}
              style={chipStyle(category)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition-all duration-200 ${chipClass(category)}`}
            >
              {CATEGORY_ICONS[category.id]}
              <span>{t(category.labelKey as never)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2) Mapa + lista — en escritorio la lista va a la DERECHA del mapa; en
             móvil/tablet se apilan (mapa arriba, lista debajo). */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 lg:items-stretch">
        {/* Mapa de Google */}
        <div className="rounded-xl overflow-hidden border border-border bg-card">
          <div className="relative w-full aspect-[16/11] sm:aspect-[16/9] lg:aspect-auto lg:h-full lg:min-h-[420px]">
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

        {/* Lista "Lugares cercanos" de la categoría activa */}
        {selectedCategory && selectedCategory.places.length > 0 && (
          <div className="relative rounded-xl border border-border bg-card overflow-hidden lg:min-h-[420px]">
            {/* En lg, la lista llena la altura del mapa y hace scroll interno. */}
            <div className="flex flex-col lg:absolute lg:inset-0">
              <div className="px-4 py-3 border-b border-border bg-muted/50 shrink-0">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {t("nearbyPlaces")}
                </h3>
              </div>
              <div className="divide-y divide-border lg:overflow-y-auto lg:flex-1">
                {selectedCategory.places.map((place) => (
                  <div
                    key={place.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5" style={{ color: textOnCard(selectedCategory.color, isDarkMode) }}>
                        {CATEGORY_ICONS[selectedCategory.id]}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm">{place.nombre}</h4>
                        <p className="text-xs text-muted-foreground">{place.address}</p>
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          {renderTag(place, selectedCategory.color)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 transition-colors"
                      style={{
                        borderColor: STADIUM_COLOR,
                        color: isDarkMode ? mix(STADIUM_COLOR, "#ffffff", 0.55) : STADIUM_COLOR,
                      }}
                      onClick={() => handleDirections(place)}
                    >
                      <Navigation className="w-4 h-4 mr-1" />
                      {t("howToGetThere")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
