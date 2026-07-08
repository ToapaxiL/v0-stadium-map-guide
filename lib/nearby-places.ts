// Punto principal del mapa: Estadio Rodrigo Paz Delgado (Quito)
export const STADIUM = {
  nombre: "Estadio Rodrigo Paz Delgado",
  lat: -0.1076715,
  lng: -78.4891149,
} as const

export interface NearbyPlace {
  id: number
  nombre: string
  address: string
  lat: number
  lng: number
  maps: string
  tag: string | string[]
}

export interface PlaceCategory {
  id: string
  labelKey: string // clave de traducción existente
  color: string // color del marcador (hex)
  places: NearbyPlace[]
}

// Categorías de lugares cercanos. Cada categoría tiene su color de marcador.
// Nuevas categorías pueden añadirse aquí siguiendo la misma estructura.
// Coordenadas obtenidas de los enlaces de Google Maps de cada lugar.
export const PLACE_CATEGORIES: PlaceCategory[] = [
  {
    id: "pharmacies",
    labelKey: "pharmacies",
    color: "#ef4444", // rojo
    places: [
      {
        id: 1,
        nombre: "Farmacias Económicas Quito La Delicia",
        address: "La Delicia, Quito",
        lat: -0.1088014,
        lng: -78.4929594,
        maps: "https://maps.app.goo.gl/1jah6tSGa6yk5ixA8",
        tag: "Farmacia",
      },
      {
        id: 2,
        nombre: "Farmacias Medicity Quito CC Condado",
        address: "C.C. Condado, Quito",
        lat: -0.1044386,
        lng: -78.491379,
        maps: "https://maps.app.goo.gl/wayk96A24EYXg3QE8",
        tag: "Farmacia",
      },
      {
        id: 3,
        nombre: "Fybeca El Condado",
        address: "C.C. El Condado, Quito",
        lat: -0.102808,
        lng: -78.4898655,
        maps: "https://maps.app.goo.gl/TnuLcsrcuaL1o5C18",
        tag: "Farmacia",
      },
    ],
  },
  {
    id: "transport",
    labelKey: "transport",
    color: "#3b82f6", // azul
    places: [
      {
        id: 1,
        nombre: "Terminal Ofelia",
        address: "Parada Trole / Ecovía - La Ofelia",
        lat: -0.1102,
        lng: -78.48827,
        maps: "https://maps.app.goo.gl/i8E3syeaLkxFbwC9A",
        tag: "Bus",
      },
      {
        id: 2,
        nombre: "Estación Labrador",
        address: "Estación Labrador, Quito",
        lat: -0.1555347,
        lng: -78.4861323,
        maps: "https://maps.app.goo.gl/9LUNZthhxCmdatZc7",
        tag: ["Bus", "Metro"],
      },
    ],
  },
  {
    id: "hospitals",
    labelKey: "hospitals",
    color: "#22c55e", // verde
    places: [
      {
        id: 1,
        nombre: "Hospital Provincial General Pablo Arturo Suárez",
        address: "Quito, Ecuador",
        lat: -0.1272568,
        lng: -78.4976501,
        maps: "https://maps.app.goo.gl/Mn94whLbsdbgyHL56",
        tag: "Hospital",
      },
    ],
  },
  {
    id: "atm",
    labelKey: "atm",
    color: "#10b981", // esmeralda
    places: [
      {
        id: 1,
        nombre: "Cajero JEP",
        address: "Quito, Ecuador",
        lat: -0.1074226,
        lng: -78.4908912,
        maps: "https://maps.app.goo.gl/LeT6jm1GNZQgeVQg7",
        tag: "Cajero",
      },
      {
        id: 2,
        nombre: "Cajero Banco Pichincha",
        address: "Quito, Ecuador",
        lat: -0.1065846,
        lng: -78.4908626,
        maps: "https://maps.app.goo.gl/PfWwpJ6tEjLYFhcVA",
        tag: "Cajero",
      },
      {
        id: 3,
        nombre: "Cajero Banco Pacífico",
        address: "Quito, Ecuador",
        lat: -0.1031285,
        lng: -78.4901234,
        maps: "https://maps.app.goo.gl/wv39xEcrejb83JyW9",
        tag: "Cajero",
      },
      {
        id: 4,
        nombre: "Cajero Produbanco",
        address: "Quito, Ecuador",
        lat: -0.102864,
        lng: -78.4897804,
        maps: "https://maps.app.goo.gl/9QBsJV8x7B1kwq1q8",
        tag: "Cajero",
      },
      {
        id: 5,
        nombre: "Cajero Banco Guayaquil",
        address: "Quito, Ecuador",
        lat: -0.1026074,
        lng: -78.4901018,
        maps: "https://maps.app.goo.gl/Wo8Fa9vApKtDcc3u6",
        tag: "Cajero",
      },
    ],
  },
]
