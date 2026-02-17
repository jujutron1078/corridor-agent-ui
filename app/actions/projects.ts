"use server"

type CreateProjectSuccessData = {
  project_name: string
  slug: string
  path: string
}

type ProjectThreadApiData = {
  thread_id: string
  created_at: string
}

type ProjectApiData = {
  project_id: string
  name: string
  threads: ProjectThreadApiData[]
}

type CreateProjectApiResponse = {
  success: boolean
  message: string
  data: CreateProjectSuccessData | null
}

type GetProjectsApiResponse = {
  success: boolean
  message: string
  data: ProjectApiData[]
}

type DeleteProjectApiResponse = {
  success: boolean
  message: string
  data: { project_id: string } | null
}

export type CreateProjectActionResult =
  | {
      ok: true
      message: string
      project: CreateProjectSuccessData
    }
  | {
      ok: false
      message: string
    }

export type GetProjectsActionResult =
  | {
      ok: true
      message: string
      projects: ProjectApiData[]
    }
  | {
      ok: false
      message: string
    }

export type DeleteProjectActionResult =
  | {
      ok: true
      message: string
      projectId: string
    }
  | {
      ok: false
      message: string
    }

const PROJECTS_API_URL = process.env.PROJECTS_API_URL ?? "http://127.0.0.1:2024"

export async function createProjectAction(projectName: string): Promise<CreateProjectActionResult> {
  const trimmed = projectName.trim()
  if (!trimmed) {
    return { ok: false, message: "Project name is required." }
  }

  try {
    const response = await fetch(`${PROJECTS_API_URL}/workspace/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_name: trimmed }),
      cache: "no-store",
    })

    const payload = (await response.json()) as CreateProjectApiResponse

    if (!response.ok || !payload.success || !payload.data) {
      return {
        ok: false,
        message: payload.message || "Unable to create project.",
      }
    }

    return {
      ok: true,
      message: payload.message,
      project: payload.data,
    }
  } catch {
    return {
      ok: false,
      message: "Unable to reach project service.",
    }
  }
}

export async function getProjectsAction(): Promise<GetProjectsActionResult> {
  try {
    const response = await fetch(`${PROJECTS_API_URL}/workspace/projects`, {
      method: "GET",
      cache: "no-store",
    })

    const payload = (await response.json()) as GetProjectsApiResponse
    if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
      return {
        ok: false,
        message: payload.message || "Unable to fetch projects.",
      }
    }

    return {
      ok: true,
      message: payload.message,
      projects: payload.data,
    }
  } catch {
    return {
      ok: false,
      message: "Unable to reach project service.",
    }
  }
}

export async function deleteProjectAction(projectId: string): Promise<DeleteProjectActionResult> {
  const trimmed = projectId.trim()
  if (!trimmed) {
    return { ok: false, message: "projectId is required." }
  }

  try {
    const response = await fetch(
      `${PROJECTS_API_URL}/workspace/projects/${encodeURIComponent(trimmed)}`,
      {
        method: "DELETE",
        cache: "no-store",
      }
    )

    const payload = (await response.json()) as DeleteProjectApiResponse
    if (!response.ok || !payload.success || !payload.data?.project_id) {
      return {
        ok: false,
        message: payload.message || "Unable to delete project.",
      }
    }

    return {
      ok: true,
      message: payload.message,
      projectId: payload.data.project_id,
    }
  } catch {
    return {
      ok: false,
      message: "Unable to reach project service.",
    }
  }
}
