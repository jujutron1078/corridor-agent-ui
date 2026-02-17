"use client"

import { useState } from "react"
import Link from "next/link"
import { IconFolder, IconFolderOpen, type Icon } from "@tabler/icons-react"
import {
  ChevronRightIcon,
  FolderClosed,
  Loader2,
  Plus,
  SquarePen,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavProjects({
  items,
  onDeleteThread,
  deletingThreadIds,
  onCreateProject,
  onCreateThread,
  creatingThreadProject,
  onDeleteProject,
  deletingProjectId,
}: {
  items: {
    projectId: string
    name: string
    url: string
    icon: Icon
    threads: {
      threadId: string
      name: string
      url: string
    }[]
  }[]
  onDeleteThread?: (threadId: string) => void
  deletingThreadIds?: Set<string>
  onCreateProject?: (name: string) => Promise<{ ok: boolean; message: string }>
  onCreateThread?: (project: {
    projectId: string
    projectName: string
  }) => Promise<{ ok: boolean; message: string } | void>
  creatingThreadProject?: string | null
  onDeleteProject?: (project: {
    projectId: string
    projectName: string
  }) => Promise<{ ok: boolean; message: string } | void>
  deletingProjectId?: string | null
}) {
  const [openByProject, setOpenByProject] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(items.map((project) => [project.name, true]))
  )
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [createThreadError, setCreateThreadError] = useState<string | null>(null)
  const [deleteProjectError, setDeleteProjectError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [projectPendingDelete, setProjectPendingDelete] = useState<{
    projectId: string
    projectName: string
    threadCount: number
  } | null>(null)

  const handleCreateProject = async () => {
    const trimmed = projectName.trim()
    if (!trimmed || isCreating) return
    setIsCreating(true)
    setCreateError(null)
    const result = await onCreateProject?.(trimmed)
    if (!result) {
      setCreateError("Project create handler is unavailable.")
      setIsCreating(false)
      return
    }
    if (!result.ok) {
      setCreateError(result.message)
      setIsCreating(false)
      return
    }
    setProjectName("")
    setCreateError(null)
    setIsCreateModalOpen(false)
    setIsCreating(false)
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>Enter a name for your new project.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Project name"
            value={projectName}
            disabled={isCreating}
            onChange={(event) => setProjectName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void handleCreateProject()
              }
            }}
          />
          {createError && <p className="text-sm text-destructive">{createError}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isCreating}
              onClick={() => {
                setProjectName("")
                setCreateError(null)
                setIsCreateModalOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleCreateProject()} disabled={projectName.trim().length === 0 || isCreating}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={projectPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteProjectError(null)
            setProjectPendingDelete(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              {projectPendingDelete
                ? `This will permanently delete "${projectPendingDelete.projectName}" and ${projectPendingDelete.threadCount} thread(s) in LangGraph. This action cannot be undone.`
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {deleteProjectError && <p className="text-sm text-destructive">{deleteProjectError}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={Boolean(deletingProjectId)}
              onClick={() => {
                setDeleteProjectError(null)
                setProjectPendingDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={Boolean(deletingProjectId) || projectPendingDelete === null}
              onClick={() => {
                if (!projectPendingDelete) return

                setDeleteProjectError(null)
                void (async () => {
                  const result = await onDeleteProject?.({
                    projectId: projectPendingDelete.projectId,
                    projectName: projectPendingDelete.projectName,
                  })
                  if (result && !result.ok) {
                    setDeleteProjectError(result.message)
                    return
                  }
                  setProjectPendingDelete(null)
                })()
              }}
            >
              {Boolean(deletingProjectId) ? "Deleting..." : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarGroupAction
        aria-label="Create project"
        title="Create project"
        onClick={() => {
          setCreateError(null)
          setIsCreateModalOpen(true)
        }}
      >
        <Plus />
      </SidebarGroupAction>
      {createThreadError && <p className="px-2 text-xs text-destructive">{createThreadError}</p>}
      {deleteProjectError && <p className="px-2 text-xs text-destructive">{deleteProjectError}</p>}
      <SidebarMenu>
        {items.map((project) => (
          <Collapsible
            key={project.name}
            open={openByProject[project.name] ?? true}
            onOpenChange={(isOpen) => {
              setOpenByProject((previous) => ({
                ...previous,
                [project.name]: isOpen,
              }))
            }}
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip={project.name}
                  className="group w-full justify-start"
                >
                  <ChevronRightIcon className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                  {project.icon === IconFolder ? (
                    openByProject[project.name] ? (
                      <IconFolderOpen />
                    ) : (
                      <FolderClosed />
                    )
                  ) : (
                    <project.icon />
                  )}
                  <span>{project.name}</span>
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <SidebarMenuAction
                showOnHover
                aria-label={`Start new thread in ${project.name}`}
                title={`Start new thread in ${project.name}`}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setCreateThreadError(null)
                  void (async () => {
                    const result = await onCreateThread?.({
                      projectId: project.projectId,
                      projectName: project.name,
                    })
                    if (result && !result.ok) {
                      setCreateThreadError(result.message)
                    }
                  })()
                }}
                disabled={Boolean(creatingThreadProject)}
              >
                {creatingThreadProject === project.name ? (
                  <Loader2 className="size-2 animate-spin" />
                ) : (
                  <SquarePen className="size-3" />
                )}
              </SidebarMenuAction>
              <SidebarMenuAction
                showOnHover
                className="right-7"
                aria-label={`Delete ${project.name}`}
                title={`Delete ${project.name}`}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setDeleteProjectError(null)
                  setProjectPendingDelete({
                    projectId: project.projectId,
                    projectName: project.name,
                    threadCount: project.threads.length,
                  })
                }}
                disabled={Boolean(deletingProjectId)}
              >
                {deletingProjectId === project.projectId ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Trash2 className="size-3" />
                )}
              </SidebarMenuAction>
              {project.threads.length > 0 && (
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {project.threads.map((thread) => (
                      <SidebarMenuSubItem key={thread.url}>
                        <div className="flex items-center gap-1">
                          <SidebarMenuSubButton asChild className="min-w-0 flex-1">
                            <Link href={thread.url}>
                              <span>{thread.name}</span>
                            </Link>
                          </SidebarMenuSubButton>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              onDeleteThread?.(thread.threadId)
                            }}
                            disabled={Boolean(deletingThreadIds?.has(thread.threadId))}
                            aria-label={`Delete ${thread.name}`}
                            title="Delete thread"
                            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:opacity-100 inline-flex size-7 items-center justify-center rounded-md opacity-0 transition-opacity duration-150 group-hover/menu-sub-item:opacity-100 group-focus-within/menu-sub-item:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              )}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
