"use client"

import { type StadiumSection, sectionTypeLabels } from "@/lib/stadium-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users } from "lucide-react"

interface SectionCardProps {
  section: StadiumSection
  isSelected: boolean
  onClick: () => void
}

export function SectionCard({ section, isSelected, onClick }: SectionCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
        isSelected ? "ring-2 ring-primary border-primary bg-card/80" : "bg-card/40 hover:bg-card/60 border-border/50"
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${section.color}`} />
            <CardTitle className="text-sm font-bold text-foreground leading-tight">{section.name}</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">
            {sectionTypeLabels[section.type]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>{section.access}</span>
        </div>
        {section.subsections && <p className="text-xs text-muted-foreground">Secciones: {section.subsections}</p>}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>{section.capacity}</span>
        </div>
      </CardContent>
    </Card>
  )
}
