import * as React from "react"
import { IconInfoCircle } from "@tabler/icons-react"

interface NoteBannerProps {
  message: string
}

export function NoteBanner({ message }: NoteBannerProps) {
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
    >
      <IconInfoCircle
        className="mt-0.5 size-4 shrink-0 text-blue-500 dark:text-blue-400"
        aria-hidden="true"
      />
      <p>{message}</p>
    </div>
  )
}
