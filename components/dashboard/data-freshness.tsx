import * as React from "react"

import { Badge } from "@/components/ui/badge"

interface DataFreshnessProps {
  date: string
  label?: string
}

export function DataFreshness({ date, label }: DataFreshnessProps) {
  return (
    <Badge variant="secondary" className="gap-1 font-normal">
      {label != null && (
        <span className="text-muted-foreground">{label}:</span>
      )}
      <span>{date}</span>
    </Badge>
  )
}
