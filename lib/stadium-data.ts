export type SectionType = "tribuna" | "palco" | "general"

export interface StadiumSection {
  id: string
  name: string
  type: SectionType
  access: string
  subsections: string
  description: string
  capacity: string
  price: string
  amenities: string[]
  color: string
  zone: "norte" | "sur" | "occidental" | "oriental"
  connectedAccesses: string[]
}

export interface Landmark {
  id: string
  name: string
  type: "entrada" | "baño" | "comida" | "tienda" | "emergencia" | "marcador" | "plazoleta"
  access: string
  zone: "norte" | "sur" | "occidental" | "oriental"
}

export const landmarks: Landmark[] = [
  { id: "puerta-2", name: "Puerta 2", type: "entrada", access: "Puerta 2", zone: "occidental" },
  { id: "puerta-3", name: "Puerta 3", type: "entrada", access: "Puerta 3", zone: "occidental" },
  { id: "puerta-4", name: "Puerta 4", type: "entrada", access: "Puerta 4", zone: "sur" },
  { id: "puerta-5", name: "Puerta 5", type: "entrada", access: "Puerta 5", zone: "oriental" },
  { id: "puerta-6", name: "Puerta 6", type: "entrada", access: "Puerta 6", zone: "oriental" },
  { id: "puerta-7", name: "Puerta 7", type: "entrada", access: "Puerta 7", zone: "oriental" },
  { id: "puerta-8", name: "Puerta 8", type: "entrada", access: "Puerta 8", zone: "oriental" },
  { id: "puerta-9", name: "Puerta 9", type: "entrada", access: "Puerta 9", zone: "norte" },
  { id: "puerta-10", name: "Puerta 10", type: "entrada", access: "Puerta 10", zone: "occidental" },
  { id: "puerta-11", name: "Puerta 11", type: "entrada", access: "Puerta 11", zone: "occidental" },
  { id: "plazoleta", name: "Plazoleta", type: "plazoleta", access: "Puerta 2", zone: "occidental" },
  { id: "baño-puerta-2", name: "Baños Puerta 2", type: "baño", access: "Puerta 2", zone: "occidental" },
  { id: "baño-puerta-3", name: "Baños Puerta 3", type: "baño", access: "Puerta 3", zone: "occidental" },
  { id: "baño-puerta-4", name: "Baños Puerta 4", type: "baño", access: "Puerta 4", zone: "sur" },
  { id: "baño-puerta-6", name: "Baños Puerta 6", type: "baño", access: "Puerta 6", zone: "oriental" },
  { id: "baño-puerta-7", name: "Baños Puerta 7", type: "baño", access: "Puerta 7", zone: "oriental" },
  { id: "baño-puerta-9", name: "Baños Puerta 9", type: "baño", access: "Puerta 9", zone: "norte" },
  { id: "baño-puerta-11", name: "Baños Puerta 11", type: "baño", access: "Puerta 11", zone: "occidental" },
]

export const stadiumSections: StadiumSection[] = [
  // ORIENTAL (Arriba en el mapa - Verde)
  {
    id: "palco-norte-oriental",
    name: "Palco Norte Oriental",
    type: "palco",
    access: "Puerta 7",
    subsections: "",
    description: "Palco con servicios exclusivos y vista privilegiada del campo.",
    capacity: "500 asientos",
    price: "$$$$",
    amenities: ["Baño"],
    color: "bg-emerald-600",
    zone: "oriental",
    connectedAccesses: ["Puerta 7"],
  },
  {
    id: "palco-sur-oriental",
    name: "Palco Sur Oriental",
    type: "palco",
    access: "Puerta 6",
    subsections: "",
    description: "Área VIP con servicios exclusivos y vista panorámica.",
    capacity: "500 asientos",
    price: "$$$$",
    amenities: ["Baño"],
    color: "bg-emerald-600",
    zone: "oriental",
    connectedAccesses: ["Puerta 6"],
  },
  {
    id: "tribuna-norte-oriental",
    name: "Tribuna Norte Oriental",
    type: "tribuna",
    access: "Puerta 8",
    subsections: "A-B-C-D-E-F-G-H-I",
    description: "Tribuna con excelente vista y fácil acceso.",
    capacity: "3,500 asientos",
    price: "$$$",
    amenities: [],
    color: "bg-emerald-500",
    zone: "oriental",
    connectedAccesses: ["Puerta 8"],
  },
  {
    id: "tribuna-sur-oriental",
    name: "Tribuna Sur Oriental",
    type: "tribuna",
    access: "Puerta 5",
    subsections: "I-H-G-F-E-D-C-B-A",
    description: "Tribuna con vista completa del campo y ambiente familiar.",
    capacity: "3,500 asientos",
    price: "$$$",
    amenities: [],
    color: "bg-emerald-500",
    zone: "oriental",
    connectedAccesses: ["Puerta 5"],
  },
  // OCCIDENTAL (Abajo en el mapa - Rojo/Rosa)
  {
    id: "palco-norte-occidental",
    name: "Palco Norte Occidental",
    type: "palco",
    access: "Puerta 11",
    subsections: "",
    description: "Experiencia premium con todos los servicios incluidos.",
    capacity: "500 asientos",
    price: "$$$$",
    amenities: ["Baño"],
    color: "bg-rose-600",
    zone: "occidental",
    connectedAccesses: ["Puerta 11"],
  },
  {
    id: "palco-sur-occidental",
    name: "Palco Sur Occidental",
    type: "palco",
    access: "Puerta 2",
    subsections: "",
    description: "Área VIP con servicios exclusivos y vista panorámica.",
    capacity: "500 asientos",
    price: "$$$$",
    amenities: ["Baño"],
    color: "bg-rose-600",
    zone: "occidental",
    connectedAccesses: ["Puerta 2"],
  },
  {
    id: "tribuna-norte-occidental",
    name: "Tribuna Norte Occidental",
    type: "tribuna",
    access: "Puerta 10",
    subsections: "I-H-G-F-E-D-C-B-A",
    description: "Vista estratégica del medio campo con sombra en horarios vespertinos.",
    capacity: "3,500 asientos",
    price: "$$$",
    amenities: [],
    color: "bg-rose-500",
    zone: "occidental",
    connectedAccesses: ["Puerta 10"],
  },
  {
    id: "tribuna-sur-occidental",
    name: "Tribuna Sur Occidental",
    type: "tribuna",
    access: "Puerta 3",
    subsections: "A-B-C-D-E-F-G-H-I",
    description: "Vista privilegiada del campo con excelente ángulo de visión.",
    capacity: "3,500 asientos",
    price: "$$$",
    amenities: ["Baño"],
    color: "bg-rose-500",
    zone: "occidental",
    connectedAccesses: ["Puerta 3"],
  },
  // NORTE (Izquierda en el mapa - Azul)
  {
    id: "general-norte-oriental",
    name: "General Norte Oriental",
    type: "general",
    access: "Puerta 9",
    subsections: "Alta y Baja / E-D-C-B-A",
    description: "Sector general con ambiente deportivo auténtico.",
    capacity: "4,500 espectadores",
    price: "$",
    amenities: ["Baño"],
    color: "bg-sky-500",
    zone: "norte",
    connectedAccesses: ["Puerta 9"],
  },
  {
    id: "general-norte-occidental",
    name: "General Norte Occidental",
    type: "general",
    access: "Puerta 9",
    subsections: "Alta y Baja / A-B-C-D-E",
    description: "Zona general con buen ambiente y precios accesibles.",
    capacity: "4,500 espectadores",
    price: "$",
    amenities: ["Baño"],
    color: "bg-sky-500",
    zone: "norte",
    connectedAccesses: ["Puerta 9"],
  },
  // SUR (Derecha en el mapa - Amarillo/Naranja)
  {
    id: "general-sur-alta",
    name: "General Sur Alta",
    type: "general",
    access: "Puerta 4",
    subsections: "A-B-C-D-E",
    description: "Zona alta con vista panorámica del estadio.",
    capacity: "3,000 espectadores",
    price: "$",
    amenities: ["Baño"],
    color: "bg-amber-500",
    zone: "sur",
    connectedAccesses: ["Puerta 4"],
  },
  {
    id: "general-sur-baja",
    name: "General Sur Baja",
    type: "general",
    access: "Puerta 4",
    subsections: "A-B-C-D-E",
    description: "Zona de aficionados cerca de la cancha. Ambiente de máxima pasión.",
    capacity: "5,000 espectadores",
    price: "$",
    amenities: ["Baño"],
    color: "bg-amber-500",
    zone: "sur",
    connectedAccesses: ["Puerta 4"],
  },
]

export const sectionTypeLabels: Record<SectionType, string> = {
  tribuna: "Tribuna",
  palco: "Palco",
  general: "General",
}

export const sectionTypeColors: Record<SectionType, string> = {
  tribuna: "bg-emerald-500",
  palco: "bg-emerald-600",
  general: "bg-sky-500",
}

// ─── Internacionalización de los datos del estadio ───
type Lang = "es" | "en"

// Descripciones en inglés por id de sección (las españolas viven en el array de arriba)
const sectionDescriptionsEn: Record<string, string> = {
  "palco-norte-oriental": "Box with exclusive services and a privileged view of the field.",
  "palco-sur-oriental": "VIP area with exclusive services and a panoramic view.",
  "tribuna-norte-oriental": "Stand with an excellent view and easy access.",
  "tribuna-sur-oriental": "Stand with a full view of the field and a family-friendly atmosphere.",
  "palco-norte-occidental": "Premium experience with all services included.",
  "palco-sur-occidental": "VIP area with exclusive services and a panoramic view.",
  "tribuna-norte-occidental": "Strategic midfield view with shade in the afternoon.",
  "tribuna-sur-occidental": "Privileged view of the field with an excellent viewing angle.",
  "general-norte-oriental": "General section with an authentic sporting atmosphere.",
  "general-norte-occidental": "General area with a great atmosphere and affordable prices.",
  "general-sur-alta": "Upper area with a panoramic view of the stadium.",
  "general-sur-baja": "Fan zone close to the pitch. Atmosphere of maximum passion.",
}

const sectionTypeLabelsEn: Record<SectionType, string> = {
  tribuna: "Stand",
  palco: "Box",
  general: "General",
}

export function getSectionDescription(section: StadiumSection, language: Lang): string {
  return language === "en" ? sectionDescriptionsEn[section.id] ?? section.description : section.description
}

export function getSectionTypeLabel(type: SectionType, language: Lang): string {
  return language === "en" ? sectionTypeLabelsEn[type] : sectionTypeLabels[type]
}

export function translateCapacity(capacity: string, language: Lang): string {
  if (language !== "en") return capacity
  return capacity.replace("asientos", "seats").replace("espectadores", "spectators")
}

export function translateSubsections(subsections: string, language: Lang): string {
  if (language !== "en") return subsections
  return subsections.replace("Alta y Baja", "Upper and Lower")
}

export function translateAccess(access: string, language: Lang): string {
  if (language !== "en") return access
  return access.replace("Puerta", "Gate")
}

const amenityLabelsEn: Record<string, string> = {
  "Baño": "Restroom",
}

export function translateAmenity(amenity: string, language: Lang): string {
  if (language !== "en") return amenity
  return amenityLabelsEn[amenity] ?? amenity
}
