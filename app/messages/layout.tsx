"use client"

import messagesFetchingError from "@/assets/illustration/fetchMessageError.svg"
import CreateDiscussionDialog from "@/components/message/CreateDiscussionDialog"
import CreateGroupDiscussionDialog from "@/components/message/CreateGroupDiscussionDialog"
import DeleteDiscussion from "@/components/message/group/DeleteDiscussion"
import EditDiscussionInfo from "@/components/message/group/EditDiscussionInfo"
import DiscussionListItem from "@/components/message/DiscussionListItem"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Discussion } from "@/generated/prisma/client"
import { messagingKeys, useDiscussionList } from "@/lib/hooks/useMessaging"
import { useQueryClient } from "@tanstack/react-query"
import clsx from "clsx"
import { Ellipsis, MessageCircleMoreIcon, Pen, Trash } from "lucide-react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { ReactNode, Suspense, useState } from "react"

type Props = { children: ReactNode }

function MessageLayoutContent({ children }: Props) {
  const params = useSearchParams()
  const discussionId = params.get("di")
  const queryClient = useQueryClient()

  const { data: res, isLoading, refetch } = useDiscussionList()

  // Invalide le cache discussions → SSE + refetch explicite après mutations
  const invalidateDiscussions = () =>
    queryClient.invalidateQueries({ queryKey: messagingKeys.discussions() })

  const [updateDialog, setUpdateDialog] = useState<{
    item: Discussion | null
    open: boolean
  }>({ item: null, open: false })

  const [deleteDialog, setDeleteDialog] = useState<{
    item: Discussion | null
    open: boolean
  }>({ item: null, open: false })

  if (isLoading) {
    return (
      <div className="flex h-[88vh] w-full">
        <aside className="hidden w-[320px] flex-col space-y-2 border-r px-2 md:flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton className="h-14 w-full" key={i} />
          ))}
        </aside>
        <div className="flex-1" />
      </div>
    )
  }

  if (!res || !res.ok) {
    return (
      <main className="flex h-[88vh] w-full items-center justify-center">
        <div className="relative flex h-[240px] w-[240px]">
          <Image
            src={messagesFetchingError}
            alt={"message fetching error illu"}
            fill
          />
        </div>
      </main>
    )
  }

  return (
    <main className="h-[88vh] w-full overflow-hidden md:grid md:grid-cols-[320px_minmax(0,1fr)]">
      <aside
        className={clsx("h-[88vh] w-full px-0.5", {
          hidden: Boolean(discussionId),
          "md:block md:border-r":
            res && res.data !== null && res.data.length > 0,
        })}
      >
        <div className="flex h-full w-full flex-col">
          <div className="flex w-full justify-between space-x-2 px-2 py-2">
            <CreateDiscussionDialog small mutate={refetch} />
            <CreateGroupDiscussionDialog small mutate={refetch} />
          </div>

          {res.data.length > 0 && (
            <ul className="flex w-full flex-1 flex-col items-center space-y-3 overflow-y-auto py-4">
              {res.data.map((item) => (
                <div
                  key={item.id}
                  className="relative flex w-full cursor-pointer items-center justify-between space-x-2 rounded-lg border border-transparent p-2 pe-0.5 hover:bg-gray-200/50"
                >
                  <DiscussionListItem item={item} />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size={"icon-xs"}
                        className="rounded-full"
                      >
                        {" "}
                        <Ellipsis className="h-4 w-4" />{" "}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-40" align="start">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Menu</DropdownMenuLabel>
                        {!!item.groupMessage && (
                          <DropdownMenuItem
                            onClick={() =>
                              setUpdateDialog({
                                item: item as Discussion,
                                open: true,
                              })
                            }
                          >
                            Modifier
                            <DropdownMenuShortcut>
                              <Pen className="h-4 w-4" />
                            </DropdownMenuShortcut>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            setDeleteDialog({
                              item: item as Discussion,
                              open: true,
                            })
                          }
                        >
                          Supprimer
                          <DropdownMenuShortcut>
                            {" "}
                            <Trash className="h-4 w-4" />{" "}
                          </DropdownMenuShortcut>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </ul>
          )}

          {res.data && res.data.length === 0 && (
            <div className="flex h-full flex-1 flex-col items-center justify-center space-y-4">
              <MessageCircleMoreIcon className="mx-auto text-muted-foreground" />
              <h3 className="text-center text-xl text-muted-foreground">
                Vous n&apos;avez aucune discussion
              </h3>
              <CreateDiscussionDialog small={false} />
            </div>
          )}
        </div>
      </aside>

      {updateDialog.open && (
        <EditDiscussionInfo
          discussion={updateDialog.item as Discussion}
          controlOpen={updateDialog.open}
          setControl={setUpdateDialog}
        />
      )}

      {deleteDialog.open && deleteDialog.item && (
        <DeleteDiscussion
          discussionId={deleteDialog.item.id}
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
          onSuccess={invalidateDiscussions}
        />
      )}

      {res.data && res.data.length > 0 && (
        <section
          className={clsx("h-[88vh] w-full", {
            hidden: !discussionId,
            "md:block": true,
          })}
        >
          {children}
        </section>
      )}
    </main>
  )
}

export default function MessageLayout({ children }: Props) {
  return (
    <Suspense fallback={<div className="flex h-[88vh] w-full items-center justify-center">Chargement...</div>}>
      <MessageLayoutContent>{children}</MessageLayoutContent>
    </Suspense>
  )
}
