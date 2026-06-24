"use client"

import { useState, useEffect } from "react"
import { calculateRoute, getSectionName, ALL_SECTIONS, type RouteResult, type RouteStep } from "@/lib/navigation"
import { Navigation, ArrowUpDown, MapPin, Footprints, DoorOpen, DoorClosed, Flag, TriangleAlert, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { StadiumRouteMap } from "./stadium-route-map"
import { useLanguage } from "@/lib/language-context"

function StepIcon({ icon }: { icon: RouteStep["icon"] }) {
  const cls = "w-4 h-4 shrink-0"
  if (icon === "pin")   return <MapPin className={cls} />
  if (icon === "exit")  return <DoorOpen className={cls} />
  if (icon === "enter") return <DoorClosed className={cls} />
  if (icon === "flag")  return <Flag className={cls} />
  return <Footprints className={cls} />
}

const STEP_CONFIG = {
  start: {
    dot: "bg-emerald-500", ring: "ring-emerald-500/20",
    icon: "text-emerald-500", bar: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50",
  },
  internal: {
    dot: "bg-muted-foreground/40", ring: "ring-muted/20",
    icon: "text-muted-foreground", bar: "bg-muted-foreground/30",
    text: "text-foreground",
    bg: "bg-muted/30 border-border",
  },
  external: {
    dot: "bg-amber-500", ring: "ring-amber-500/20",
    icon: "text-amber-500", bar: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50",
  },
  arrive: {
    dot: "bg-primary", ring: "ring-primary/20",
    icon: "text-primary", bar: "bg-primary",
    text: "text-primary",
    bg: "bg-primary/5 border-primary/20",
  },
}

// Custom Select nativo para garantizar ancho completo
function NativeSelect({
  value,
  onChange,
  placeholder,
  lang = "es",
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  lang?: "es" | "en"
}) {
  const sections = ALL_SECTIONS.map(id => ({ id, name: getSectionName(id, lang) }))
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          "w-full appearance-none h-12 px-4 pr-10 rounded-xl border text-sm font-medium",
          "bg-background border-border text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
          "transition-all cursor-pointer",
          !value && "text-muted-foreground"
        )}
      >
        <option value="" disabled>{placeholder}</option>
        {sections.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    </div>
  )
}

export function NavigationGuide({ onRouteChange }: { onRouteChange?: (hasRoute: boolean) => void }) {
  const { language } = useLanguage()
  const [from, setFrom] = useState("")
  const [to, setTo]     = useState("")
  const [result, setResult] = useState<RouteResult | null>(null)

  // Notifica al contenedor si hay una ruta calculada (para ocultar el mapa general)
  useEffect(() => {
    onRouteChange?.(!!result)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  const handleSwap = () => {
    setFrom(to)
    setTo(from)
    setResult(null)
  }

  const handleCalculate = () => {
    if (!from || !to || from === to) return
    setResult(calculateRoute(from, to, language))
  }

  // Vuelve a calcular la ruta (y sus indicaciones traducidas) al cambiar el idioma
  useEffect(() => {
    if (result && from && to && from !== to) {
      setResult(calculateRoute(from, to, language))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  const handleClear = () => {
    setFrom("")
    setTo("")
    setResult(null)
  }

  const canCalculate = !!from && !!to && from !== to

  return (
    <div className="space-y-4">
      {/* Panel principal */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Navigation className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground leading-tight">
              {language === "es" ? "¿A dónde quieres ir?" : "Where do you want to go?"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {language === "es" ? "Calcula tu ruta dentro del estadio" : "Calculate your route inside the stadium"}
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* Origen */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              {language === "es" ? "¿Dónde estás ahora?" : "Where are you now?"}
            </label>
            <NativeSelect
              value={from}
              onChange={v => { setFrom(v); setResult(null) }}
              placeholder={language === "es" ? "Selecciona tu ubicación actual" : "Select your current location"}
              lang={language}
            />
          </div>

          {/* Botón swap */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <button
              onClick={handleSwap}
              disabled={!from && !to}
              className={cn(
                "w-9 h-9 rounded-full border border-border bg-background flex items-center justify-center",
                "text-muted-foreground hover:text-foreground hover:bg-muted hover:border-primary/40",
                "transition-all disabled:opacity-30 disabled:cursor-not-allowed",
                "focus:outline-none focus:ring-2 focus:ring-primary/40"
              )}
              title={language === "es" ? "Intercambiar origen y destino" : "Swap origin and destination"}
              aria-label={language === "es" ? "Intercambiar" : "Swap"}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Destino */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
              {language === "es" ? "¿A dónde quieres ir?" : "Where do you want to go?"}
            </label>
            <NativeSelect
              value={to}
              onChange={v => { setTo(v); setResult(null) }}
              placeholder={language === "es" ? "Selecciona tu destino" : "Select your destination"}
              lang={language}
            />
          </div>

          {/* Aviso misma sección */}
          {from && to && from === to && (
            <p className="text-xs text-center text-muted-foreground bg-muted/50 rounded-xl py-2.5 px-3 border border-border">
              {language === "es" ? "El origen y el destino son la misma sección." : "Origin and destination are the same section."}
            </p>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCalculate}
              disabled={!canCalculate}
              className={cn(
                "flex-1 h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                "focus:outline-none focus:ring-2 focus:ring-primary/50"
              )}
            >
              <Navigation className="w-4 h-4" />
              {language === "es" ? "Calcular ruta" : "Calculate route"}
            </button>
            {(from || to || result) && (
              <button
                onClick={handleClear}
                className={cn(
                  "h-12 px-5 rounded-xl border border-border bg-background",
                  "text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted",
                  "transition-all focus:outline-none focus:ring-2 focus:ring-border"
                )}
              >
                {language === "es" ? "Limpiar" : "Clear"}
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Mapa de ruta SVG */}
      {result && <StadiumRouteMap result={result} />}

      {/* Resultado pasos */}
      {result && (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

          {/* Header resultado */}
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-semibold">
                  {language === "es" ? "Ruta calculada" : "Calculated route"}
                </p>
                <p className="text-sm font-bold text-foreground leading-snug">
                  {getSectionName(result.from, language)}
                  <span className="text-muted-foreground font-normal mx-2">→</span>
                  {getSectionName(result.to, language)}
                </p>
              </div>
              {result.usesExterior && (
                <span className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                  <TriangleAlert className="w-3 h-3" />
                  {language === "es" ? "Exterior" : "Exterior"}
                </span>
              )}
            </div>
          </div>

          {/* Pasos */}
          <div className="p-4 space-y-1.5">
            {result.steps.map((step, i) => {
              const cfg = STEP_CONFIG[step.type]
              const isLast = i === result.steps.length - 1
              return (
                <div key={i} className="flex gap-3">
                  {/* Línea vertical + dot */}
                  <div className="flex flex-col items-center shrink-0 w-5">
                    <div className={cn("w-2.5 h-2.5 rounded-full ring-4 mt-3.5 shrink-0", cfg.dot, cfg.ring)} />
                    {!isLast && <div className={cn("w-px flex-1 mt-1", cfg.bar, "opacity-30")} />}
                  </div>

                  {/* Contenido */}
                  <div className={cn("flex-1 flex items-start justify-between gap-2 rounded-xl border px-3.5 py-3 mb-1.5", cfg.bg)}>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-semibold leading-snug", cfg.text)}>
                        {step.instruction}
                      </p>
                      {step.detail && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {step.detail}
                        </p>
                      )}
                    </div>
                    <div className={cn("mt-0.5 shrink-0", cfg.icon)}>
                      <StepIcon icon={step.icon} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
