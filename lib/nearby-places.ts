// Punto principal del mapa: Estadio Rodrigo Paz Delgado (Quito)
export const STADIUM = {
  nombre: "Estadio Rodrigo Paz Delgado",
  lat: -0.1076715,
  lng: -78.4891149,
} as const

export interface NearbyPlace {
  id: number
  nombre: string
  lat: number
  lng: number
  maps: string
}

export interface PlaceCategory {
  id: string
  labelKey: string // clave de traducción existente
  color: string // color del marcador (hex)
  places: NearbyPlace[]
}

// Categorías de lugares cercanos. Cada categoría tiene su color de marcador.
// Nuevas categorías pueden añadirse aquí siguiendo la misma estructura.
export const PLACE_CATEGORIES: PlaceCategory[] = [
  {
    id: "pharmacies",
    labelKey: "pharmacies",
    color: "#ef4444", // rojo
    places: [
      { id: 1, nombre: "Pharma Center", lat: -0.1067950527514329, lng: -78.49227199031257, maps: "https://maps.app.goo.gl/1sJT86vXUJGGkDRA8" },
      { id: 2, nombre: "Farmacias Económicas Quito La Delicia", lat: -0.1087944, lng: -78.4930755, maps: "https://maps.app.goo.gl/ntMQC9cuMs8pHR2H9" },
      { id: 3, nombre: "Fybeca Da Vinci", lat: -0.1046491, lng: -78.4914398, maps: "https://maps.app.goo.gl/QNLbVksk7UvemCwf7" },
      { id: 4, nombre: "Farmacia Económica Quito Diego de Vázquez", lat: -0.1110492, lng: -78.4895358, maps: "https://maps.app.goo.gl/QjZdScFyznWGvDW77" },
      { id: 5, nombre: "Farmacias Medicity Quito C.C. Condado", lat: -0.1043941, lng: -78.4915386, maps: "https://maps.app.goo.gl/v7cPKW67wHdQPc3L9" },
    ],
  },
]
