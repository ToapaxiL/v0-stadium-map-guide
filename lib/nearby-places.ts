// Datos de lugares cercanos al Estadio Rodrigo Paz Delgado (Quito).
// El estadio es el punto principal del mapa y siempre permanece visible.

export const STADIUM = {
  nombre: "Estadio Rodrigo Paz Delgado",
  lat: -0.1076661,
  lng: -78.4916898,
} as const

export interface NearbyPlace {
  id: number
  nombre: string
  lat: number
  lng: number
  maps: string
}

export interface NearbyCategory {
  /** Identificador estable de la categoría */
  id: string
  /** Etiqueta en español */
  label: string
  /** Etiqueta en inglés */
  labelEn: string
  /** Color del marcador (hex) */
  color: string
  /** Lugares que pertenecen a la categoría */
  places: NearbyPlace[]
}

const pharmacies: NearbyPlace[] = [
  { id: 1, nombre: "Pharma Center", lat: -0.1067950527514329, lng: -78.49227199031257, maps: "https://maps.app.goo.gl/1sJT86vXUJGGkDRA8" },
  { id: 2, nombre: "Farmacias Económicas Quito La Delicia", lat: -0.1087944, lng: -78.4930755, maps: "https://maps.app.goo.gl/ntMQC9cuMs8pHR2H9" },
  { id: 3, nombre: "Fybeca Da Vinci", lat: -0.1046491, lng: -78.4914398, maps: "https://maps.app.goo.gl/QNLbVksk7UvemCwf7" },
  { id: 4, nombre: "Farmacia Económica Quito Diego de Vázquez", lat: -0.1110492, lng: -78.4895358, maps: "https://maps.app.goo.gl/QjZdScFyznWGvDW77" },
  { id: 5, nombre: "Farmacias Medicity Quito C.C. Condado", lat: -0.1043941, lng: -78.4915386, maps: "https://maps.app.goo.gl/v7cPKW67wHdQPc3L9" },
]

// Categorías seleccionadas. Diseñado para crecer: agrega nuevas categorías con
// su color y su arreglo de lugares (con lat/lng) y aparecerán automáticamente.
export const nearbyCategories: NearbyCategory[] = [
  {
    id: "pharmacies",
    label: "Farmacias",
    labelEn: "Pharmacies",
    color: "#dc2626",
    places: pharmacies,
  },
]

/** Color del marcador del estadio (prioridad visual). */
export const STADIUM_COLOR = "#2563eb"
