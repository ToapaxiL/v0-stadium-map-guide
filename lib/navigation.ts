// ============================================================
// MOTOR DE RUTAS - Estadio Rodrigo Paz Delgado
// ============================================================
//
// TRAMO_1:  P2 <-> P3
// CORTE_1:  P3 ✖ P4  → Calle Cacica Quilago
// CORTE_2:  P4 ✖ P5/P6 → Cacica Quilago + Diego Vásquez de Cepeda
// TRAMO_2:  P5 <-> P6 <-> P7 <-> P8 <-> P9
// CORTE_3:  P9 ✖ P10 → Hermensz Van Risn Rembrandt (bidireccional)
// TRAMO_3:  P10 <-> P11 <-> P2  (acceso interno, sin salida a la calle)
//
// REGLAS:
//  - General Sur Baja solo accede por P4
//  - P10/P11 → P2: conexión interna por pasillo occidental
//  - P9 → P10: siempre por exterior (Hermensz Van Risn Rembrandt)
// ============================================================

export interface RouteStep {
  type: "start" | "internal" | "external" | "arrive"
  instruction: string
  detail?: string
  icon: "pin" | "walk" | "exit" | "enter" | "flag"
}

export interface RouteResult {
  from: string
  to: string
  steps: RouteStep[]
  totalSteps: number
  usesExterior: boolean
  /** Secuencia ordenada de puertas que recorre la ruta (fuente de verdad para el SVG) */
  gateTrace: number[]
  /**
   * Polilínea EXACTA en coordenadas del SVG (viewBox 850.394×566.929) para
   * rutas especiales que NO siguen el anillo perimetral (p. ej. recorridos
   * exteriores por la calle). Si está presente, el mapa la dibuja tal cual.
   */
  specialPath?: { x: number; y: number }[]
  /** Distancia EXACTA en metros para rutas especiales (sobrescribe el cálculo por anillo). */
  specialMeters?: number
}

const SECTION_GATES: Record<string, number> = {
  "palco-sur-occidental":     2,
  "tribuna-sur-occidental":   3,
  "general-sur-alta":         4,
  "general-sur-baja":         4,
  "tribuna-sur-oriental":     5,
  "palco-sur-oriental":       6,
  "palco-norte-oriental":     7,
  "tribuna-norte-oriental":   8,
  "general-norte-oriental":   9,
  "general-norte-occidental": 9,
  "tribuna-norte-occidental": 10,
  "palco-norte-occidental":   11,
  "plazoleta":                1,   // Puerta 1 - Plazoleta, intermediario P2 ↔ P11
}

// Tramos internos conectados
// ANULADO el paso interno P11 ✖ Plazoleta(P1): la Plazoleta ya NO conecta con
// el Palco Norte Occidental (P11) por dentro. Ahora la Plazoleta pertenece al
// bloque Sur Occidental (P3 ↔ P2 ↔ Plazoleta) y el Norte Occidental (P11 ↔ P10)
// queda como una isla que se enlaza con el resto SOLO por el exterior:
//   · P10 ↔ P9  por H. Vans Risn (Puerta 9W / Puerta 10-11)
//   · P10 ↔ Plazoleta(P1) por La Esperanza (RUTA 3)
const TRAMO_1 = [3, 2, 1]           // Sur Occidental: P3 ↔ P2 ↔ Plazoleta(P1)
const TRAMO_2 = [5, 6, 7, 8, 9]     // Oriental completo
const TRAMO_3 = [11, 10]            // Norte Occidental: P11 ↔ P10 (isla)

function inTramo1(g: number) { return TRAMO_1.includes(g) }
function inTramo2(g: number) { return TRAMO_2.includes(g) }
function inTramo3(g: number) { return TRAMO_3.includes(g) }

const SECTION_NAMES: Record<string, { es: string; en: string }> = {
  "palco-sur-occidental":     { es: "Palco Sur Occidental",     en: "South West Box" },
  "tribuna-sur-occidental":   { es: "Tribuna Sur Occidental",   en: "South West Stand" },
  "general-sur-alta":         { es: "General Sur Alta",         en: "South High General" },
  "general-sur-baja":         { es: "General Sur Baja",         en: "South Low General" },
  "tribuna-sur-oriental":     { es: "Tribuna Sur Oriental",     en: "South East Stand" },
  "palco-sur-oriental":       { es: "Palco Sur Oriental",       en: "South East Box" },
  "palco-norte-oriental":     { es: "Palco Norte Oriental",     en: "North East Box" },
  "tribuna-norte-oriental":   { es: "Tribuna Norte Oriental",   en: "North East Stand" },
  "general-norte-oriental":   { es: "General Norte Oriental",   en: "North East General" },
  "general-norte-occidental": { es: "General Norte Occidental", en: "North West General" },
  "tribuna-norte-occidental": { es: "Tribuna Norte Occidental", en: "North West Stand" },
  "palco-norte-occidental":   { es: "Palco Norte Occidental",   en: "North West Box" },
  "plazoleta":                { es: "Plazoleta",                en: "Plaza" },
}

export function getSectionName(id: string, lang: "es" | "en" = "es"): string {
  return SECTION_NAMES[id]?.[lang] ?? id
}

export const ALL_SECTIONS = Object.keys(SECTION_GATES)

// ============================================================
// Textos por idioma
// ============================================================
const T = {
  es: {
    walkCorridor:   "Camina por el pasillo interior",
    passesByGate:   (gates: string) => `Pasas por Puerta ${gates}`,
    fromTo:         (a: number, b: number) => `De Puerta ${a} a Puerta ${b}`,
    exitGate:       (g: number | string) => `Sal por Puerta ${g} al exterior`,
    walkStreet:     (s: string) => `Camina por ${s}`,
    continueStreet: (s: string) => `Continúa por ${s}`,
    enterGate:      (g: number | string) => `Entra por Puerta ${g}`,
    walkToCorridor: "Camina por el pasillo interior hasta tu sección",
    viaPlazoleta:   "Pasa por la Plazoleta",
  },
  en: {
    walkCorridor:   "Walk through the indoor corridor",
    passesByGate:   (gates: string) => `Passes through Gate ${gates}`,
    fromTo:         (a: number, b: number) => `From Gate ${a} to Gate ${b}`,
    exitGate:       (g: number | string) => `Exit through Gate ${g} to the exterior`,
    walkStreet:     (s: string) => `Walk along ${s}`,
    continueStreet: (s: string) => `Continue along ${s}`,
    enterGate:      (g: number | string) => `Enter through Gate ${g}`,
    walkToCorridor: "Walk through the indoor corridor to your section",
    viaPlazoleta:   "Pass through the Plaza",
  },
}

// ============================================================
// Lógica de pasos internos
// ============================================================
// Plazoleta = Puerta 1
const PLAZOLETA_GATE = 1

function walkInternal(
  steps: RouteStep[],
  from: number,
  to: number,
  tramo: number[],
  lang: "es" | "en" = "es"
) {
  if (from === to) return
  const fi = tramo.indexOf(from)
  const ti = tramo.indexOf(to)
  if (fi === -1 || ti === -1) return
  const t = T[lang]
  const gw = lang === "es" ? "Puerta" : "Gate"

  // ── Corte físico P8 ✖ P9 en TRAMO_2 (lado oriental ↔ General Norte) ──
  // No existe pasillo interior entre P8 y P9: hay que salir por la Puerta 7-8
  // al exterior, caminar por H. Vans Risn y entrar por la Puerta 9 (o viceversa).
  if (tramo === TRAMO_2 && (from === 9 || to === 9)) {
    const oriental = from === 9 ? to : from   // extremo en {5,6,7,8}
    const emitOriental = (a: number, b: number) => {
      if (a === b) return
      const ai = TRAMO_2.indexOf(a)
      const bi = TRAMO_2.indexOf(b)
      const d = ai < bi ? 1 : -1
      const m: number[] = []
      for (let i = ai + d; i !== bi; i += d) m.push(TRAMO_2[i])
      steps.push({
        type: "internal",
        instruction: t.walkCorridor,
        detail: m.length > 0 ? t.passesByGate(m.map(String).join(`, ${gw} `)) : t.fromTo(a, b),
        icon: "walk",
      })
    }
    if (to === 9) {
      // oriental → P9: camina interno hasta P8, sale por 7-8, Hermenz, entra P9
      emitOriental(oriental, 8)
      steps.push({ type: "external", instruction: t.exitGate("7-8"), icon: "exit" })
      steps.push({ type: "external", instruction: t.walkStreet("H. Vans Risn"), icon: "walk" })
      steps.push({ type: "external", instruction: t.enterGate(9), icon: "enter" })
    } else {
      // P9 → oriental: sale por P9, Hermenz, entra por 7-8, camina interno hasta destino
      steps.push({ type: "external", instruction: t.exitGate(9), icon: "exit" })
      steps.push({ type: "external", instruction: t.walkStreet("H. Vans Risn"), icon: "walk" })
      steps.push({ type: "external", instruction: t.enterGate("7-8"), icon: "enter" })
      emitOriental(8, oriental)
    }
    return
  }

  const dir = fi < ti ? 1 : -1
  const mid: number[] = []
  for (let i = fi + dir; i !== ti; i += dir) mid.push(tramo[i])

  const passesPlazoleta = mid.includes(PLAZOLETA_GATE)

  if (passesPlazoleta) {
    const plazaIdx = mid.indexOf(PLAZOLETA_GATE)
    const before = mid.slice(0, plazaIdx).filter(g => g !== PLAZOLETA_GATE)
    const after  = mid.slice(plazaIdx + 1).filter(g => g !== PLAZOLETA_GATE)
    const gateWord = lang === "es" ? "Puerta" : "Gate"

    // Segmento antes de la plazoleta (solo si hay tramo real)
    if (before.length > 0) {
      steps.push({
        type: "internal",
        instruction: t.walkCorridor,
        detail: t.passesByGate(before.map(String).join(`, ${gateWord} `)),
        icon: "walk",
      })
    }

    // Paso por la plazoleta
    steps.push({
      type: "internal",
      instruction: t.viaPlazoleta,
      icon: "walk",
    })

    // Segmento después de la plazoleta (solo si hay tramo real)
    if (after.length > 0) {
      steps.push({
        type: "internal",
        instruction: t.walkCorridor,
        detail: t.passesByGate(after.map(String).join(`, ${gateWord} `)),
        icon: "walk",
      })
    }
  } else {
    steps.push({
      type: "internal",
      instruction: t.walkCorridor,
      detail: mid.length > 0
        ? t.passesByGate(mid.map(String).join(`, ${lang === "es" ? "Puerta" : "Gate"} `))
        : t.fromTo(from, to),
      icon: "walk",
    })
  }
}

// ============================================================
// RUTAS ESPECIALES (recorridos exteriores predefinidos)
// ------------------------------------------------------------
// Algunas parejas origen→destino no siguen el anillo perimetral, sino un
// recorrido exterior concreto por la calle. Aquí se definen a mano: sus pasos
// y su polilínea EXACTA en coordenadas del SVG. Tienen prioridad sobre el motor.
//
//  RUTA 1: Tribuna Sur Occidental (P3) → General Sur Alta (P4)
//          Salida al exterior por Puerta 2-3, subida por Calle Cacica Quilago
//          e ingreso por la Puerta 4 LOCAL.
// ============================================================

// Nodos del nuevo SVG usados por las rutas especiales (coords viewBox).
const PT = {
  p3:            { x: 599.981, y: 348.188 }, // Tribuna Sur Occidental (P3)
  p23Exterior:   { x: 666.981, y: 383.477 }, // salida exterior junto a Puerta 2-3
  calleAbajo:    { x: 786.981, y: 383.476 }, // Calle Cacica Quilago, esquina inferior
  calleArriba:   { x: 786.709, y: 193.228 }, // Calle Cacica Quilago, esquina superior
  p4Local:       { x: 746.709, y: 229.997 }, // ingreso Puerta 4 LOCAL
  p4Junction:    { x: 747.12,  y: 289.997 }, // giro interior a la altura de General Sur Alta
  p4AltaSeat:    { x: 670.291, y: 289.996 }, // General Sur Alta (P4)

  // ── Zona Norte Occidental (RUTA 2), calle Hermensz Van Risn Rembrandt ──
  p9OccSeat:     { x: 275.995, y: 294.187 }, // General Norte Occidental (P9 Occ)
  p9OccJunction: { x: 275.995, y: 348.188 }, // giro interior bajo General Norte Occidental
  p9wExterior:   { x: 226.996, y: 348.188 }, // salida Puerta 9W (a la calle)
  p1011Exterior: { x: 226.996, y: 371.054 }, // Puerta 10-11 (sobre la calle)
  p1011Corner:   { x: 275.995, y: 371.052 }, // giro de la calle hacia la Puerta 10
  p10Seat:       { x: 345.981, y: 348.188 }, // Tribuna Norte Occidental (P10)

  // ── RUTA 3: bajada por H. Vans Risn y La Esperanza hacia la Plazoleta (P1) ──
  p1011Down:     { x: 226.996, y: 397.189 }, // bajada por H. Vans Risn
  laEspNWJog:    { x: 212.252, y: 397.188 }, // quiebre hacia el borde occidental
  laEspNWCorner: { x: 212.253, y: 467.546 }, // esquina inferior (inicio La Esperanza)
  laEspP1:       { x: 531.823, y: 486.546 }, // La Esperanza a la altura de la Puerta 1
  p1TurnUp:      { x: 531.822, y: 418.299 }, // giro hacia arriba en la Puerta 1
  plazoletaP1:   { x: 474.215, y: 388.346 }, // Plazoleta (Puerta 1) — destino real
}

// Longitud de una polilínea (unidades SVG).
function polyLength(pts: { x: number; y: number }[]): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  }
  return len
}

// Calibración anillo: ~91 unidades SVG entre puertas contiguas ≈ 100 m.
const METERS_PER_SVG_UNIT = 100 / 91

function metersOf(pts: { x: number; y: number }[]): number {
  return Math.round((polyLength(pts) * METERS_PER_SVG_UNIT) / 10) * 10
}

type SpecialRouteBuilder = (lang: "es" | "en") => Omit<RouteResult, "from" | "to">

const SPECIAL_ROUTES: Record<string, SpecialRouteBuilder> = {
  // ── RUTA 1: P3 → P4 (General Sur Alta) por el exterior ──
  "tribuna-sur-occidental|general-sur-alta": (lang) => {
    const path = [
      PT.p3, PT.p23Exterior, PT.calleAbajo, PT.calleArriba, PT.p4Local, PT.p4Junction, PT.p4AltaSeat,
    ]
    const steps: RouteStep[] =
      lang === "es"
        ? [
            { type: "start",    instruction: "Tribuna Sur Occidental", detail: "Puerta 3", icon: "pin" },
            { type: "external", instruction: "Sal al exterior", icon: "exit" },
            { type: "external", instruction: "Dirígete a la Puerta 2-3", icon: "walk" },
            { type: "external", instruction: "Camina por Calle Cacica Quilago", icon: "walk" },
            { type: "external", instruction: "Ingresa por la Puerta 4 LOCAL", icon: "enter" },
            { type: "arrive",   instruction: "General Sur Alta", detail: "Puerta 4", icon: "flag" },
          ]
        : [
            { type: "start",    instruction: "South West Stand", detail: "Gate 3", icon: "pin" },
            { type: "external", instruction: "Exit to the exterior", icon: "exit" },
            { type: "external", instruction: "Head to Gate 2-3", icon: "walk" },
            { type: "external", instruction: "Walk along Calle Cacica Quilago", icon: "walk" },
            { type: "external", instruction: "Enter through Gate 4 LOCAL", icon: "enter" },
            { type: "arrive",   instruction: "South High General", detail: "Gate 4", icon: "flag" },
          ]
    return {
      steps,
      totalSteps: steps.length,
      usesExterior: true,
      gateTrace: [3, 4],
      specialPath: path,
      specialMeters: metersOf(path),
    }
  },

  // ── RUTA 1 (inversa): P4 (General Sur Alta) → P3 ──
  "general-sur-alta|tribuna-sur-occidental": (lang) => {
    const path = [
      PT.p4AltaSeat, PT.p4Junction, PT.p4Local, PT.calleArriba, PT.calleAbajo, PT.p23Exterior, PT.p3,
    ]
    const steps: RouteStep[] =
      lang === "es"
        ? [
            { type: "start",    instruction: "General Sur Alta", detail: "Puerta 4", icon: "pin" },
            { type: "external", instruction: "Sal al exterior por la Puerta 4 LOCAL", icon: "exit" },
            { type: "external", instruction: "Camina por Calle Cacica Quilago", icon: "walk" },
            { type: "external", instruction: "Dirígete a la Puerta 2-3", icon: "walk" },
            { type: "external", instruction: "Ingresa por la Puerta 3", icon: "enter" },
            { type: "arrive",   instruction: "Tribuna Sur Occidental", detail: "Puerta 3", icon: "flag" },
          ]
        : [
            { type: "start",    instruction: "South High General", detail: "Gate 4", icon: "pin" },
            { type: "external", instruction: "Exit to the exterior through Gate 4 LOCAL", icon: "exit" },
            { type: "external", instruction: "Walk along Calle Cacica Quilago", icon: "walk" },
            { type: "external", instruction: "Head to Gate 2-3", icon: "walk" },
            { type: "external", instruction: "Enter through Gate 3", icon: "enter" },
            { type: "arrive",   instruction: "South West Stand", detail: "Gate 3", icon: "flag" },
          ]
    return {
      steps,
      totalSteps: steps.length,
      usesExterior: true,
      gateTrace: [4, 3],
      specialPath: path,
      specialMeters: metersOf(path),
    }
  },

  // ── RUTA 2: General Norte Occidental (P9) → Tribuna Norte Occidental (P10) ──
  //    Salida por Puerta 9W, calle Hermensz Van Risn Rembrandt e ingreso por
  //    la Puerta 10-11.
  "general-norte-occidental|tribuna-norte-occidental": (lang) => {
    const path = [
      PT.p9OccSeat, PT.p9OccJunction, PT.p9wExterior, PT.p1011Exterior, PT.p1011Corner, PT.p10Seat,
    ]
    const steps: RouteStep[] =
      lang === "es"
        ? [
            { type: "start",    instruction: "General Norte Occidental", detail: "Puerta 9", icon: "pin" },
            { type: "external", instruction: "Sal por la Puerta 9W", icon: "exit" },
            { type: "external", instruction: "Camina por H. Vans Risn", icon: "walk" },
            { type: "external", instruction: "Llega a la Puerta 10-11", icon: "walk" },
            { type: "external", instruction: "Ingresa a Tribuna Norte Occidental (Puerta 10)", icon: "enter" },
            { type: "arrive",   instruction: "Tribuna Norte Occidental", detail: "Puerta 10", icon: "flag" },
          ]
        : [
            { type: "start",    instruction: "North West General", detail: "Gate 9", icon: "pin" },
            { type: "external", instruction: "Exit through Gate 9W", icon: "exit" },
            { type: "external", instruction: "Walk along H. Vans Risn", icon: "walk" },
            { type: "external", instruction: "Reach Gate 10-11", icon: "walk" },
            { type: "external", instruction: "Enter North West Stand (Gate 10)", icon: "enter" },
            { type: "arrive",   instruction: "North West Stand", detail: "Gate 10", icon: "flag" },
          ]
    return {
      steps,
      totalSteps: steps.length,
      usesExterior: true,
      gateTrace: [9, 10],
      specialPath: path,
      specialMeters: metersOf(path),
    }
  },

  // ── RUTA 2 (inversa): Tribuna Norte Occidental (P10) → General Norte Occidental (P9) ──
  "tribuna-norte-occidental|general-norte-occidental": (lang) => {
    const path = [
      PT.p10Seat, PT.p1011Corner, PT.p1011Exterior, PT.p9wExterior, PT.p9OccJunction, PT.p9OccSeat,
    ]
    const steps: RouteStep[] =
      lang === "es"
        ? [
            { type: "start",    instruction: "Tribuna Norte Occidental", detail: "Puerta 10", icon: "pin" },
            { type: "external", instruction: "Sal por la Puerta 10-11", icon: "exit" },
            { type: "external", instruction: "Camina por H. Vans Risn", icon: "walk" },
            { type: "external", instruction: "Llega a la Puerta 9W", icon: "walk" },
            { type: "external", instruction: "Ingresa a General Norte Occidental (Puerta 9)", icon: "enter" },
            { type: "arrive",   instruction: "General Norte Occidental", detail: "Puerta 9", icon: "flag" },
          ]
        : [
            { type: "start",    instruction: "North West Stand", detail: "Gate 10", icon: "pin" },
            { type: "external", instruction: "Exit through Gate 10-11", icon: "exit" },
            { type: "external", instruction: "Walk along H. Vans Risn", icon: "walk" },
            { type: "external", instruction: "Reach Gate 9W", icon: "walk" },
            { type: "external", instruction: "Enter North West General (Gate 9)", icon: "enter" },
            { type: "arrive",   instruction: "North West General", detail: "Gate 9", icon: "flag" },
          ]
    return {
      steps,
      totalSteps: steps.length,
      usesExterior: true,
      gateTrace: [10, 9],
      specialPath: path,
      specialMeters: metersOf(path),
    }
  },

  // ── RUTA 3: Tribuna Norte Occidental (P10) → Plazoleta (P1) ──
  //    Salida por Puerta 10-11, bajada por H. Vans Risn, giro a la derecha en
  //    la Puerta 1 y continuación por La Esperanza hasta la Plazoleta.
  "tribuna-norte-occidental|plazoleta": (lang) => {
    const path = [
      PT.p10Seat, PT.p1011Corner, PT.p1011Exterior, PT.p1011Down,
      PT.laEspNWJog, PT.laEspNWCorner, PT.laEspP1, PT.p1TurnUp, PT.plazoletaP1,
    ]
    const steps: RouteStep[] =
      lang === "es"
        ? [
            { type: "start",    instruction: "Tribuna Norte Occidental", detail: "Puerta 10", icon: "pin" },
            { type: "external", instruction: "Sal por la Puerta 10-11", icon: "exit" },
            { type: "external", instruction: "Camina por H. Vans Risn siguiendo la ruta señalizada", icon: "walk" },
            { type: "external", instruction: "Gira a la derecha hacia la Puerta 1", icon: "walk" },
            { type: "external", instruction: "Continúa por La Esperanza siguiendo la ruta señalizada", icon: "walk" },
            { type: "arrive",   instruction: "Plazoleta", detail: "Puerta 1", icon: "flag" },
          ]
        : [
            { type: "start",    instruction: "North West Stand", detail: "Gate 10", icon: "pin" },
            { type: "external", instruction: "Exit through Gate 10-11", icon: "exit" },
            { type: "external", instruction: "Walk along H. Vans Risn following the marked route", icon: "walk" },
            { type: "external", instruction: "Turn right toward Gate 1", icon: "walk" },
            { type: "external", instruction: "Continue along La Esperanza following the marked route", icon: "walk" },
            { type: "arrive",   instruction: "Plaza", detail: "Gate 1", icon: "flag" },
          ]
    return {
      steps,
      totalSteps: steps.length,
      usesExterior: true,
      gateTrace: [10, 1],
      specialPath: path,
      specialMeters: metersOf(path),
    }
  },

  // ── RUTA 3 (inversa): Plazoleta (P1) → Tribuna Norte Occidental (P10) ──
  "plazoleta|tribuna-norte-occidental": (lang) => {
    const path = [
      PT.plazoletaP1, PT.p1TurnUp, PT.laEspP1, PT.laEspNWCorner, PT.laEspNWJog,
      PT.p1011Down, PT.p1011Exterior, PT.p1011Corner, PT.p10Seat,
    ]
    const steps: RouteStep[] =
      lang === "es"
        ? [
            { type: "start",    instruction: "Plazoleta", detail: "Puerta 1", icon: "pin" },
            { type: "external", instruction: "Sal por la Puerta 1", icon: "exit" },
            { type: "external", instruction: "Camina por La Esperanza siguiendo la ruta señalizada", icon: "walk" },
            { type: "external", instruction: "Gira a la izquierda hacia H. Vans Risn", icon: "walk" },
            { type: "external", instruction: "Ingresa por la Puerta 10-11", icon: "enter" },
            { type: "arrive",   instruction: "Tribuna Norte Occidental", detail: "Puerta 10", icon: "flag" },
          ]
        : [
            { type: "start",    instruction: "Plaza", detail: "Gate 1", icon: "pin" },
            { type: "external", instruction: "Exit through Gate 1", icon: "exit" },
            { type: "external", instruction: "Walk along La Esperanza following the marked route", icon: "walk" },
            { type: "external", instruction: "Turn left toward H. Vans Risn", icon: "walk" },
            { type: "external", instruction: "Enter through Gate 10-11", icon: "enter" },
            { type: "arrive",   instruction: "North West Stand", detail: "Gate 10", icon: "flag" },
          ]
    return {
      steps,
      totalSteps: steps.length,
      usesExterior: true,
      gateTrace: [1, 10],
      specialPath: path,
      specialMeters: metersOf(path),
    }
  },
}

// ============================================================
// Algoritmo principal
// ============================================================
export function calculateRoute(fromId: string, toId: string, lang: "es" | "en" = "es"): RouteResult {
  // Rutas especiales predefinidas (tienen prioridad sobre el motor de anillo).
  const special = SPECIAL_ROUTES[`${fromId}|${toId}`]
  if (special) {
    return { from: fromId, to: toId, ...special(lang) }
  }

  const fromGate = SECTION_GATES[fromId]
  const toGate   = SECTION_GATES[toId]
  const fromName = getSectionName(fromId, lang)
  const toName   = getSectionName(toId, lang)
  const t = T[lang]
  const gateLabel = lang === "es" ? "Puerta" : "Gate"

  if (fromGate == null || toGate == null) {
    return { from: fromId, to: toId, steps: [], totalSteps: 0, usesExterior: false, gateTrace: [] }
  }

  const steps: RouteStep[] = []

  steps.push({
    type: "start",
    instruction: fromName,
    detail: `${gateLabel} ${fromGate}`,
    icon: "pin",
  })

  // Misma puerta
  if (fromGate === toGate && fromId !== toId) {
    steps.push({ type: "internal", instruction: t.walkToCorridor, icon: "walk" })
    steps.push({ type: "arrive", instruction: toName, detail: `${gateLabel} ${toGate}`, icon: "flag" })
    return { from: fromId, to: toId, steps, totalSteps: steps.length, usesExterior: false, gateTrace: [fromGate] }
  }

  const route = resolveRoute(fromGate, toGate, lang)
  steps.push(...route.steps)
  steps.push({ type: "arrive", instruction: toName, detail: `${gateLabel} ${toGate}`, icon: "flag" })

  const usesExterior = steps.some(s => s.type === "external")
  return { from: fromId, to: toId, steps, totalSteps: steps.length, usesExterior, gateTrace: route.trace }
}

interface ResolvedRoute { steps: RouteStep[]; trace: number[] }

function externalStep(exit: number | string, streets: string[], entry: number | string, lang: "es" | "en"): RouteStep[] {
  const t = T[lang]
  return [
    { type: "external", instruction: t.exitGate(exit), icon: "exit" },
    ...streets.map((s, i) => ({
      type: "external" as const,
      instruction: i === 0 ? t.walkStreet(s) : t.continueStreet(s),
      icon: "walk" as const,
    })),
    { type: "external", instruction: t.enterGate(entry), icon: "enter" },
  ]
}

function resolveRoute(from: number, to: number, lang: "es" | "en" = "es"): ResolvedRoute {
  const steps: RouteStep[] = []
  const trace: number[] = [from]
  const pushTrace = (g: number) => {
    if (trace[trace.length - 1] !== g) trace.push(g)
  }
  // Recorre el tramo de f a t2 y registra cada puerta intermedia en el trace
  const traceTramo = (f: number, t2: number, tramo: number[]) => {
    const fi = tramo.indexOf(f)
    const ti = tramo.indexOf(t2)
    if (fi === -1 || ti === -1) { pushTrace(t2); return }
    const dir = fi < ti ? 1 : -1
    for (let i = fi + dir; i !== ti + dir; i += dir) pushTrace(tramo[i])
  }
  const wi = (f: number, t2: number, tramo: number[]) => {
    walkInternal(steps, f, t2, tramo, lang)
    traceTramo(f, t2, tramo)
  }
  const ext = (
    exit: number,
    streets: string[],
    entry: number,
    opts?: { exitLabel?: number | string; entryLabel?: number | string },
  ) => {
    pushTrace(exit)
    pushTrace(entry)
    return externalStep(opts?.exitLabel ?? exit, streets, opts?.entryLabel ?? entry, lang)
  }

  // ── Conexión oeste (P10/Hermenz) ↔ TRAMO_2 ──────────────────────────────
  // General Norte (P9) se entra/sale por la Puerta 9; las secciones orientales
  // (P5-P8) se alcanzan por la Puerta 7-8 caminando por H. Vans Risn.
  const westToTramo2 = (target: number) => {
    if (target === 9) {
      steps.push(...ext(10, ["H. Vans Risn"], 9))
    } else {
      steps.push(...ext(10, ["H. Vans Risn"], 8, { entryLabel: "7-8" }))
      wi(8, target, TRAMO_2)
    }
  }
  const tramo2ToWest = (source: number) => {
    if (source === 9) {
      steps.push(...ext(9, ["H. Vans Risn"], 10))
    } else {
      wi(source, 8, TRAMO_2)
      steps.push(...ext(8, ["H. Vans Risn"], 10, { exitLabel: "7-8" }))
    }
  }

  // ── Conexión Sur Occidental (Plazoleta P1) ↔ Norte Occidental (P10) ──────
  // Anulado el paso interno P11 ✖ Plazoleta: el único enlace es exterior por
  // La Esperanza + H. Vans Risn (RUTA 3).
  const plazoletaToWest = () => {
    steps.push(...ext(1, ["La Esperanza", "H. Vans Risn"], 10, { entryLabel: "10-11" }))
  }
  const westToPlazoleta = () => {
    steps.push(...ext(10, ["H. Vans Risn", "La Esperanza"], 1, { exitLabel: "10-11" }))
  }

  // ── Mismo tramo directo ──────────────────────────────────

  if (inTramo1(from) && inTramo1(to)) {
    wi(from, to, TRAMO_1)
    return { steps, trace }
  }

  if (inTramo2(from) && inTramo2(to)) {
    wi(from, to, TRAMO_2)
    return { steps, trace }
  }

  if (inTramo3(from) && inTramo3(to)) {
    wi(from, to, TRAMO_3)
    return { steps, trace }
  }

  // ── TRAMO_1 (Sur Occidental + Plazoleta) ↔ TRAMO_3 (Norte Occidental) ────
  // Ya NO hay pasillo interior: se enlaza por el exterior (La Esperanza) a
  // través de la Plazoleta (P1) y la Puerta 10-11.
  if (inTramo1(from) && inTramo3(to)) {
    wi(from, PLAZOLETA_GATE, TRAMO_1)   // pasillo interior hasta la Plazoleta
    plazoletaToWest()                   // exterior La Esperanza + H. Vans Risn
    wi(10, to, TRAMO_3)                 // pasillo interior Norte Occidental
    return { steps, trace }
  }
  if (inTramo3(from) && inTramo1(to)) {
    wi(from, 10, TRAMO_3)
    westToPlazoleta()
    wi(PLAZOLETA_GATE, to, TRAMO_1)
    return { steps, trace }
  }

  // ── TRAMO_2 ↔ TRAMO_3: P9 ↔ P10 por Hermensz ───────────
  if (inTramo2(from) && inTramo3(to)) {
    tramo2ToWest(from)
    wi(10, to, TRAMO_3)
    return { steps, trace }
  }
  if (inTramo3(from) && inTramo2(to)) {
    wi(from, 10, TRAMO_3)
    westToTramo2(to)
    return { steps, trace }
  }
  // ── TRAMO_1 ↔ TRAMO_2: salida sur por P3 → Cacica Quilago ────
  // Tanto P5/P6 como P7/P8/P9 se alcanzan saliendo por P3 al exterior
  // (Cacica Quilago) y entrando por el lado oriental. Nunca por la Plazoleta.
  if (inTramo1(from) && inTramo2(to)) {
    wi(from, 3, TRAMO_1)
    if (to <= 6) {
      steps.push(...ext(3, ["Calle Cacica Quilago"], to))
    } else {
      // P7/P8/P9: exterior por Cacica Quilago, entra por P5 y camina interno
      steps.push(...ext(3, ["Calle Cacica Quilago"], 5))
      wi(5, to, TRAMO_2)
    }
    return { steps, trace }
  }
  if (inTramo2(from) && inTramo1(to)) {
    if (from <= 6) {
      // Desde P5/P6: Cacica Quilago → P3
      wi(from, 5, TRAMO_2)
      steps.push(...ext(5, ["Calle Cacica Quilago"], 3))
    } else {
      // Desde P7/P8/P9: camina interno hasta P5, sale a Cacica Quilago → P3
      wi(from, 5, TRAMO_2)
      steps.push(...ext(5, ["Calle Cacica Quilago"], 3))
    }
    wi(3, to, TRAMO_1)
    return { steps, trace }
  }

  // ── Rutas con P4 (General Sur) ───────────────────────────
  // P4 ↔ TRAMO_1 (incl. Plazoleta) por el sur: Cacica Quilago ↔ P3.
  // P4 ↔ TRAMO_3 (Norte Occidental) se resuelve más abajo por el norte
  // (Cacica + Diego Vásquez → P5 → … → P9 → H. Vans Risn → P10).
  if (from === 4 && inTramo1(to)) {
    steps.push(...ext(4, ["Calle Cacica Quilago"], 3))
    wi(3, to, TRAMO_1)
    return { steps, trace }
  }
  if (to === 4 && inTramo1(from)) {
    wi(from, 3, TRAMO_1)
    steps.push(...ext(3, ["Calle Cacica Quilago"], 4))
    return { steps, trace }
  }
  if (from === 4 && inTramo2(to)) {
    const entry = to <= 6 ? to : 5
    steps.push(...ext(4, ["Calle Cacica Quilago", "Av. Diego Vásquez de Cepeda"], entry))
    wi(entry, to, TRAMO_2)
    return { steps, trace }
  }
  if (inTramo2(from) && to === 4) {
    wi(from, 5, TRAMO_2)
    steps.push(...ext(5, ["Calle Cacica Quilago", "Av. Diego Vásquez de Cepeda"], 4))
    return { steps, trace }
  }
  if (inTramo3(from) && to === 4) {
    wi(from, 10, TRAMO_3)
    westToTramo2(5)
    steps.push(...ext(5, ["Calle Cacica Quilago", "Av. Diego Vásquez de Cepeda"], 4))
    return { steps, trace }
  }
  if (from === 4 && inTramo3(to)) {
    steps.push(...ext(4, ["Calle Cacica Quilago", "Av. Diego Vásquez de Cepeda"], 5))
    tramo2ToWest(5)
    wi(10, to, TRAMO_3)
    return { steps, trace }
  }

  // Fallback
  const fallback = lang === "es" ? "Perímetro exterior del estadio" : "Stadium exterior perimeter"
  steps.push(...ext(from, [fallback], to))
  return { steps, trace }
}
