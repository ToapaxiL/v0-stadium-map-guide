"use client"

import { type StadiumSection, sectionTypeLabels } from "@/lib/stadium-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SectionDetailProps {
  section: StadiumSection
  onClose: () => void
}

export function SectionDetail({ section, onClose }: SectionDetailProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${section.color}`} />
              <CardTitle className="text-xl font-bold text-foreground">{section.name}</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {sectionTypeLabels[section.type]}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{section.description}</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-medium">Acceso</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{section.access}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">Capacidad</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{section.capacity}</p>
          </div>
        </div>

        {section.subsections && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Secciones</p>
            <p className="text-sm font-semibold text-foreground">{section.subsections}</p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Servicios incluidos</p>
          <div className="flex flex-wrap gap-2">
            {section.amenities.map((amenity, index) => (
              <Badge key={index} variant="secondary" className="text-xs flex items-center gap-1">
                <Check className="w-3 h-3" />
                {amenity}
              </Badge>
            ))}
          </div>
        </div>


      </CardContent>
    </Card>
  )
}
