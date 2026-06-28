"use client"

import {
  type StadiumSection,
  getSectionTypeLabel,
  getSectionDescription,
  translateCapacity,
  translateSubsections,
  translateAccess,
  translateAmenity,
} from "@/lib/stadium-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"

interface SectionDetailProps {
  section: StadiumSection
  onClose: () => void
}

export function SectionDetail({ section, onClose }: SectionDetailProps) {
  const { language, t } = useLanguage()

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
              {getSectionTypeLabel(section.type, language)}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{getSectionDescription(section, language)}</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-medium">{t("access")}</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{translateAccess(section.access, language)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">{t("capacity")}</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{translateCapacity(section.capacity, language)}</p>
          </div>
        </div>

        {section.subsections && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t("sections")}</p>
            <p className="text-sm font-semibold text-foreground">{translateSubsections(section.subsections, language)}</p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t("includedServices")}</p>
          <div className="flex flex-wrap gap-2">
            {section.amenities.map((amenity, index) => (
              <Badge key={index} variant="secondary" className="text-xs flex items-center gap-1">
                <Check className="w-3 h-3" />
                {translateAmenity(amenity, language)}
              </Badge>
            ))}
          </div>
        </div>


      </CardContent>
    </Card>
  )
}
