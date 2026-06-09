"use client"

import { useState, useRef, useEffect, type TouchEvent, type MouseEvent } from "react"
import Image from "next/image"
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"

interface ZoomableImageProps {
  src: string
  alt: string
  onClose: () => void
}

export function ZoomableImage({ src, alt, onClose }: ZoomableImageProps) {
  const { t } = useLanguage()
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const lastTouchDistance = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const minScale = 1
  const maxScale = 4

  const resetZoom = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, maxScale))
  }

  const zoomOut = () => {
    setScale((prev) => {
      const newScale = Math.max(prev - 0.5, minScale)
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 })
      }
      return newScale
    })
  }

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      lastTouchDistance.current = distance
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      })
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      e.preventDefault()
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      const delta = distance - lastTouchDistance.current
      const scaleChange = delta * 0.01

      setScale((prev) => {
        const newScale = Math.min(Math.max(prev + scaleChange, minScale), maxScale)
        if (newScale === 1) {
          setPosition({ x: 0, y: 0 })
        }
        return newScale
      })

      lastTouchDistance.current = distance
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      const newX = e.touches[0].clientX - dragStart.x
      const newY = e.touches[0].clientY - dragStart.y
      setPosition({ x: newX, y: newY })
    }
  }

  const handleTouchEnd = () => {
    lastTouchDistance.current = null
    setIsDragging(false)
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && scale > 1) {
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      setPosition({ x: newX, y: newY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setScale((prev) => {
        const newScale = Math.min(Math.max(prev + delta, minScale), maxScale)
        if (newScale === 1) {
          setPosition({ x: 0, y: 0 })
        }
        return newScale
      })
    }

    container.addEventListener("wheel", handleWheel, { passive: false })
    return () => container.removeEventListener("wheel", handleWheel)
  }, [])

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === containerRef.current && scale === 1) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" onClick={handleBackdropClick}>
      <div className="flex items-center justify-between p-4 bg-black/50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={zoomOut}
            disabled={scale <= minScale}
          >
            <ZoomOut className="w-5 h-5" />
          </Button>
          <span className="text-white text-sm min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={zoomIn}
            disabled={scale >= maxScale}
          >
            <ZoomIn className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={resetZoom}
            disabled={scale === 1}
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onClose}>
          <X className="w-6 h-6" />
        </Button>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="relative w-full h-full max-w-6xl max-h-[85vh] transition-transform duration-100"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          }}
        >
          <Image
            src={src || "/placeholder.svg"}
            alt={alt}
            fill
            className="object-contain select-none"
            priority
            draggable={false}
          />
        </div>
      </div>

      <div className="p-4 text-center">
        <p className="text-white/70 text-sm">{scale === 1 ? t("clickToClose") : t("pinchToZoom")}</p>
      </div>
    </div>
  )
}
