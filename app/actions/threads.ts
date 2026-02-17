"use server"

type CreateThreadApiResponse = {
  success: boolean
  message: string
  data: {
    thread_id: string
    project_id: string
    path: string
  } | null
}

export type CreateThreadActionResult =
  | {
      ok: true
      message: string
    }
  | {
      ok: false
      message: string
    }

const THREADS_API_URL = process.env.THREADS_API_URL ?? "http://127.0.0.1:2024"

export async function createThreadAction({
  threadId,
  projectId,
}: {
  threadId: string
  projectId: string
}): Promise<CreateThreadActionResult> {
  if (!threadId || !projectId) {
    return { ok: false, message: "threadId and projectId are required." }
  }

  try {
    const response = await fetch(`${THREADS_API_URL}/workspace/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        thread_id: threadId,
        project_id: projectId,
      }),
      cache: "no-store",
    })

    const payload = (await response.json()) as CreateThreadApiResponse

    if (!response.ok || !payload.success) {
      return {
        ok: false,
        message: payload.message || "Unable to create thread in backend.",
      }
    }

    return {
      ok: true,
      message: payload.message,
    }
  } catch {
    return {
      ok: false,
      message: "Unable to reach thread service.",
    }
  }
}
