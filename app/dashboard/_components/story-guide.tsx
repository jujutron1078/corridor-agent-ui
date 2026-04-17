"use client"

import { useState, useEffect, useCallback } from "react"
import {
  IconArrowRight,
  IconArrowLeft,
  IconX,
  IconRoute,
  IconFlame,
  IconArrowsExchange,
  IconCoin,
  IconBulb,
  IconMapPin,
} from "@tabler/icons-react"
import type { LayerVisibility } from "@/components/interactive-map-page"

interface StoryStep {
  title: string
  description: string
  icon: typeof IconRoute
  iconColor: string
  /** Which layers to show during this step */
  layers: Partial<LayerVisibility>
  /** Where to point the user's attention */
  spotlight?: "map" | "sidebar" | "slider" | "layers"
}

const STORY_STEPS: StoryStep[] = [
  {
    title: "The Lagos-Abidjan Corridor",
    description:
      "You're looking at a 1,080 km economic corridor connecting Lagos, Nigeria to Abidjan, Cote d'Ivoire — passing through Benin, Togo, and Ghana. This route serves 173 million people and is one of West Africa's most important trade arteries. The blue line is the corridor centerline, and the shaded area is the 50km buffer zone where economic activity is concentrated.",
    icon: IconRoute,
    iconColor: "#3b82f6",
    layers: { corridor: true, nodes: true, nightlights: true, tradeFlows: false, investments: false, conflict: false },
  },
  {
    title: "Nighttime Lights = Economic Activity",
    description:
      "The satellite imagery beneath the map shows nighttime lights from NASA's VIIRS sensor. Brighter areas indicate more economic activity — cities, industrial zones, ports. Notice how Lagos glows intensely, while stretches between cities are dark. These dark gaps represent infrastructure investment opportunities.",
    icon: IconBulb,
    iconColor: "#fbbf24",
    layers: { corridor: true, nodes: true, nightlights: true, tradeFlows: false, investments: false, conflict: false },
  },
  {
    title: "13 Corridor Nodes",
    description:
      "The white dots mark the 13 key nodes along the corridor — from Lagos through border crossings (Seme, Hilacondji, Aflao), major cities (Cotonou, Lomé, Accra), and ports (Tema, Takoradi) to Abidjan. Click any node to see port throughput, infrastructure capacity, policy environment, and manufacturing activity.",
    icon: IconMapPin,
    iconColor: "#ffffff",
    layers: { corridor: true, nodes: true, nightlights: true, tradeFlows: false, investments: false, conflict: false },
  },
  {
    title: "Trade Flows",
    description:
      "The colored arcs show commodity trade flowing from corridor countries to global markets. Arc thickness represents trade value — thicker means more money. Colors indicate commodity type: brown for cocoa, gold for gold, blue for fish. These flows represent the economic engine that infrastructure investment would accelerate.",
    icon: IconArrowsExchange,
    iconColor: "#60a5fa",
    layers: { corridor: true, nodes: true, nightlights: true, tradeFlows: true, investments: false, conflict: false },
  },
  {
    title: "Infrastructure Investments",
    description:
      "The colored circles show active and planned infrastructure projects along the corridor. Green = committed funding, amber = in pipeline, purple = planned. Circle size reflects project cost. These represent billions in development finance flowing into roads, energy, ports, and digital infrastructure.",
    icon: IconCoin,
    iconColor: "#34d399",
    layers: { corridor: true, nodes: true, nightlights: true, tradeFlows: false, investments: true, conflict: false },
  },
  {
    title: "Conflict & Risk",
    description:
      "The red heatmap shows conflict event density from ACLED data. Hotter (redder) areas have more incidents and fatalities. This is the risk layer investors need — understanding security conditions is essential for project planning, insurance pricing, and due diligence. Hover over red zones to see event details.",
    icon: IconFlame,
    iconColor: "#f87171",
    layers: { corridor: true, nodes: true, nightlights: true, tradeFlows: false, investments: false, conflict: true },
  },
  {
    title: "The Full Picture",
    description:
      "Now you're seeing all layers together — trade opportunity, investment activity, and risk in one view. Use the time slider at the bottom to scrub through years and watch the corridor evolve. The KPI cards on the left track GDP growth, FDI, trade volume, conflict events, and infrastructure readiness. Use the layer toggles (top-right) to focus on what matters to you.",
    icon: IconRoute,
    iconColor: "#3b82f6",
    layers: { corridor: true, nodes: true, nightlights: true, tradeFlows: true, investments: true, conflict: true },
  },
]

interface StoryGuideProps {
  onLayerChange: (layers: LayerVisibility) => void
  defaultLayers: LayerVisibility
  onDismiss?: () => void
}

export function StoryGuide({ onLayerChange, defaultLayers, onDismiss }: StoryGuideProps) {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true
    return !localStorage.getItem("corridor:dashboard:story-seen")
  })

  const currentStep = STORY_STEPS[step]

  // Apply layer visibility for current step
  useEffect(() => {
    if (!visible || !currentStep) return
    onLayerChange({
      ...defaultLayers,
      ...currentStep.layers,
    } as LayerVisibility)
  }, [step, visible]) // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => {
    if (step < STORY_STEPS.length - 1) {
      setStep(step + 1)
    } else {
      dismiss()
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const prev = useCallback(() => {
    if (step > 0) setStep(step - 1)
  }, [step])

  const dismiss = useCallback(() => {
    setVisible(false)
    localStorage.setItem("corridor:dashboard:story-seen", "1")
    // Restore all layers
    onLayerChange(defaultLayers)
    onDismiss?.()
  }, [onLayerChange, defaultLayers, onDismiss])

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault()
        next()
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        prev()
      }
      if (e.key === "Escape") dismiss()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [visible, next, prev, dismiss])

  if (!visible || !currentStep) return null

  const Icon = currentStep.icon
  const isLast = step === STORY_STEPS.length - 1

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div className="pointer-events-none absolute inset-0 z-40 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      {/* Story card */}
      <div className="absolute bottom-24 left-1/2 z-50 w-[min(520px,calc(100%-2rem))] -translate-x-1/2">
        <div className="rounded-2xl border border-white/10 bg-black/85 p-6 shadow-2xl backdrop-blur-xl">
          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute right-3 top-3 rounded-md p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/60"
            aria-label="Skip guide"
          >
            <IconX size={16} />
          </button>

          {/* Step indicator */}
          <div className="mb-4 flex items-center gap-1.5">
            {STORY_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-6 bg-blue-400"
                    : i < step
                      ? "w-3 bg-blue-400/40"
                      : "w-3 bg-white/10"
                }`}
              />
            ))}
            <span className="ml-auto text-xs text-white/30">
              {step + 1} / {STORY_STEPS.length}
            </span>
          </div>

          {/* Content */}
          <div className="flex gap-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${currentStep.iconColor}20` }}
            >
              <Icon size={20} style={{ color: currentStep.iconColor }} />
            </div>
            <div className="min-w-0">
              <h3 className="mb-2 text-base font-semibold text-white">
                {currentStep.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/60">
                {currentStep.description}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={dismiss}
              className="text-xs text-white/30 transition-colors hover:text-white/50"
            >
              Skip guide
            </button>
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={prev}
                  className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <IconArrowLeft size={14} />
                  Back
                </button>
              )}
              <button
                onClick={next}
                className="flex items-center gap-1 rounded-lg bg-blue-500 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-400"
              >
                {isLast ? "Explore" : "Next"}
                <IconArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * Small button to re-trigger the story guide.
 */
export function StoryGuideButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-24 right-4 z-20 flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-950/70 px-4 py-2.5 text-xs font-medium text-blue-300 backdrop-blur-md transition-all hover:border-blue-400/50 hover:bg-blue-900/70 hover:text-blue-200"
      title="Replay corridor guide"
    >
      <IconRoute size={16} />
      Replay Guide
    </button>
  )
}
