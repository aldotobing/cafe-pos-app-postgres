"use client"

import { useState } from "react"
import { Info, X, BookOpen, Calculator, Target } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"

interface InfoModalProps {
  title: string
  content: {
    what: string
    how: string
    why: string
  }
  buttonClassName?: string
}

function FormattedText({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.split('\n\n')

  return (
    <div className={className}>
      {paragraphs.map((paragraph, pIdx) => {
        const lines = paragraph.split('\n')
        const isFormula = lines.some(l => l.startsWith('Rumus:') || l.startsWith('Contoh:') || l.startsWith('Indikator Warna:'))
        
        if (isFormula) {
          return (
            <div key={pIdx} className="mb-3 last:mb-0">
              {lines.map((line, lIdx) => {
                if (line.startsWith('Rumus:') || line.startsWith('Contoh:') || line.startsWith('Indikator Warna:')) {
                  return <div key={lIdx} className="font-semibold text-foreground mt-2 first:mt-0 text-[11px]">{line}</div>
                }
                if (line.startsWith('•')) {
                  return (
                    <div key={lIdx} className="flex items-start gap-1.5 ml-2 mt-1">
                      <span className="text-muted-foreground">•</span>
                      <span className="flex-1 text-[11px]">{line.slice(1).trim()}</span>
                    </div>
                  )
                }
                if (line.includes('=') && line.includes('Rp')) {
                  return <div key={lIdx} className="font-mono text-[11px] text-foreground ml-2 mt-0.5">{line}</div>
                }
                return line ? <p key={lIdx} className="text-[11px] leading-relaxed">{line}</p> : null
              })}
            </div>
          )
        }

        return (
          <div key={pIdx} className="mb-3 last:mb-0">
            {lines.map((line, lIdx) => {
              if (line.startsWith('•')) {
                return (
                  <div key={lIdx} className="flex items-start gap-1.5 ml-2 mt-1.5 first:mt-0">
                    <span className="text-muted-foreground">•</span>
                    <span className="flex-1 text-[11px] leading-relaxed">{line.slice(1).trim()}</span>
                  </div>
                )
              }
              return line ? <p key={lIdx} className="text-[11px] leading-relaxed">{line}</p> : null
            })}
          </div>
        )
      })}
    </div>
  )
}

const sectionConfig = {
  what: {
    icon: BookOpen,
    label: "Apa itu",
    color: "primary",
    bgClass: "bg-primary/20",
    textClass: "text-primary",
    sectionBg: "bg-primary/5",
    borderClass: "border-primary/20"
  },
  how: {
    icon: Calculator,
    label: "Bagaimana Cara Hitungnya",
    color: "blue",
    bgClass: "bg-blue-500/20",
    textClass: "text-blue-500",
    sectionBg: "bg-blue-500/5",
    borderClass: "border-blue-500/20"
  },
  why: {
    icon: Target,
    label: "Mengapa Ini Penting",
    color: "emerald",
    bgClass: "bg-emerald-500/20",
    textClass: "text-emerald-500",
    sectionBg: "bg-emerald-500/5",
    borderClass: "border-emerald-500/20"
  }
}

function SectionIcon({ type, className }: { type: 'what' | 'how' | 'why'; className?: string }) {
  const config = sectionConfig[type]
  const Icon = config.icon
  
  return (
    <div className={`relative ${className}`}>
      <div className={`absolute inset-0 ${config.bgClass} blur-md rounded-full opacity-50`} />
      <div className={`relative h-8 w-8 rounded-lg ${config.bgClass} flex items-center justify-center`}>
        <Icon className={`h-4 w-4 ${config.textClass}`} />
      </div>
    </div>
  )
}

export function InfoModal({ title, content, buttonClassName }: InfoModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`text-muted-foreground hover:text-foreground transition-colors ${buttonClassName || ""}`}
        aria-label={`Info ${title}`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[90]"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[90vw] max-w-sm bg-card border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  {title}
                </h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {/* Apa */}
                <section>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <SectionIcon type="what" />
                    <h4 className="font-semibold text-primary text-xs">{sectionConfig.what.label} {title}?</h4>
                  </div>
                  <FormattedText text={content.what} className="text-muted-foreground pl-12 -mt-1" />
                </section>

                {/* Bagaimana */}
                <section>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <SectionIcon type="how" />
                    <h4 className="font-semibold text-blue-500 text-xs">{sectionConfig.how.label}?</h4>
                  </div>
                  <FormattedText text={content.how} className="text-muted-foreground pl-12 -mt-1" />
                </section>

                {/* Mengapa */}
                <section>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <SectionIcon type="why" />
                    <h4 className="font-semibold text-emerald-500 text-xs">{sectionConfig.why.label}?</h4>
                  </div>
                  <FormattedText text={content.why} className="text-muted-foreground pl-12 -mt-1" />
                </section>
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t bg-muted/20 shrink-0">
                <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => setIsOpen(false)}>
                  Mengerti
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
