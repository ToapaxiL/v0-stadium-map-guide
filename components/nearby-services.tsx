"use client"

import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { CleanMap, type CleanMapMarker } from "@/components/clean-map"
import { 
  Pill, 
  Bus, 
  Hospital, 
  Banknote,
  MapIcon,
  ExternalLink,
  MapPin,
  Navigation
} from "lucide-react"

interface NearbyPlace {
  name: string
  address: string
  mapsUrl: string
  tag: string | string[]
  coords: [number, number] // [lat, lng] exactas del lugar elegido
}

interface Service {
  id: string
  icon: React.ReactNode
  labelKey: string
  mapsEmbedUrl: string
  mapsUrl: string
  color: string // color del pin de esta categoría
  nearbyPlaces: NearbyPlace[]
}

// Coordenadas del Estadio Rodrigo Paz Delgado
const STADIUM_COORDS = "-0.1082127,-78.4964961"
const STADIUM_LATLNG: [number, number] = [-0.1082127, -78.4964961]
const STADIUM_ADDRESS = "Estadio+Rodrigo+Paz+Delgado,+Quito"

const services: Service[] = [
  {
    id: "pharmacies",
    icon: <Pill className="w-4 h-4" />,
    labelKey: "pharmacies",
    mapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m16!1m12!1m3!1d4333.524848525548!2d-78.49070723522495!3d-0.10614792207923071!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1sFarmacias!5e1!3m2!1ses!2sec!4v1779035517907!5m2!1ses!2sec",
    mapsUrl: "https://www.google.com/maps/search/Farmacias+cerca+de+estadio+rodrigo+paz+delgado/@-0.1082127,-78.4964961,15z",
    color: "#ef4444",
    nearbyPlaces: [
      {
        name: "Farmacias Económicas Quito La Delicia",
        address: "La Delicia, Quito",
        mapsUrl: "https://maps.app.goo.gl/1jah6tSGa6yk5ixA8",
        tag: "Farmacia",
        coords: [-0.1088014, -78.4929594]
      },
      {
        name: "Farmacias Medicity Quito CC Condado",
        address: "C.C. Condado, Quito",
        mapsUrl: "https://maps.app.goo.gl/wayk96A24EYXg3QE8",
        tag: "Farmacia",
        coords: [-0.1044386, -78.491379]
      },
      {
        name: "Fybeca El Condado",
        address: "C.C. El Condado, Quito",
        mapsUrl: "https://maps.app.goo.gl/TnuLcsrcuaL1o5C18",
        tag: "Farmacia",
        coords: [-0.102808, -78.4898655]
      }
    ]
  },
  {
    id: "transport",
    icon: <Bus className="w-4 h-4" />,
    labelKey: "transport",
    mapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m16!1m12!1m3!1d10352.41569787341!2d-78.48412918988936!3d-0.10407415882322812!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1sTerminal!5e1!3m2!1ses!2sec!4v1779036443824!5m2!1ses!2sec",
    mapsUrl: "https://maps.app.goo.gl/Y8eSJdqUhiNerhEY6",
    color: "#3b82f6",
    nearbyPlaces: [
      {
        name: "Terminal Ofelia",
        address: "Parada Trole / Ecovía - La Ofelia",
        mapsUrl: "https://maps.app.goo.gl/i8E3syeaLkxFbwC9A",
        tag: "Bus",
        coords: [-0.1102, -78.48827]
      },
      {
        name: "Estación Labrador",
        address: "Estación Labrador, Quito",
        mapsUrl: "https://maps.app.goo.gl/9LUNZthhxCmdatZc7",
        tag: ["Bus", "Metro"],
        coords: [-0.1555347, -78.4861323]
      },
    ]
  },
  {
    id: "hospitals",
    icon: <Hospital className="w-4 h-4" />,
    labelKey: "hospitals",
    mapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m16!1m12!1m3!1d5198.099140728318!2d-78.49115317074912!3d-0.1091547475819753!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1shospitales!5e1!3m2!1ses!2sec!4v1779036357214!5m2!1ses!2sec",
    mapsUrl: "https://maps.app.goo.gl/Mn94whLbsdbgyHL56",
    color: "#22c55e",
    nearbyPlaces: [
      {
        name: "Hospital Provincial General Pablo Arturo Suárez",
        address: "Quito, Ecuador",
        mapsUrl: "https://maps.app.goo.gl/Mn94whLbsdbgyHL56",
        tag: "Hospital",
        coords: [-0.1272568, -78.4976501]
      }
    ]
  },
  {
    id: "atm",
    icon: <Banknote className="w-4 h-4" />,
    labelKey: "atm",
    mapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m16!1m12!1m3!1d6608.850503096203!2d-78.49383557388533!3d-0.10664969192369922!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1sCajeros!5e1!3m2!1ses!2sec!4v1779036949549!5m2!1ses!2sec",
    mapsUrl: "https://maps.app.goo.gl/LeT6jm1GNZQgeVQg7",
    color: "#10b981",
    nearbyPlaces: [
      {
        name: "Cajero JEP",
        address: "Quito, Ecuador",
        mapsUrl: "https://maps.app.goo.gl/LeT6jm1GNZQgeVQg7",
        tag: "Cajero",
        coords: [-0.1074226, -78.4908912]
      },
      {
        name: "Cajero Banco Pichincha",
        address: "Quito, Ecuador",
        mapsUrl: "https://maps.app.goo.gl/PfWwpJ6tEjLYFhcVA",
        tag: "Cajero",
        coords: [-0.1065846, -78.4908626]
      },
      {
        name: "Cajero Banco Pacífico",
        address: "Quito, Ecuador",
        mapsUrl: "https://maps.app.goo.gl/wv39xEcrejb83JyW9",
        tag: "Cajero",
        coords: [-0.1031285, -78.4901234]
      },
      {
        name: "Cajero Produbanco",
        address: "Quito, Ecuador",
        mapsUrl: "https://maps.app.goo.gl/9QBsJV8x7B1kwq1q8",
        tag: "Cajero",
        coords: [-0.102864, -78.4897804]
      },
      {
        name: "Cajero Banco Guayaquil",
        address: "Quito, Ecuador",
        mapsUrl: "https://maps.app.goo.gl/Wo8Fa9vApKtDcc3u6",
        tag: "Cajero",
        coords: [-0.1026074, -78.4901018]
      }
    ]
  },
]

interface NearbyServicesProps {
  onServiceSelect?: (service: Service | null) => void
  selectedService?: string | null
}

export function NearbyServices({ onServiceSelect, selectedService }: NearbyServicesProps) {
  const { t } = useLanguage()

  const handleServiceClick = (service: Service) => {
    if (selectedService === service.id) {
      onServiceSelect?.(null)
    } else {
      onServiceSelect?.(service)
    }
  }

  const getServiceColor = (serviceId: string, isSelected: boolean) => {
    const colors: Record<string, { active: string; inactive: string }> = {
      pharmacies: { 
        active: "bg-red-500 text-white border-red-500", 
        inactive: "border-border hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950" 
      },
      transport: { 
        active: "bg-blue-500 text-white border-blue-500", 
        inactive: "border-border hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950" 
      },
      hospitals: { 
        active: "bg-green-500 text-white border-green-500", 
        inactive: "border-border hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-950" 
      },
      atm: { 
        active: "bg-emerald-500 text-white border-emerald-500", 
        inactive: "border-border hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950" 
      },
    }
    return isSelected ? colors[serviceId]?.active : colors[serviceId]?.inactive
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4" />
        <span>{t("nearbyServices")}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {services.map((service) => {
          const isSelected = selectedService === service.id
          return (
            <button
              key={service.id}
              onClick={() => handleServiceClick(service)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium
                transition-all duration-200
                ${getServiceColor(service.id, isSelected)}
              `}
            >
              {service.icon}
              <span>{t(service.labelKey as keyof typeof t)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface ServiceMapProps {
  service: Service | null
  onShowStadiumMap: () => void
  hidePlaces?: boolean
}

export function ServiceMap({ service, onShowStadiumMap, hidePlaces = false }: ServiceMapProps) {
  const { t } = useLanguage()

  if (!service) {
    return null
  }

  const getTagColor = (serviceId: string) => {
    const colors: Record<string, string> = {
      pharmacies: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
      transport: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      hospitals: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      atm: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    }
    return colors[serviceId] || "bg-muted text-muted-foreground"
  }

  const getIconColor = (serviceId: string) => {
    const colors: Record<string, string> = {
      pharmacies: "text-red-600 dark:text-red-400",
      transport: "text-blue-600 dark:text-blue-400",
      hospitals: "text-green-600 dark:text-green-400",
      atm: "text-emerald-600 dark:text-emerald-400",
    }
    return colors[serviceId] || "text-primary"
  }

  // Solo los puntos elegidos + el estadio como referencia
  const mapMarkers: CleanMapMarker[] = [
    {
      name: "Estadio Rodrigo Paz Delgado",
      coords: STADIUM_LATLNG,
      color: "#1d3557",
      isStadium: true,
    },
    ...service.nearbyPlaces.map((p) => ({
      name: p.name,
      coords: p.coords,
      color: service.color,
    })),
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden border border-border bg-card">
        <div className="relative aspect-[16/10] w-full">
          <CleanMap markers={mapMarkers} className="absolute inset-0 h-full w-full" />
          <div className="absolute top-3 right-3 z-[1000] flex gap-2">
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
              onClick={() => window.open(service.mapsUrl, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Google Maps
            </Button>
          </div>
          <div className="absolute bottom-3 left-3 z-[1000]">
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
              onClick={onShowStadiumMap}
            >
              <MapIcon className="w-4 h-4 mr-1" />
              {t("showStadiumMap")}
            </Button>
          </div>
        </div>
      </div>

      {/* Nearby Places List - solo en mobile (en web van en la columna derecha) */}
      {!hidePlaces && (
        <NearbyPlacesList service={service} getTagColor={getTagColor} getIconColor={getIconColor} />
      )}
    </div>
  )
}

interface NearbyPlacesListProps {
  service: Service
  getTagColor: (id: string) => string
  getIconColor: (id: string) => string
}

export function NearbyPlacesList({ service, getTagColor, getIconColor }: NearbyPlacesListProps) {
  const { t } = useLanguage()

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/50">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          {t("nearbyPlaces")}
        </h3>
      </div>
      <div className="divide-y divide-border">
        {service.nearbyPlaces.map((place, index) => (
          <div key={index} className="px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${getIconColor(service.id)}`}>
                {service.icon}
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-sm">{place.name}</h4>
                <p className="text-xs text-muted-foreground">{place.address}</p>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="text-muted-foreground">Google Maps</span>
                  <span className="text-muted-foreground">•</span>
                  {Array.isArray(place.tag) ? (
                    place.tag.map((t, i) => (
                      <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(service.id)}`}>
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(service.id)}`}>
                      {place.tag}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-blue-500 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-blue-600 dark:hover:text-white"
              onClick={() => window.open(place.mapsUrl, "_blank")}
            >
              <Navigation className="w-4 h-4 mr-1" />
              {t("howToGetThere")}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export { services, type Service, type NearbyPlacesListProps }
