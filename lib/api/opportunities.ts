export type OpportunityData = {
  title: string;
  sector: string;
  sub_sector?: string;
  country: string;
  location: { lat: number; lng: number; name: string };
  bankability_score?: number;
  estimated_value_usd?: number;
  estimated_return_usd?: number;
  employment_impact?: number;
  gdp_multiplier?: number;
  risk_level?: string;
  summary: string;
  analysis_detail?: string;
  data_sources?: string[];
  nearby_infrastructure?: string[];
  thread_id?: string;
};

export type Opportunity = OpportunityData & {
  id: string;
  status: string;
  created_at: string;
  project_id: string;
};

export type OpportunityListResponse = {
  opportunities: Opportunity[];
  total: number;
  sectors: Record<string, number>;
};

/**
 * Parse agent message content for opportunity-json fenced code blocks.
 * Returns an array of parsed opportunity data objects.
 */
/**
 * Normalize agent-generated opportunity JSON to match our schema.
 * The agent sometimes uses different field names — map them.
 */
function normalizeOpportunity(raw: Record<string, unknown>): OpportunityData | null {
  if (!raw.title || !raw.sector) return null;

  // Map alternative field names to our schema
  const bankability = raw.bankability_score;
  let bankabilityScore: number | undefined;
  if (typeof bankability === "number") {
    bankabilityScore = bankability;
  } else if (typeof bankability === "string") {
    // Convert "High"/"Medium"/"Low" to numeric
    const map: Record<string, number> = { high: 0.8, medium: 0.6, low: 0.4 };
    bankabilityScore = map[bankability.toLowerCase()] ?? undefined;
  }

  return {
    title: raw.title as string,
    sector: raw.sector as string,
    sub_sector: (raw.sub_sector as string) ?? undefined,
    country: (raw.country as string) ?? "",
    location: (raw.location as { lat: number; lng: number; name: string }) ?? { lat: 0, lng: 0, name: "" },
    bankability_score: bankabilityScore,
    estimated_value_usd: (raw.estimated_value_usd ?? raw.investment_required_usd ?? raw.investment_usd) as number | undefined,
    estimated_return_usd: (raw.estimated_return_usd ?? raw.annual_value_add_usd ?? raw.annual_return_usd) as number | undefined,
    employment_impact: (raw.employment_impact ?? raw.jobs) as number | undefined,
    gdp_multiplier: raw.gdp_multiplier as number | undefined,
    risk_level: (raw.risk_level ?? raw.risk) as string | undefined,
    summary: (raw.summary ?? raw.rationale ?? "") as string,
    analysis_detail: (raw.analysis_detail ?? raw.analysis ?? "") as string,
    data_sources: (raw.data_sources ?? []) as string[],
    nearby_infrastructure: (raw.nearby_infrastructure ?? []) as string[],
  };
}

export function parseOpportunities(content: string): OpportunityData[] {
  const results: OpportunityData[] = [];

  // Strategy 1: Parse from bridge tool_results (raw tool data — most reliable)
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object") {
      // Bridge format: {"synthesis": "...", "tool_results": [...]}
      const toolResults = parsed.tool_results as Array<{ tool_name: string; content: string }> | undefined;
      if (Array.isArray(toolResults)) {
        for (const tr of toolResults) {
          if (tr.tool_name === "scan_agriculture_opportunities") {
            try {
              const toolData = JSON.parse(tr.content);
              const opps = toolData.opportunities as Array<Record<string, unknown>> | undefined;
              if (Array.isArray(opps)) {
                for (const opp of opps) {
                  const normalized = normalizeOpportunity(opp);
                  if (normalized) results.push(normalized);
                }
              }
            } catch { /* skip */ }
          }
        }
      }
      if (results.length > 0) return results;
    }
  } catch {
    // Not JSON — try other strategies
  }

  // Strategy 2: Parse opportunity-json fenced code blocks from markdown
  const regex = /```opportunity-json\s*\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed && typeof parsed === "object") {
        const normalized = normalizeOpportunity(parsed as Record<string, unknown>);
        if (normalized) results.push(normalized);
      }
    } catch {
      // Skip malformed JSON
    }
  }

  return results;
}

/**
 * Save an opportunity to the backend.
 */
export async function saveOpportunity(
  projectId: string,
  data: OpportunityData
): Promise<Opportunity> {
  const res = await fetch(`/workspace/opportunities/${projectId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to save" }));
    throw new Error(error.detail || "Failed to save opportunity");
  }

  const json = await res.json();
  return json.data as Opportunity;
}

/**
 * List opportunities with optional filters.
 */
export async function listOpportunities(
  projectId: string,
  params?: { sector?: string; country?: string; status?: string }
): Promise<OpportunityListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.sector) searchParams.set("sector", params.sector);
  if (params?.country) searchParams.set("country", params.country);
  if (params?.status) searchParams.set("status", params.status);

  const qs = searchParams.toString();
  const url = `/workspace/opportunities/${projectId}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to list opportunities");
  }

  const json = await res.json();
  return json.data as OpportunityListResponse;
}

/**
 * Update opportunity status.
 */
export async function updateOpportunityStatus(
  projectId: string,
  opportunityId: string,
  status: string
): Promise<Opportunity> {
  const res = await fetch(
    `/workspace/opportunities/${projectId}/${opportunityId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to update status");
  }

  const json = await res.json();
  return json.data as Opportunity;
}

/**
 * Delete an opportunity.
 */
export async function deleteOpportunity(
  projectId: string,
  opportunityId: string
): Promise<void> {
  const res = await fetch(
    `/workspace/opportunities/${projectId}/${opportunityId}`,
    { method: "DELETE" }
  );

  if (!res.ok) {
    throw new Error("Failed to delete opportunity");
  }
}

/**
 * Export investment brief as Markdown.
 */
export async function exportBrief(
  projectId: string,
  opportunityIds: string[]
): Promise<string> {
  const res = await fetch(`/workspace/opportunities/${projectId}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ opportunity_ids: opportunityIds }),
  });

  if (!res.ok) {
    throw new Error("Failed to export brief");
  }

  return res.text();
}
