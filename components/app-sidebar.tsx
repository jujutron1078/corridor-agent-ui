"use client"

import * as React from "react"
import { Client } from "@langchain/langgraph-sdk"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { IconFolder } from "@tabler/icons-react"

import {
  getProjectsAction,
  createProjectAction,
  deleteProjectAction,
} from "@/app/actions/projects"
import { createThreadAction, deleteThreadAction } from "@/app/actions/threads"
import { toast } from "sonner"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const LANGGRAPH_API_URL = "http://127.0.0.1:2024"
const THREADS_UPDATED_EVENT = "corridor:threads-updated"
type ThreadsUpdatedEventDetail = {
  projectId: string
  projectName: string
  threadId: string
}

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
}

type SidebarProject = {
  projectId: string
  name: string
  url: string
  icon: typeof IconFolder
  threads: {
    threadId: string
    name: string
    url: string
  }[]
}

function mapProjectsForSidebar(
  projects: {
    project_id: string
    name: string
    threads: { thread_id: string; created_at: string }[]
  }[]
): SidebarProject[] {
  return projects.map((project) => ({
    projectId: project.project_id,
    name: project.name,
    url: "#",
    icon: IconFolder,
    threads: project.threads.map((thread) => ({
      threadId: thread.thread_id,
      name: thread.thread_id,
      url: `/?project_id=${encodeURIComponent(project.project_id)}&project_name=${encodeURIComponent(project.name)}&thread=${encodeURIComponent(thread.thread_id)}`,
    })),
  }))
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeThreadId = searchParams.get("thread")
  const client = React.useMemo(() => new Client({ apiUrl: LANGGRAPH_API_URL }), [])
  const [projectsData, setProjectsData] = React.useState<SidebarProject[]>([])
  const [deletingThreadIds, setDeletingThreadIds] = React.useState<Set<string>>(new Set())
  const [creatingThreadProject, setCreatingThreadProject] = React.useState<string | null>(null)
  const [deletingProjectId, setDeletingProjectId] = React.useState<string | null>(null)

  const loadProjects = React.useCallback(async () => {
    const result = await getProjectsAction()
    if (!result.ok) return
    setProjectsData(mapProjectsForSidebar(result.projects))
  }, [])

  React.useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  React.useEffect(() => {
    const handleThreadsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ThreadsUpdatedEventDetail>).detail
      if (!detail?.projectId || !detail?.projectName || !detail?.threadId) {
        void loadProjects()
        return
      }

      setProjectsData((previous) =>
        previous.map((project) => {
          if (project.projectId !== detail.projectId) return project
          const hasThread = project.threads.some((thread) => thread.threadId === detail.threadId)
          if (hasThread) return project

          return {
            ...project,
            threads: [
              ...project.threads,
              {
                threadId: detail.threadId,
                name: detail.threadId,
                url: `/?project_id=${encodeURIComponent(detail.projectId)}&project_name=${encodeURIComponent(detail.projectName)}&thread=${encodeURIComponent(detail.threadId)}`,
              },
            ],
          }
        })
      )
    }

    window.addEventListener(THREADS_UPDATED_EVENT, handleThreadsUpdated)
    return () => {
      window.removeEventListener(THREADS_UPDATED_EVENT, handleThreadsUpdated)
    }
  }, [loadProjects])

  const handleDeleteThread = React.useCallback(
    async (projectId: string, threadId: string) => {
      let shouldDelete = false
      setDeletingThreadIds((previous) => {
        if (previous.has(threadId)) return previous
        shouldDelete = true
        const next = new Set(previous)
        next.add(threadId)
        return next
      })
      if (!shouldDelete) return

      const isDeletingActiveThread = activeThreadId === threadId

      try {
        await client.threads.delete(threadId)

        const backendResult = await deleteThreadAction({ projectId, threadId })
        if (!backendResult.ok) {
          toast.error(backendResult.message ?? "Failed to delete thread from workspace.")
          return
        }

        if (isDeletingActiveThread) {
          const params = new URLSearchParams(searchParams.toString())
          params.delete("thread")
          const nextQuery = params.toString()
          router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
        }

        setProjectsData((previous) =>
          previous.map((project) => ({
            ...project,
            threads: project.threads.filter((thread) => thread.threadId !== threadId),
          }))
        )
      } catch {
        toast.error("Failed to delete thread.")
      } finally {
        setDeletingThreadIds((previous) => {
          const next = new Set(previous)
          next.delete(threadId)
          return next
        })
      }
    },
    [activeThreadId, client, pathname, router, searchParams]
  )

  const handleCreateProject = React.useCallback(async (name: string) => {
    const result = await createProjectAction(name)

    if (!result.ok) {
      return { ok: false as const, message: result.message }
    }

    setProjectsData((previous) => {
      const alreadyExists = previous.some(
        (project) => project.projectId.toLowerCase() === result.project.slug.toLowerCase()
      )
      if (alreadyExists) return previous

      return [
        ...previous,
        {
          name: result.project.project_name,
          projectId: result.project.slug,
          url: "#",
          icon: IconFolder,
          threads: [],
        },
      ]
    })

    return { ok: true as const, message: result.message }
  }, [])

  const handleCreateThreadForProject = React.useCallback(
    async ({ projectName, projectId }: { projectName: string; projectId: string }) => {
      if (creatingThreadProject) return
      setCreatingThreadProject(projectName)
      try {
        const createdThread = await client.threads.create({
          metadata: {
            project_name: projectName,
            project_id: projectId,
          },
        })

        const backendResult = await createThreadAction({
          threadId: createdThread.thread_id,
          projectId,
        })
        if (!backendResult.ok) {
          await client.threads.delete(createdThread.thread_id).catch(() => undefined)
          return { ok: false as const, message: backendResult.message }
        }

        setProjectsData((previous) =>
          previous.map((project) =>
            project.projectId === projectId
              ? {
                  ...project,
                  threads: [
                    ...project.threads,
                    {
                      threadId: createdThread.thread_id,
                      name: createdThread.thread_id,
                      url: `/?project_id=${encodeURIComponent(projectId)}&project_name=${encodeURIComponent(projectName)}&thread=${encodeURIComponent(createdThread.thread_id)}`,
                    },
                  ],
                }
              : project
          )
        )

        const params = new URLSearchParams(searchParams.toString())
        params.set("project_id", projectId)
        params.set("project_name", projectName)
        params.set("thread", createdThread.thread_id)
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })

        return { ok: true as const, message: "Thread created successfully." }
      } catch {
        return { ok: false as const, message: "Unable to create thread." }
      } finally {
        setCreatingThreadProject(null)
      }
    },
    [client, creatingThreadProject, pathname, router, searchParams]
  )

  const handleDeleteProject = React.useCallback(
    async ({ projectId }: { projectId: string; projectName: string }) => {
      if (deletingProjectId) return

      const project = projectsData.find((item) => item.projectId === projectId)
      if (!project) {
        return { ok: false as const, message: "Project not found." }
      }

      setDeletingProjectId(projectId)
      try {
        const threadDeleteResults = await Promise.allSettled(
          project.threads.map((thread) => client.threads.delete(thread.threadId))
        )
        const hasThreadDeleteFailure = threadDeleteResults.some(
          (result) => result.status === "rejected"
        )
        if (hasThreadDeleteFailure) {
          return {
            ok: false as const,
            message: "Failed to delete one or more LangGraph threads.",
          }
        }

        const backendThreadDeleteResults = await Promise.allSettled(
          project.threads.map((thread) =>
            deleteThreadAction({ projectId, threadId: thread.threadId })
          )
        )
        const hasBackendThreadDeleteFailure = backendThreadDeleteResults.some(
          (result) => result.status === "rejected" || (result.status === "fulfilled" && !result.value?.ok)
        )
        if (hasBackendThreadDeleteFailure) {
          return {
            ok: false as const,
            message: "Failed to delete one or more threads from backend.",
          }
        }

        const backendResult = await deleteProjectAction(projectId)
        if (!backendResult.ok) {
          return { ok: false as const, message: backendResult.message }
        }

        setProjectsData((previous) => previous.filter((item) => item.projectId !== projectId))

        const isActiveThreadInProject = project.threads.some(
          (thread) => thread.threadId === activeThreadId
        )
        if (isActiveThreadInProject) {
          const params = new URLSearchParams(searchParams.toString())
          params.delete("thread")
          params.delete("project_id")
          const nextQuery = params.toString()
          router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
        }

        return { ok: true as const, message: backendResult.message }
      } catch {
        return { ok: false as const, message: "Unable to delete project." }
      } finally {
        setDeletingProjectId(null)
      }
    },
    [activeThreadId, client, deletingProjectId, pathname, projectsData, router, searchParams]
  )

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <Image
                  src="/corridor-favicon.svg"
                  alt="Corridor Agent"
                  width={20}
                  height={20}
                  className="shrink-0"
                />
                <span className="text-base font-semibold">Corridor Agents</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={[]} />
        <NavProjects
          items={projectsData}
          onDeleteThread={handleDeleteThread}
          deletingThreadIds={deletingThreadIds}
          onCreateProject={handleCreateProject}
          onCreateThread={handleCreateThreadForProject}
          creatingThreadProject={creatingThreadProject}
          onDeleteProject={handleDeleteProject}
          deletingProjectId={deletingProjectId}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
