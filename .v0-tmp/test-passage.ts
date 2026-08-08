import { calculateRoute } from "../lib/navigation"

const west = ["plazoleta", "palco-sur-occidental", "tribuna-sur-occidental"]
const dests = [
  "general-sur-alta",
  "general-sur-baja",
  "tribuna-sur-oriental",
  "palco-sur-oriental",
  "palco-norte-oriental",
  "tribuna-norte-oriental",
]

let failures = 0
for (const a of west) {
  for (const b of dests) {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ]) {
      const r = calculateRoute(from, to, "es")
      const hasExternal = r.steps.some((s) => s.type === "external")
      const meters = r.specialMeters ?? -1
      const pts = r.specialPath?.length ?? 0
      const ok = !hasExternal && r.usesExterior === false && meters % 50 === 0
      if (!ok) {
        failures++
        console.log(`[FAIL] ${from} -> ${to} | external=${hasExternal} usesExterior=${r.usesExterior} meters=${meters} pts=${pts}`)
        console.log("   pasos:", r.steps.map((s) => `${s.type}:${s.instruction}`).join(" | "))
      } else {
        console.log(`[ok]   ${from} -> ${to} | meters=${meters} pts=${pts} steps=${r.steps.length}`)
      }
    }
  }
}

// Muestra detallado de una ruta clave para revisión manual
console.log("\n=== Detalle: tribuna-sur-occidental -> general-sur-baja ===")
for (const s of calculateRoute("tribuna-sur-occidental", "general-sur-baja", "es").steps) {
  console.log(` - [${s.type}] ${s.instruction}${s.detail ? ` (${s.detail})` : ""}`)
}
console.log("\n=== Detalle: general-sur-alta -> tribuna-sur-occidental ===")
for (const s of calculateRoute("general-sur-alta", "tribuna-sur-occidental", "es").steps) {
  console.log(` - [${s.type}] ${s.instruction}${s.detail ? ` (${s.detail})` : ""}`)
}

console.log(`\nTOTAL FAILURES: ${failures}`)
