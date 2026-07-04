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
// TRAMO_3 incluye P2 como nodo compartido con TRAMO_1
// La Plazoleta (gate=1) es el nodo intermediario entre P11 y P2
const TRAMO_1 = [2, 3]               // Occidental Sur
const TRAMO_2 = [5, 6, 7, 8, 9]     // Oriental completo
const TRAMO_3 = [2, 1, 11, 10]      // Occidental Norte: P2 ↔ Plazoleta(P1) ↔ P11 ↔ P10

function inTramo1(g: number) { return TRAMO_1.includes(g) }
function inTramo2(g: number) { return TRAMO_2.includes(g) }
function inTramo3(g: number) { return TRAMO_3.includes(g) }
// P2 está en ambos TRAMO_1 y TRAMO_3 (es el nodo de unión)

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

  // ── TRAMO_1 ↔ TRAMO_3 vía nodo P2 (pasillo interior) ────
  if (inTramo1(from) && inTramo3(to) && to !== 2) {
    wi(from, 2, TRAMO_1)
    wi(2, to, TRAMO_3)
    return { steps, trace }
  }
  if (inTramo3(from) && inTramo1(to) && from !== 2) {
    wi(from, 2, TRAMO_3)
    wi(2, to, TRAMO_1)
    return { steps, trace }
  }

  // ── Plazoleta (gate=1): el usuario YA está en la plazoleta, no caminar hasta P2 ─
  // Tratar la plazoleta como si fuera el nodo P2 para seguir hacia otros tramos,
  // con el paso "Pasa por la Plazoleta" ya implícito en el origen.

  if (from === PLAZOLETA_GATE && inTramo2(to)) {
    if (to <= 6) {
      // Plazoleta → P2 → P3 → exterior Cacica Quilago → P5/P6
      wi(PLAZOLETA_GATE, 2, TRAMO_3)   // "De Puerta 1 a Puerta 2" — solo 1 segmento corto
      wi(2, 3, TRAMO_1)
      steps.push(...ext(3, ["Calle Cacica Quilago"], to))
    } else {
      // Plazoleta → P11 → P10 → exterior H. Vans Risn → destino (P9 o Puerta 7-8)
      wi(PLAZOLETA_GATE, 10, TRAMO_3)
      westToTramo2(to)
    }
    return { steps, trace }
  }
  if (inTramo2(from) && to === PLAZOLETA_GATE) {
    if (from <= 6) {
      wi(from, 5, TRAMO_2)
      steps.push(...ext(5, ["Calle Cacica Quilago"], 3))
      wi(3, 2, TRAMO_1)
    } else {
      tramo2ToWest(from)
      wi(10, PLAZOLETA_GATE, TRAMO_3)
      return { steps, trace }
    }
    wi(2, PLAZOLETA_GATE, TRAMO_3)
    return { steps, trace }
  }

  // ── Plazoleta ↔ TRAMO_1: ir hacia P2 y continuar ────────────────────────
  if (from === PLAZOLETA_GATE && inTramo1(to)) {
    wi(PLAZOLETA_GATE, 2, TRAMO_3)
    wi(2, to, TRAMO_1)
    return { steps, trace }
  }
  if (inTramo1(from) && to === PLAZOLETA_GATE) {
    wi(from, 2, TRAMO_1)
    wi(2, PLAZOLETA_GATE, TRAMO_3)
    return { steps, trace }
  }

  // ── Plazoleta ↔ P4 ───────────────────────────────────────────────────────
  if (from === PLAZOLETA_GATE && to === 4) {
    wi(PLAZOLETA_GATE, 2, TRAMO_3)
    wi(2, 3, TRAMO_1)
    steps.push(...ext(3, ["Calle Cacica Quilago"], 4))
    return { steps, trace }
  }
  if (from === 4 && to === PLAZOLETA_GATE) {
    steps.push(...ext(4, ["Calle Cacica Quilago"], 3))
    wi(3, 2, TRAMO_1)
    wi(2, PLAZOLETA_GATE, TRAMO_3)
    return { steps, trace }
  }

  // ── P2 (Palco Sur Occidental) ↔ TRAMO_2 NORTE (P7/P8/P9): vía Plazoleta ──
  // Desde P2 hacia el norte oriental, la ruta natural es por la Plazoleta →
  // P11 → P10 → exterior (Hermensz) → P9. (Las secciones del sur oriental,
  // P5/P6, siguen saliendo por P3 en el bloque TRAMO_1 ↔ TRAMO_2 de abajo.)
  if (from === 2 && inTramo2(to) && to > 6) {
    wi(2, 10, TRAMO_3)
    westToTramo2(to)
    return { steps, trace }
  }
  if (inTramo2(from) && from > 6 && to === 2) {
    tramo2ToWest(from)
    wi(10, 2, TRAMO_3)
    return { steps, trace }
  }

  // ── TRAMO_2 ↔ TRAMO_3: P9 ↔ P10 por Hermensz ───────────
  // P2 se excluye (to/from !== 2) porque, aunque pertenece a TRAMO_3, su
  // salida natural hacia el oriente es por el sur (P3 → Cacica Quilago),
  // no por el norte/Plazoleta. Cae al bloque TRAMO_1 ↔ TRAMO_2.
  if (inTramo2(from) && inTramo3(to) && to !== 2) {
    tramo2ToWest(from)
    wi(10, to, TRAMO_3)
    return { steps, trace }
  }
  if (inTramo3(from) && inTramo2(to) && from !== 2) {
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
  if (from === 4 && (inTramo1(to) || inTramo3(to))) {
    steps.push(...ext(4, ["Calle Cacica Quilago"], 3))
    if (inTramo3(to)) { wi(3, 2, TRAMO_1); wi(2, to, TRAMO_3) }
    else wi(3, to, TRAMO_1)
    return { steps, trace }
  }
  if (to === 4 && (inTramo1(from) || inTramo3(from))) {
    if (inTramo3(from)) { wi(from, 2, TRAMO_3); wi(2, 3, TRAMO_1) }
    else wi(from, 3, TRAMO_1)
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
