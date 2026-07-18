"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { stadiumSections, type StadiumSection, type SectionType } from "@/lib/stadium-data"
import { useLanguage } from "@/lib/language-context"
import { SectionCard } from "./section-card"
import { SectionDetail } from "./section-detail"
import { ZoomableImage } from "./zoomable-image"
import { NavigationGuide } from "./navigation-guide"
import { NearbyMap } from "./nearby-map"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MapIcon, Info, Navigation, Compass, ZoomIn, ChevronDown, Languages, Sun, Moon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function StadiumMap() {
  const { language, setLanguage, t } = useLanguage()
  const [selectedSection, setSelectedSection] = useState<StadiumSection | null>(null)
  const [filter, setFilter] = useState<SectionType | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isZoomed, setIsZoomed] = useState(false)
  const [isHoveringImage, setIsHoveringImage] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDarkMode])
  const [activeTab, setActiveTab] = useState("navigate")
  const [hasActiveRoute, setHasActiveRoute] = useState(false)
  const filteredSections = stadiumSections.filter((section: StadiumSection) => {
    const matchesFilter = filter === "all" || section.type === filter
    const matchesSearch =
      section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.access.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getFilterLabel = (type: SectionType | "all") => {
    if (type === "all") return t("all")
    const labels: Record<SectionType, string> = {
      tribuna: t("tribuna"),
      palco: t("palco"),
      general: t("general"),
    }
    return labels[type]
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setSelectedSection(null)
    setFilter("all")
    setSearchQuery("")
  }

  const handleLogoClick = () => {
    setActiveTab("navigate")
    setSelectedSection(null)
    setFilter("all")
    setSearchQuery("")
  }

  return (
    <div className="min-h-screen bg-background">
      {isZoomed && (
        <ZoomableImage src="/images/mapa-general-final.svg" alt={t("stadiumGuide")} onClose={() => setIsZoomed(false)} />
      )}

      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              <button onClick={handleLogoClick} className="cursor-pointer shrink-0">
                <Image
                  src="/images/logo-20ai26-20horizontal.png"
                  alt="Quito 2026"
                  width={140}
                  height={60}
                  className="h-10 md:h-12 w-auto object-contain"
                />
              </button>
              <div className="border-l border-border pl-3 md:pl-4 min-w-0">
                <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
                  <Compass className="w-5 h-5 md:w-7 md:h-7 text-primary shrink-0" />
                  <span className="truncate">{t("stadiumGuide")}</span>
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground truncate">{t("findYourWay")}</p>
              </div>
            </div>

            <TooltipProvider>
              <div className="flex items-center gap-0.5 md:gap-1 shrink-0 ml-2">
                {/* Language dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9" aria-label={language === "es" ? "Cambiar idioma" : "Change language"}>
                      <Languages className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setLanguage("en")}>
                      English
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLanguage("es")}>
                      Español
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Dark mode toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 md:h-9 md:w-9"
                      onClick={() => setIsDarkMode(!isDarkMode)}
                    >
                      {isDarkMode ? <Sun className="h-4 w-4 md:h-5 md:w-5" /> : <Moon className="h-4 w-4 md:h-5 md:w-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isDarkMode ? (language === "es" ? "Modo claro" : "Light mode") : (language === "es" ? "Modo oscuro" : "Dark mode")}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="navigate" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/80 dark:bg-muted/50 p-1 h-12">
            <TabsTrigger 
              value="navigate" 
              className="gap-2 h-10 text-muted-foreground data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white font-medium transition-all"
            >
              <Navigation className="w-4 h-4" />
              {t("navigate")}
            </TabsTrigger>
            <TabsTrigger 
              value="explore" 
              className="gap-2 h-10 text-muted-foreground data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white font-medium transition-all"
            >
              <MapIcon className="w-4 h-4" />
              {t("explore")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="navigate">
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Columna izquierda: calculadora de rutas */}
              <div className={hasActiveRoute ? "lg:col-span-5" : "lg:col-span-2"}>
                <NavigationGuide onRouteActiveChange={setHasActiveRoute} />
              </div>

              {/* Columna derecha: mapa del estadio (oculto cuando hay una ruta activa) */}
              {!hasActiveRoute && (
              <div className="lg:col-span-3">
                <div className="rounded-xl overflow-hidden border border-border bg-card">
                  <div
                    className="relative cursor-pointer group"
                    onClick={() => setIsZoomed(true)}
                    onMouseEnter={() => setIsHoveringImage(true)}
                    onMouseLeave={() => setIsHoveringImage(false)}
                  >
                    <Image
                      src="/images/mapa-general-final.svg"
                      alt={t("stadiumGuide")}
                      width={2000}
                      height={1334}
                      className="w-full h-auto"
                      priority
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 rounded-full p-3">
                        <ZoomIn className="w-6 h-6 text-foreground" />
                      </div>
                    </div>
                    {isHoveringImage && (
                      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur rounded-lg p-3 border border-border max-w-xs animate-in fade-in duration-200">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground">{t("clickToZoom")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-muted/50 p-4 border-t border-border">
                    <p className="text-sm font-semibold text-foreground mb-3">{t("zones")}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#a4defc" }} />
                        <span className="text-muted-foreground">{t("north")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#fabb10" }} />
                        <span className="text-muted-foreground">{t("south")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#42c15a" }} />
                        <span className="text-muted-foreground">{t("east")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f96969" }} />
                        <span className="text-muted-foreground">{t("west")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="explore">
            {/* Servicios cerca del estadio: chips -> mapa de Google -> lista de lugares */}
            <NearbyMap isDarkMode={isDarkMode} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">{t("copyright")}</p>
        </div>
      </footer>
    </div>
  )
}
