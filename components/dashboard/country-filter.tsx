"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CORRIDOR_COUNTRIES = [
  { value: "all", label: "All Countries" },
  { value: "BEN", label: "BEN" },
  { value: "CIV", label: "CIV" },
  { value: "GHA", label: "GHA" },
  { value: "NGA", label: "NGA" },
  { value: "TGO", label: "TGO" },
] as const

export type CorridorCountry = (typeof CORRIDOR_COUNTRIES)[number]["value"]

interface CountryFilterProps {
  value: CorridorCountry
  onChange: (value: CorridorCountry) => void
}

export function CountryFilter({ value, onChange }: CountryFilterProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as CorridorCountry)}
    >
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Select country" />
      </SelectTrigger>
      <SelectContent>
        {CORRIDOR_COUNTRIES.map((country) => (
          <SelectItem key={country.value} value={country.value}>
            {country.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
