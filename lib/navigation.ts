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
      // oriental → P9: camina interno hasta P8, sale por 7-8, Hermenz, entra por 9W
      emitOriental(oriental, 8)
      steps.push({ type: "external", instruction: t.exitGate("7-8"), icon: "exit" })
      steps.push({ type: "external", instruction: t.walkStreet("H. Vans Risn"), icon: "walk" })
      steps.push({ type: "external", instruction: t.enterGate("9W"), icon: "enter" })
    } else {
      // P9 → oriental: sale por 9W, Hermenz, entra por 7-8, camina interno hasta destino
      steps.push({ type: "external", instruction: t.exitGate("9W"), icon: "exit" })
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
  p4BajaSeat:    { x: 670.292, y: 229.997 }, // General Sur Baja (P4) — se llega SOLO internamente desde Alta

  // ── Lado Sur Oriental (continuación interna desde General Sur Baja) ──
  p5Seat:        { x: 599.981, y: 170.31  }, // Tribuna Sur Oriental (P5)
  p6Seat:        { x: 537.972, y: 153.438 }, // Palco Sur Oriental (P6)

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

  // Asientos del bloque Sur/Norte Occidental (para las rutas del bucle oeste).
  p11Seat:       { x: 409.190, y: 363.356 }, // Palco Norte Occidental (P11)
  p2Seat:        { x: 537.973, y: 363.356 }, // Palco Sur Occidental (P2)
  p3Seat:        { x: 599.981, y: 348.188 }, // Tribuna Sur Occidental (P3)
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

// ============================================================
// Bucle Occidental (La Esperanza + H. Vans Risn)
// ------------------------------------------------------------
// Anulado el paso interno P11 ✖ Plazoleta, la ÚNICA conexión entre el Norte
// Occidental {P10, P11} y el bloque Sur Occidental {Plazoleta(P1), P2, P3} es
// el recorrido exterior por la Puerta 10-11 → H. Vans Risn → La Esperanza →
// Puerta 1. Para que el MAPA y las INDICACIONES siempre coincidan, todas estas
// combinaciones se generan como rutas especiales con su polilínea exacta.
// ============================================================
const WEST_LOOP_NAMES: Record<number, { es: string; en: string; gate: string }> = {
  9:  { es: "General Norte Occidental", en: "North West General", gate: "9"  },
  10: { es: "Tribuna Norte Occidental", en: "North West Stand", gate: "10" },
  11: { es: "Palco Norte Occidental",   en: "North West Box",   gate: "11" },
  1:  { es: "Plazoleta",                en: "Plaza",            gate: "1"  },
  2:  { es: "Palco Sur Occidental",     en: "South West Box",   gate: "2"  },
  3:  { es: "Tribuna Sur Occidental",   en: "South West Stand", gate: "3"  },
}

type Pt = { x: number; y: number }

// Tramo exterior compartido hasta la Puerta 1 (Plazoleta). El giro p1011Corner
// solo aplica a P10/P11 (que salen del asiento hacia la Puerta 10-11); General
// Norte Occidental (P9) baja RECTO desde la Puerta 9W y lo omite.
function westLoopMid(north: number): Pt[] {
  const head = north === 9 ? [] : [PT.p1011Corner]
  return [
    ...head, PT.p1011Exterior, PT.p1011Down,
    PT.laEspNWJog, PT.laEspNWCorner, PT.laEspP1, PT.p1TurnUp,
  ]
}

// Cola interior del lado NORTE (asiento → puerta de salida).
// P9 (General Norte Occidental) usa SIEMPRE su enlace vertical interno
// p9OccSeat → p9OccJunction → Puerta 9W. P10/P11 usan la Puerta 10-11.
function northTail(gate: number): Pt[] {
  if (gate === 9)  return [PT.p9OccSeat, PT.p9OccJunction, PT.p9wExterior]
  return gate === 11 ? [PT.p11Seat, PT.p10Seat] : [PT.p10Seat]
}
// Cola interior del lado SUR (Plazoleta → asiento).
function southTail(gate: number): Pt[] {
  if (gate === 1) return [PT.plazoletaP1]
  if (gate === 2) return [PT.plazoletaP1, PT.p2Seat]
  return [PT.plazoletaP1, PT.p2Seat, PT.p3Seat] // P3
}

// Construye una ruta del bucle occidental entre un lado NORTE (10/11) y un lado
// SUR (1/2/3), en cualquier sentido, con pasos que reflejan la polilínea.
function makeWestLoopRoute(north: number, south: number, dir: "n2s" | "s2n"): SpecialRouteBuilder {
  return (lang) => {
    const forward = [...northTail(north), ...westLoopMid(north), ...southTail(south)]
    const path = dir === "n2s" ? forward : [...forward].reverse()

    const nName = WEST_LOOP_NAMES[north]
    const sName = WEST_LOOP_NAMES[south]
    const es = lang === "es"
    // General Norte Occidental (P9) sale/entra por la Puerta 9W; P10/P11 por 10-11.
    const northGate = north === 9 ? "9W" : "10-11"
    const steps: RouteStep[] = []

    if (dir === "n2s") {
      steps.push({ type: "start", instruction: es ? nName.es : nName.en, detail: `${es ? "Puerta" : "Gate"} ${nName.gate}`, icon: "pin" })
      if (north === 11)
        steps.push({ type: "internal", instruction: es ? "Camina hasta la Puerta 10-11" : "Walk to Gate 10-11", icon: "walk" })
      steps.push({ type: "external", instruction: es ? `Sal por la Puerta ${northGate}` : `Exit through Gate ${northGate}`, icon: "exit" })
      steps.push({ type: "external", instruction: es ? "Camina por H. Vans Risn siguiendo la ruta señalizada" : "Walk along H. Vans Risn following the marked route", icon: "walk" })
      steps.push({ type: "external", instruction: es ? "Gira a la derecha hacia la Puerta 1" : "Turn right toward Gate 1", icon: "walk" })
      steps.push({ type: "external", instruction: es ? "Continúa por La Esperanza siguiendo la ruta señalizada" : "Continue along La Esperanza following the marked route", icon: "walk" })
      if (south === 1) {
        steps.push({ type: "arrive", instruction: es ? sName.es : sName.en, detail: `${es ? "Puerta" : "Gate"} ${sName.gate}`, icon: "flag" })
      } else {
        steps.push({ type: "external", instruction: es ? "Ingresa por la Puerta 1" : "Enter through Gate 1", icon: "enter" })
        steps.push({ type: "internal", instruction: es ? `Camina hasta la Puerta ${sName.gate}` : `Walk to Gate ${sName.gate}`, icon: "walk" })
        steps.push({ type: "arrive", instruction: es ? sName.es : sName.en, detail: `${es ? "Puerta" : "Gate"} ${sName.gate}`, icon: "flag" })
      }
    } else {
      steps.push({ type: "start", instruction: es ? sName.es : sName.en, detail: `${es ? "Puerta" : "Gate"} ${sName.gate}`, icon: "pin" })
      if (south !== 1)
        steps.push({ type: "internal", instruction: es ? "Camina hasta la Puerta 1" : "Walk to Gate 1", icon: "walk" })
      steps.push({ type: "external", instruction: es ? "Sal por la Puerta 1" : "Exit through Gate 1", icon: "exit" })
      steps.push({ type: "external", instruction: es ? "Camina por La Esperanza siguiendo la ruta señalizada" : "Walk along La Esperanza following the marked route", icon: "walk" })
      steps.push({ type: "external", instruction: es ? "Gira a la izquierda hacia H. Vans Risn" : "Turn left toward H. Vans Risn", icon: "walk" })
      steps.push({ type: "external", instruction: es ? `Ingresa por la Puerta ${northGate}` : `Enter through Gate ${northGate}`, icon: "enter" })
      if (north === 11)
        steps.push({ type: "internal", instruction: es ? "Camina hasta la Puerta 11" : "Walk to Gate 11", icon: "walk" })
      steps.push({ type: "arrive", instruction: es ? nName.es : nName.en, detail: `${es ? "Puerta" : "Gate"} ${nName.gate}`, icon: "flag" })
    }

    // El nodo de calle es la Puerta 10-11 para P10/P11 y la Puerta 9W (→10-11) para P9.
    const northNode = north === 9 ? 9 : 10
    return {
      steps,
      totalSteps: steps.length,
      usesExterior: true,
      gateTrace: dir === "n2s" ? [north, northNode, 1, south] : [south, 1, northNode, north],
      specialPath: path,
      specialMeters: metersOf(path),
    }
  }
}

// ============================================================
// Corredor Sur (Puerta 2-3 + Calle Cacica Quilago)
// ------------------------------------------------------------
// El paso interno P3 ✖ P4 está cortado: TODA ruta entre el bloque Sur
// Occidental {Plazoleta(P1), P2, P3} y la General Sur (P4) debe salir por la
// Puerta 2-3 y subir por la Calle Cacica Quilago hasta la Puerta 4 LOCAL.
// Se genera con makeSouthCorridorRoute para que mapa e indicaciones coincidan
// siempre, sin importar cuál de las 3 secciones del sur occidental sea.
// ============================================================
const SOUTH_T1_NAMES: Record<number, { es: string; en: string; gate: string }> = {
  1: { es: "Plazoleta",              en: "Plaza",          gate: "1" },
  2: { es: "Palco Sur Occidental",   en: "South West Box", gate: "2" },
  3: { es: "Tribuna Sur Occidental", en: "South West Stand", gate: "3" },
}
const SOUTH_P4_NAMES: Record<"alta" | "baja", { es: string; en: string }> = {
  alta: { es: "General Sur Alta", en: "South High General" },
  baja: { es: "General Sur Baja", en: "South Low General" },
}

// Cola interior del bloque Sur Occidental: del asiento de la sección hasta P3.
function southTail1(gate: number): Pt[] {
  if (gate === 1) return [PT.plazoletaP1, PT.p2Seat, PT.p3]
  if (gate === 2) return [PT.p2Seat, PT.p3]
  return [PT.p3] // P3
}
// Tramo exterior P3 → Cacica Quilago → Puerta 4 LOCAL → General Sur Alta.
// A la General Sur SIEMPRE se ingresa por Alta. A la Baja NUNCA se entra
// directo: se llega internamente subiendo desde Alta (p4AltaSeat → p4BajaSeat).
const P4_ENTER = [PT.p23Exterior, PT.calleAbajo, PT.calleArriba, PT.p4Local, PT.p4Junction, PT.p4AltaSeat]
function p4Head(sub: "alta" | "baja"): Pt[] {
  return sub === "alta" ? [...P4_ENTER] : [...P4_ENTER, PT.p4BajaSeat]
}

// Cola interna de la General Sur hacia el lado oriental: Alta → Baja → P5 (→ P6).
// Todo este recorrido es INTERNO (no vuelve a salir a la calle).
function eastHead(east: number): Pt[] {
  const base = [...P4_ENTER, PT.p4BajaSeat, PT.p5Seat] // ...Alta → Baja → P5
  return east === 6 ? [...base, PT.p6Seat] : base
}

function makeSouthCorridorRoute(t1: number, sub: "alta" | "baja", dir: "out" | "in"): SpecialRouteBuilder {
  return (lang) => {
    const forward = [...southTail1(t1), ...p4Head(sub)]
    const path = dir === "out" ? forward : [...forward].reverse()
    const n1 = SOUTH_T1_NAMES[t1]
    const n4 = SOUTH_P4_NAMES[sub]
    const es = lang === "es"
    const gw = es ? "Puerta" : "Gate"
    const steps: RouteStep[] = []

    if (dir === "out") {
      steps.push({ type: "start", instruction: es ? n1.es : n1.en, detail: `${gw} ${n1.gate}`, icon: "pin" })
      if (t1 !== 3)
        steps.push({ type: "internal", instruction: es ? "Camina hasta la Puerta 3" : "Walk to Gate 3", icon: "walk" })
      steps.push({ type: "external", instruction: es ? "Sal por la Puerta 2-3" : "Exit through Gate 2-3", icon: "exit" })
      steps.push({ type: "external", instruction: es ? "Camina por Calle Cacica Quilago" : "Walk along Calle Cacica Quilago", icon: "walk" })
      steps.push({ type: "external", instruction: es ? "Ingresa por la Puerta 4 LOCAL a General Sur Alta" : "Enter through Gate 4 LOCAL into South High General", icon: "enter" })
      if (sub === "baja")
        steps.push({ type: "internal", instruction: es ? "Sube internamente de General Sur Alta a General Sur Baja" : "Walk up internally from South High to South Low General", icon: "walk" })
      steps.push({ type: "arrive", instruction: es ? n4.es : n4.en, detail: `${gw} 4`, icon: "flag" })
    } else {
      steps.push({ type: "start", instruction: es ? n4.es : n4.en, detail: `${gw} 4`, icon: "pin" })
      if (sub === "baja")
        steps.push({ type: "internal", instruction: es ? "Baja internamente de General Sur Baja a General Sur Alta" : "Walk down internally from South Low to South High General", icon: "walk" })
      steps.push({ type: "external", instruction: es ? "Sal por la Puerta 4 LOCAL" : "Exit through Gate 4 LOCAL", icon: "exit" })
      steps.push({ type: "external", instruction: es ? "Camina por Calle Cacica Quilago" : "Walk along Calle Cacica Quilago", icon: "walk" })
      steps.push({ type: "external", instruction: es ? "Ingresa por la Puerta 2-3" : "Enter through Gate 2-3", icon: "enter" })
      if (t1 !== 3)
        steps.push({ type: "internal", instruction: es ? `Camina hasta la Puerta ${n1.gate}` : `Walk to Gate ${n1.gate}`, icon: "walk" })
      steps.push({ type: "arrive", instruction: es ? n1.es : n1.en, detail: `${gw} ${n1.gate}`, icon: "flag" })
    }

    return {
      steps,
      totalSteps: steps.length,
      usesExterior: true,
      gateTrace: dir === "out" ? [t1, 3, 4] : [4, 3, t1],
      specialPath: path,
      specialMeters: metersOf(path),
    }
  }
}

// ============================================================
// Corredor Sur → Oriental (Cacica Quilago → Alta → Baja → P5/P6)
// ------------------------------------------------------------
// El bloque Sur Occidental {Plazoleta(P1), P2, P3} llega al lado Sur Oriental
// {Tribuna Sur Oriental(P5), Palco Sur Oriental(P6)} SIEMPRE por el mismo
// corredor: sale por la Puerta 2-3, sube por Calle Cacica Quilago, entra por la
// Puerta 4 LOCAL a General Sur Alta y continúa INTERNAMENTE por Alta → Baja →
// P5 (→ P6). A la General Sur Baja nunca se entra directo; desde ella siempre
// se sigue internamente hacia el oriental.
// ============================================================
const SOUTH_EAST_NAMES: Record<number, { es: string; en: string; gate: string }> = {
  5: { es: "Tribuna Sur Oriental", en: "South East Stand", gate: "5" },
  6: { es: "Palco Sur Oriental",   en: "South East Box",   gate: "6" },
}

function makeEastCorridorRoute(t1: number, east: number, dir: "out" | "in"): SpecialRouteBuilder {
  return (lang) => {
    const forward = [...southTail1(t1), ...eastHead(east)]
    const path = dir === "out" ? forward : [...forward].reverse()
    const n1 = SOUTH_T1_NAMES[t1]
    const nE = SOUTH_EAST_NAMES[east]
    const es = lang === "es"
    const gw = es ? "Puerta" : "Gate"
    const steps: RouteStep[] = []

    if (dir === "out") {
      steps.push({ type: "start", instruction: es ? n1.es : n1.en, detail: `${gw} ${n1.gate}`, icon: "pin" })
      if (t1 !== 3)
        steps.push({ type: "internal", instruction: es ? "Camina hasta la Puerta 3" : "Walk to Gate 3", icon: "walk" })
      steps.push({ type: "external", instruction: es ? "Sal por la Puerta 2-3" : "Exit through Gate 2-3", icon: "exit" })
      steps.push({ type: "external", instruction: es ? "Camina por Calle Cacica Quilago" : "Walk along Calle Cacica Quilago", icon: "walk" })
      steps.push({ type: "external", instruction: es ? "Ingresa por la Puerta 4 LOCAL a General Sur Alta" : "Enter through Gate 4 LOCAL into South High General", icon: "enter" })
      steps.push({ type: "internal", instruction: es ? `Continúa internamente por General Sur (Alta y Baja) hasta ${nE.es}` : `Continue internally through South General (High and Low) to ${nE.en}`, icon: "walk" })
      steps.push({ type: "arrive", instruction: es ? nE.es : nE.en, detail: `${gw} ${nE.gate}`, icon: "flag" })
    } else {
      steps.push({ type: "start", instruction: es ? nE.es : nE.en, detail: `${gw} ${nE.gate}`, icon: "pin" })
      steps.push({ type: "internal", instruction: es ? "Camina internamente por General Sur (Baja y Alta) hasta la Puerta 4 LOCAL" : "Walk internally through South General (Low and High) to Gate 4 LOCAL", icon: "walk" })
      steps.push({ type: "external", instruction: es ? "Sal por la Puerta 4 LOCAL" : "Exit through Gate 4 LOCAL", icon: "exit" })
      steps.push({ type: "external", instruction: es ? "Camina por Calle Cacica Quilago" : "Walk along Calle Cacica Quilago", icon: "walk" })
      steps.push({ type: "external", instruction: es ? "Ingresa por la Puerta 2-3" : "Enter through Gate 2-3", icon: "enter" })
      if (t1 !== 3)
        steps.push({ type: "internal", instruction: es ? `Camina hasta la Puerta ${n1.gate}` : `Walk to Gate ${n1.gate}`, icon: "walk" })
      steps.push({ type: "arrive", instruction: es ? n1.es : n1.en, detail: `${gw} ${n1.gate}`, icon: "flag" })
    }

    return {
      steps,
      totalSteps: steps.length,
      usesExterior: true,
      gateTrace: dir === "out" ? [t1, 3, 4, east] : [east, 4, 3, t1],
      specialPath: path,
      specialMeters: metersOf(path),
    }
  }
}

// ============================================================
// Tramo interno General Sur ↔ Sur Oriental (Alta → Baja → P5 → P6)
// ------------------------------------------------------------
// Dentro del anillo sur, el orden físico es: General Sur Alta → General Sur
// Baja → Tribuna Sur Oriental (P5) → Palco Sur Oriental (P6). A la Baja NUNCA se
// entra directo desde la calle: solo se llega internamente. Estas rutas son
// 100% internas (no salen a Cacica Quilago).
// ============================================================
const SUR_INTERNAL_ORDER = ["alta", "baja", 5, 6] as const
type SurNode = (typeof SUR_INTERNAL_ORDER)[number]
const SUR_INTERNAL_PT: Record<string, Pt> = {
  alta: PT.p4AltaSeat,
  baja: PT.p4BajaSeat,
  "5": PT.p5Seat,
  "6": PT.p6Seat,
}
const SUR_INTERNAL_NAMES: Record<string, { es: string; en: string; gate: string }> = {
  alta: { es: "General Sur Alta", en: "South High General", gate: "4" },
  baja: { es: "General Sur Baja", en: "South Low General", gate: "4" },
  "5":  { es: "Tribuna Sur Oriental", en: "South East Stand", gate: "5" },
  "6":  { es: "Palco Sur Oriental",   en: "South East Box",   gate: "6" },
}

function makeSurInternalRoute(from: SurNode, to: SurNode): SpecialRouteBuilder {
  return (lang) => {
    const iFrom = SUR_INTERNAL_ORDER.indexOf(from)
    const iTo = SUR_INTERNAL_ORDER.indexOf(to)
    const asc = iFrom < iTo
    const slice = SUR_INTERNAL_ORDER.slice(Math.min(iFrom, iTo), Math.max(iFrom, iTo) + 1)
    const ordered = asc ? slice : [...slice].reverse()
    const path = ordered.map((n) => SUR_INTERNAL_PT[String(n)])
    const nFrom = SUR_INTERNAL_NAMES[String(from)]
    const nTo = SUR_INTERNAL_NAMES[String(to)]
    const es = lang === "es"
    const gw = es ? "Puerta" : "Gate"
    const steps: RouteStep[] = [
      { type: "start", instruction: es ? nFrom.es : nFrom.en, detail: `${gw} ${nFrom.gate}`, icon: "pin" },
      { type: "internal", instruction: es ? `Camina internamente hasta ${nTo.es}` : `Walk internally to ${nTo.en}`, icon: "walk" },
      { type: "arrive", instruction: es ? nTo.es : nTo.en, detail: `${gw} ${nTo.gate}`, icon: "flag" },
    ]
    return {
      steps,
      totalSteps: steps.length,
      usesExterior: false,
      gateTrace: ordered.map((n) => (n === "alta" || n === "baja" ? 4 : n)),
      specialPath: path,
      specialMeters: metersOf(path),
    }
  }
}

const SPECIAL_ROUTES: Record<string, SpecialRouteBuilder> = {
  // ── Tramo interno General Sur ↔ Sur Oriental (Alta → Baja → P5 → P6) ──
  "general-sur-alta|general-sur-baja":         makeSurInternalRoute("alta", "baja"),
  "general-sur-baja|general-sur-alta":         makeSurInternalRoute("baja", "alta"),
  "general-sur-alta|tribuna-sur-oriental":     makeSurInternalRoute("alta", 5),
  "tribuna-sur-oriental|general-sur-alta":     makeSurInternalRoute(5, "alta"),
  "general-sur-alta|palco-sur-oriental":       makeSurInternalRoute("alta", 6),
  "palco-sur-oriental|general-sur-alta":       makeSurInternalRoute(6, "alta"),
  "general-sur-baja|tribuna-sur-oriental":     makeSurInternalRoute("baja", 5),
  "tribuna-sur-oriental|general-sur-baja":     makeSurInternalRoute(5, "baja"),
  "general-sur-baja|palco-sur-oriental":       makeSurInternalRoute("baja", 6),
  "palco-sur-oriental|general-sur-baja":       makeSurInternalRoute(6, "baja"),

  // ── Corredor Sur: {Plazoleta(P1), P2, P3} ↔ General Sur (P4) por Cacica Quilago ──
  "tribuna-sur-occidental|general-sur-alta": makeSouthCorridorRoute(3, "alta", "out"),
  "general-sur-alta|tribuna-sur-occidental": makeSouthCorridorRoute(3, "alta", "in"),
  "tribuna-sur-occidental|general-sur-baja": makeSouthCorridorRoute(3, "baja", "out"),
  "general-sur-baja|tribuna-sur-occidental": makeSouthCorridorRoute(3, "baja", "in"),
  "palco-sur-occidental|general-sur-alta":   makeSouthCorridorRoute(2, "alta", "out"),
  "general-sur-alta|palco-sur-occidental":   makeSouthCorridorRoute(2, "alta", "in"),
  "palco-sur-occidental|general-sur-baja":   makeSouthCorridorRoute(2, "baja", "out"),
  "general-sur-baja|palco-sur-occidental":   makeSouthCorridorRoute(2, "baja", "in"),
  "plazoleta|general-sur-alta":              makeSouthCorridorRoute(1, "alta", "out"),
  "general-sur-alta|plazoleta":              makeSouthCorridorRoute(1, "alta", "in"),
  "plazoleta|general-sur-baja":              makeSouthCorridorRoute(1, "baja", "out"),
  "general-sur-baja|plazoleta":              makeSouthCorridorRoute(1, "baja", "in"),

  // ── Corredor Sur → Oriental: {P1, P2, P3} ↔ {P5, P6} vía Cacica Quilago → Alta → Baja (interno) ──
  "tribuna-sur-occidental|tribuna-sur-oriental": makeEastCorridorRoute(3, 5, "out"),
  "tribuna-sur-oriental|tribuna-sur-occidental": makeEastCorridorRoute(3, 5, "in"),
  "tribuna-sur-occidental|palco-sur-oriental":   makeEastCorridorRoute(3, 6, "out"),
  "palco-sur-oriental|tribuna-sur-occidental":   makeEastCorridorRoute(3, 6, "in"),
  "palco-sur-occidental|tribuna-sur-oriental":   makeEastCorridorRoute(2, 5, "out"),
  "tribuna-sur-oriental|palco-sur-occidental":   makeEastCorridorRoute(2, 5, "in"),
  "palco-sur-occidental|palco-sur-oriental":     makeEastCorridorRoute(2, 6, "out"),
  "palco-sur-oriental|palco-sur-occidental":     makeEastCorridorRoute(2, 6, "in"),
  "plazoleta|tribuna-sur-oriental":              makeEastCorridorRoute(1, 5, "out"),
  "tribuna-sur-oriental|plazoleta":              makeEastCorridorRoute(1, 5, "in"),
  "plazoleta|palco-sur-oriental":                makeEastCorridorRoute(1, 6, "out"),
  "palco-sur-oriental|plazoleta":                makeEastCorridorRoute(1, 6, "in"),

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

  // ── RUTA 2b: General Norte Occidental (P9) ↔ Palco Norte Occidental (P11) ──
  //    Mismo enlace por la Puerta 9W; a P11 se llega internamente vía Puerta 10-11.
  "general-norte-occidental|palco-norte-occidental": (lang) => {
    const path = [
      PT.p9OccSeat, PT.p9OccJunction, PT.p9wExterior, PT.p1011Exterior, PT.p1011Corner, PT.p10Seat, PT.p11Seat,
    ]
    const steps: RouteStep[] =
      lang === "es"
        ? [
            { type: "start",    instruction: "General Norte Occidental", detail: "Puerta 9", icon: "pin" },
            { type: "external", instruction: "Sal por la Puerta 9W", icon: "exit" },
            { type: "external", instruction: "Camina por H. Vans Risn", icon: "walk" },
            { type: "external", instruction: "Ingresa por la Puerta 10-11", icon: "enter" },
            { type: "internal", instruction: "Camina hasta la Puerta 11", icon: "walk" },
            { type: "arrive",   instruction: "Palco Norte Occidental", detail: "Puerta 11", icon: "flag" },
          ]
        : [
            { type: "start",    instruction: "North West General", detail: "Gate 9", icon: "pin" },
            { type: "external", instruction: "Exit through Gate 9W", icon: "exit" },
            { type: "external", instruction: "Walk along H. Vans Risn", icon: "walk" },
            { type: "external", instruction: "Enter through Gate 10-11", icon: "enter" },
            { type: "internal", instruction: "Walk to Gate 11", icon: "walk" },
            { type: "arrive",   instruction: "North West Box", detail: "Gate 11", icon: "flag" },
          ]
    return { steps, totalSteps: steps.length, usesExterior: true, gateTrace: [9, 10, 11], specialPath: path, specialMeters: metersOf(path) }
  },
  "palco-norte-occidental|general-norte-occidental": (lang) => {
    const path = [
      PT.p11Seat, PT.p10Seat, PT.p1011Corner, PT.p1011Exterior, PT.p9wExterior, PT.p9OccJunction, PT.p9OccSeat,
    ]
    const steps: RouteStep[] =
      lang === "es"
        ? [
            { type: "start",    instruction: "Palco Norte Occidental", detail: "Puerta 11", icon: "pin" },
            { type: "internal", instruction: "Camina hasta la Puerta 10-11", icon: "walk" },
            { type: "external", instruction: "Sal por la Puerta 10-11", icon: "exit" },
            { type: "external", instruction: "Camina por H. Vans Risn", icon: "walk" },
            { type: "external", instruction: "Ingresa por la Puerta 9W", icon: "enter" },
            { type: "arrive",   instruction: "General Norte Occidental", detail: "Puerta 9", icon: "flag" },
          ]
        : [
            { type: "start",    instruction: "North West Box", detail: "Gate 11", icon: "pin" },
            { type: "internal", instruction: "Walk to Gate 10-11", icon: "walk" },
            { type: "external", instruction: "Exit through Gate 10-11", icon: "exit" },
            { type: "external", instruction: "Walk along H. Vans Risn", icon: "walk" },
            { type: "external", instruction: "Enter through Gate 9W", icon: "enter" },
            { type: "arrive",   instruction: "North West General", detail: "Gate 9", icon: "flag" },
          ]
    return { steps, totalSteps: steps.length, usesExterior: true, gateTrace: [11, 10, 9], specialPath: path, specialMeters: metersOf(path) }
  },

  // ── RUTA 3 y familia: Norte Occidental {P10, P11} ↔ Sur Occidental {P1, P2, P3} ──
  //    Todas por el exterior (Puerta 10-11 → H. Vans Risn → La Esperanza →
  //    Puerta 1). Generadas con makeWestLoopRoute para que mapa e indicaciones
  //    coincidan siempre. Anulado el paso interno P11 ✖ Plazoleta.
  "tribuna-norte-occidental|plazoleta":              makeWestLoopRoute(10, 1, "n2s"),
  "plazoleta|tribuna-norte-occidental":              makeWestLoopRoute(10, 1, "s2n"),
  "tribuna-norte-occidental|palco-sur-occidental":   makeWestLoopRoute(10, 2, "n2s"),
  "palco-sur-occidental|tribuna-norte-occidental":   makeWestLoopRoute(10, 2, "s2n"),
  "tribuna-norte-occidental|tribuna-sur-occidental": makeWestLoopRoute(10, 3, "n2s"),
  "tribuna-sur-occidental|tribuna-norte-occidental": makeWestLoopRoute(10, 3, "s2n"),
  "palco-norte-occidental|plazoleta":                makeWestLoopRoute(11, 1, "n2s"),
  "plazoleta|palco-norte-occidental":                makeWestLoopRoute(11, 1, "s2n"),
  "palco-norte-occidental|palco-sur-occidental":     makeWestLoopRoute(11, 2, "n2s"),
  "palco-sur-occidental|palco-norte-occidental":     makeWestLoopRoute(11, 2, "s2n"),
  "palco-norte-occidental|tribuna-sur-occidental":   makeWestLoopRoute(11, 3, "n2s"),
  "tribuna-sur-occidental|palco-norte-occidental":   makeWestLoopRoute(11, 3, "s2n"),

  // ── General Norte Occidental (P9) ↔ Sur Occidental {P1, P2, P3} ──
  //    Enlace vertical interno hasta la Puerta 9W → H. Vans Risn → La Esperanza.
  "general-norte-occidental|plazoleta":              makeWestLoopRoute(9, 1, "n2s"),
  "plazoleta|general-norte-occidental":              makeWestLoopRoute(9, 1, "s2n"),
  "general-norte-occidental|palco-sur-occidental":   makeWestLoopRoute(9, 2, "n2s"),
  "palco-sur-occidental|general-norte-occidental":   makeWestLoopRoute(9, 2, "s2n"),
  "general-norte-occidental|tribuna-sur-occidental": makeWestLoopRoute(9, 3, "n2s"),
  "tribuna-sur-occidental|general-norte-occidental": makeWestLoopRoute(9, 3, "s2n"),
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
  // General Norte Occidental (P9) SIEMPRE se entra/sale por la Puerta 9W y
  // Tribuna Norte Occidental (P10) SIEMPRE por la Puerta 10-11; las secciones
  // orientales (P5-P8) se alcanzan por la Puerta 7-8 caminando por H. Vans Risn.
  const westToTramo2 = (target: number) => {
    if (target === 9) {
      steps.push(...ext(10, ["H. Vans Risn"], 9, { exitLabel: "10-11", entryLabel: "9W" }))
    } else {
      steps.push(...ext(10, ["H. Vans Risn"], 8, { exitLabel: "10-11", entryLabel: "7-8" }))
      wi(8, target, TRAMO_2)
    }
  }
  const tramo2ToWest = (source: number) => {
    if (source === 9) {
      steps.push(...ext(9, ["H. Vans Risn"], 10, { exitLabel: "9W", entryLabel: "10-11" }))
    } else {
      wi(source, 8, TRAMO_2)
      steps.push(...ext(8, ["H. Vans Risn"], 10, { exitLabel: "7-8", entryLabel: "10-11" }))
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
