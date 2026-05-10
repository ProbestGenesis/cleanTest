"use client"

import { toggleGroupAdmin } from "@/lib/actions/message/group/addAdmin"
import { AddMemberInGroup } from "@/lib/actions/message/group/addMembers"
import { updateDiscussionInfo } from "@/lib/actions/message/group/udpateInfo"
import { GroupMessage } from "@/generated/prisma/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useWorkers as getWorkers } from "@/lib/hooks/useWorkers"
import {
  Bell,
  BellOff,
  Check,
  ChevronDown,
  Crown,
  Edit,
  Loader2,
  Plus,
  Search,
  Shield,
  ShieldOff,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import type { Member } from "../CreateGroupDiscussionDialog"
import { ItemOfWorkers } from "../CreateGroupDiscussionDialog"
import { RecipientProfileHeader } from "../RecipientProfileHeader"
import EditDiscussionInfo from "./EditDiscussionInfo"
import { GroupProfileHeader } from "./GroupProfileHeader"
// ─── types ────────────────────────────────────────────────────────────────────

type DiscussionInfo = {
  id: string
  name: string | null
  image: string | null
  isGroup: boolean
  groupMessage: GroupMessage & {
    participants: { id: string; name: string }[]
    admin: string[]
  }
  members: Member[]
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name: string | null | undefined) =>
  name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?"

function UserAvatar({
  user,
  size = "md",
}: {
  user?: { name?: string | null; image?: string | null } | null
  size?: "sm" | "md" | "lg"
}) {
  const cls =
    size === "sm"
      ? "w-7 h-7 text-[10px]"
      : size === "lg"
        ? "w-16 h-16 text-lg"
        : "w-8 h-8 text-xs"
  return (
    <div
      className={`${cls} flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary`}
    >
      {user?.image ? (
        <img
          src={user.image}
          alt={user.name ?? ""}
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(user?.name)
      )}
    </div>
  )
}

// ─── AddMemberDialog ──────────────────────────────────────────────────────────
function AddMemberDialog({
  open,
  onOpenChange,
  discussionId,
  groupId,
  existingParticipantIds,
  //onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  discussionId: string
  groupId: string
  existingParticipantIds: string[]
  //onSuccess: () => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Member[]>([])
  const [selected, setSelected] = useState<Member[]>([])
  const [searching, setSearching] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const { data:workers, isLoading, error: fetchingError } = getWorkers()

  const handleSearch = async (value: string) => {
    setQuery(value)
    if (value.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(value)}`
      )
      const json = await res.json()
      setResults(
        (json.data ?? []).filter(
          (u: Member) =>
            !existingParticipantIds.includes(u.id) &&
            !selected.find((s) => s.id === u.id)
        )
      )
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const toggle = (user: Member) => {
    setSelected((prev) =>
      prev.find((s) => s.id === user.id)
        ? prev.filter((s) => s.id !== user.id)
        : [...prev, user]
    )
    setResults((prev) => prev.filter((r) => r.id !== user.id))
  }

  const handleConfirmAddMember = () => {
    if (!selected.length) return
    setError(null)
    startTransition(async () => {
      const selectedIds = selected.map((item) => item.id)

      const { ok, message } = await AddMemberInGroup({
        newMemberIds: selectedIds,
        discussionId: discussionId,
        groupId,
      })

      if (!ok) {
        setError(message)
        return
      }

      //onSuccess()
      onOpenChange(false)
      setSelected([])
      setQuery("")
      setResults([])
    })
  }

  const handleClose = (v: boolean) => {
    if (!v) {
      setSelected([])
      setQuery("")
      setResults([])
      setError(null)
    }
    onOpenChange(v)
  }

  const toggleSelect = ({ name, id, image, role }: Member) => {
    setSelected((prev) =>
      prev.some((p: any) => p.id === id)
        ? prev.filter((p: any) => p.id !== id)
        : [...prev, { id, name, image, role }]
    )
  }

  const [checked, setChecked] = useState<{ ids: string[]; state: boolean }>({
    ids: [],
    state: false,
  })

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <UserPlus className="h-4 w-4 text-primary" />
            Ajouter des membres
          </DialogTitle>
        </DialogHeader>

        {selected.length > 0 && (
          <div className="flex min-h-10 flex-wrap gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            {selected.map((u) => (
              <Badge
                key={u.id}
                variant="secondary"
                className="flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2 text-xs"
              >
                {u.name}
                <button
                  onClick={() =>
                    setSelected((prev) => prev.filter((s) => s.id !== u.id))
                  }
                  className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-slate-300/50"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="rounded-full pl-9"
            placeholder="Rechercher un utilisateur…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
          />
          {searching && (
            <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
          )}
        </div>

        {results.length > 0 && (
          <ScrollArea className="-mx-1 max-h-48">
            <div className="flex flex-col gap-0.5 px-1">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => toggle(user)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-50"
                >
                  <UserAvatar user={user} size="sm" />
                  <span className="flex-1 truncate text-sm font-medium text-slate-700">
                    {user.name}
                  </span>
                  <Plus className="h-4 w-4 flex-shrink-0 text-primary" />
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <Spinner className="size-24" />
          </div>
        ) : (
          <>
            {" "}
            {results.length === 0 && (
              <div className="flex flex-col gap-0.5 px-1">
                {workers && workers?.length > 0 &&
                  workers
                    .filter((w:any) => !existingParticipantIds.includes(w.id))
                    .map((user:any) => {
                      const isSelected = selected.some(
                        (item:any) => item.id === user.id
                      )
                      return (
                        <ItemOfWorkers
                          key={user.id}
                          e={user}
                          checked={checked}
                          setChecked={setChecked}
                          toggleSelect={toggleSelect}
                          isSelected={isSelected}
                        />
                      )
                    })}
              </div>
            )}
          </>
        )}

        {error && <p className="text-center text-xs text-red-500">{error}</p>}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => handleClose(false)}
          >
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmAddMember}
            disabled={!selected.length || isPending}
            className="rounded-full"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Ajout…
              </>
            ) : (
              `Ajouter${selected.length > 0 ? ` (${selected.length})` : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── MemberRow ────────────────────────────────────────────────────────────────
function MemberRow({
  participant,
  isAdmin,
  canManageAdmins,
  isSelf,
  isPending,
  onToggleAdmin,
}: {
  participant: { id: string; name: string }
  isAdmin: boolean
  canManageAdmins: boolean
  isSelf: boolean
  isPending: boolean
  onToggleAdmin: (id: string) => void
}) {
  return (
    <div className="group flex items-center justify-between gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <UserAvatar user={participant} size="sm" />
        <span className="truncate text-sm font-medium text-slate-700">
          {participant.name}
        </span>
        {isAdmin && (
          <Badge
            variant="outline"
            className="flex h-4 flex-shrink-0 items-center gap-0.5 border-amber-300 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-600"
          >
            <Crown className="h-2.5 w-2.5" />
            Admin
          </Badge>
        )}
      </div>

      {canManageAdmins && !isSelf && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100 ${
                  isAdmin
                    ? "text-red-400 hover:bg-red-50 hover:text-red-600"
                    : "text-amber-500 hover:bg-amber-50 hover:text-amber-700"
                }`}
                onClick={() => onToggleAdmin(participant.id)}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isAdmin ? (
                  <ShieldOff className="h-3.5 w-3.5" />
                ) : (
                  <Shield className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              {isAdmin ? "Retirer les droits admin" : "Nommer administrateur"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

export function DrawerMenu({
  open,
  onOpenChange,
  discussion,
  notificationsEnabled,
  onToggleNotifications,
  isGroup,
  currentUserId,
  currentUserRole,
  onactions,
  onTag,
  onMeet,
  onGroup,
  isGeneratingMeet,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  discussion?: any
  notificationsEnabled: boolean
  onToggleNotifications: () => void
  isGroup: boolean | undefined
  currentUserId: string
  currentUserRole?: string // 'superadmin' | autres
  onactions?: () => void
  onTag?: () => void
  onMeet?: () => void
  onGroup?: () => void
  isGeneratingMeet?: boolean
}) {
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [adminPending, setAdminPending] = useState<string | null>(null)
  const [membersOpen, setMembersOpen] = useState(false)
  const [updateGroupName, setUpdateGroupName] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [isPending, startTransition] = useTransition()

  const admins: string[] = discussion?.groupMessage?.admin ?? []
  const participants: { id: string; name: string }[] =
    (discussion?.groupMessage?.participants as {
      id: string
      name: string
    }[]) ?? []

  // ── Permissions ──────────────────────────────────────────────────────────────
  const isSuperAdmin = currentUserRole === "superadmin"
  const isGroupAdmin = admins.includes(currentUserId)
  // superadmin OU admin du groupe peuvent gérer les membres et les admins
  const canManage = isSuperAdmin || isGroupAdmin

  const recipient = !isGroup
    ? (discussion?.members as Member[])?.find((p) => p.id !== currentUserId)
    : null

  // ── Toggle admin ─────────────────────────────────────────────────────────────
  const handleToggleAdmin = async (userId: string) => {
    if (!discussion?.groupMessage?.discussionId) return
    setAdminPending(userId)
    try {
      const { ok, message } = await toggleGroupAdmin(
        discussion.groupMessage.discussionId,
        userId
      )
      if (!ok) {
        toast.error(message || "Une erreur est survenue")
      } else {
        toast.success(message)
        if (onactions) onactions()
      }
    } catch {
      toast.error("Une erreur est survenue lors de la modification des droits")
    } finally {
      setAdminPending(null)
    }
  }

  const handleSubmitNameChange = async () => {
    if (!groupName) {
      return
    }
    startTransition(async () => {
      await updateDiscussionInfo({
        name: groupName,
        image: discussion.image,
        discussionId: discussion.id,
      })
    })
  }

  const handleCancelNameChange = async () => {
    setUpdateGroupName(false)
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction="right">
        <DrawerContent className="flex h-full max-h-screen min-w-sm flex-col">
          <DrawerHeader className="flex-shrink-0 border-b border-slate-100 pb-3">
            <DrawerTitle className="text-base font-semibold text-slate-800">
              Informations
            </DrawerTitle>
          </DrawerHeader>

          <div className="max-h-[90vh] overflow-y-auto">
            {/* ── Profil ──────────────────────────────────────────────────── */}
            {!isGroup ? (
              <RecipientProfileHeader
                recipient={recipient}
                onTag={onTag ?? (() => {})}
                onMeet={onMeet ?? (() => {})}
                onGroup={onGroup ?? (() => {})}
                isGeneratingMeet={isGeneratingMeet ?? false}
              />
            ) : (
              <GroupProfileHeader
                name={discussion?.name}
                image={discussion?.image}
                memberCount={participants.length}
                onTag={onTag ?? (() => {})}
                onMeet={onMeet ?? (() => {})}
                isGeneratingMeet={isGeneratingMeet ?? false}
              />
            )}

            {updateGroupName && (
              <div className="mt-1 flex items-center space-x-2 text-center">
                <form
                  onSubmit={handleSubmitNameChange}
                  className="flex w-full items-center justify-center space-x-2"
                >
                  <Input
                    className="max-w-xs rounded-lg"
                    value={discussion.name}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Nom du groupe"
                    aria-label="Nom du groupe"
                    disabled={isPending}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="rounded-full"
                    aria-label="Annuler"
                    onClick={handleCancelNameChange}
                    disabled={isPending}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  <Button
                    type="submit"
                    variant="outline"
                    size="icon-xs"
                    className="rounded-full"
                    aria-label="Valider le nom"
                    disabled={isPending || !(discussion.name ?? "").trim()}
                  >
                    <Check className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            )}

            <Separator />

            {/* ── Notifications ─────────────────────────────────────────── */}
            <div className="px-5 py-4">
              <button
                onClick={onToggleNotifications}
                className="flex w-full items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${notificationsEnabled ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"}`}
                  >
                    {notificationsEnabled ? (
                      <Bell className="h-4 w-4" />
                    ) : (
                      <BellOff className="h-4 w-4" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-700">
                      Notifications
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {notificationsEnabled ? "Activées" : "Désactivées"}
                    </p>
                  </div>
                </div>
                <div
                  className={`relative flex-shrink-0 rounded-full transition-colors duration-200 ${notificationsEnabled ? "bg-primary" : "bg-slate-200"}`}
                  style={{ width: 40, height: 22 }}
                >
                  <div
                    className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${notificationsEnabled ? "translate-x-[20px]" : "translate-x-[3px]"}`}
                  />
                </div>
              </button>
            </div>

            {/* ── Section Membres — groupe uniquement ───────────────────── */}
            {isGroup && (
              <div className={"flex flex-col space-y-3.5 px-4 py-3"}>
                <Separator />

                <div>
                  <div className="flex items-center gap-2">
                    <EditDiscussionInfo discussion={discussion}>
                      <button className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Edit className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700">
                            Modifier les informations
                          </p>
                        </div>
                      </button>
                    </EditDiscussionInfo>
                  </div>
                </div>

                {/* Collapsible shadcn/ui */}
                <Collapsible open={membersOpen} onOpenChange={setMembersOpen}>
                  {/* Trigger row */}
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <button className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700">
                            Membres du groupe
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {participants.length} membre
                            {participants.length > 1 ? "s" : ""}
                          </p>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${membersOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    </CollapsibleTrigger>

                    {/* Bouton ajouter — superadmin ou admin du groupe */}
                    {canManage && (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation()
                                setAddMemberOpen(true)
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs">
                            Ajouter un membre
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  {/* Liste dépliable */}
                  <CollapsibleContent className="overflow-hidden">
                    <div className="mt-2 flex flex-col gap-0.5">
                      {participants.length === 0 ? (
                        <p className="py-4 text-center text-xs text-slate-400">
                          Aucun membre pour l'instant
                        </p>
                      ) : (
                        participants.map((p) => (
                          <MemberRow
                            key={p.id}
                            participant={p}
                            isAdmin={admins.includes(p.id)}
                            canManageAdmins={canManage}
                            isSelf={p.id === currentUserId}
                            isPending={adminPending === p.id}
                            onToggleAdmin={handleToggleAdmin}
                          />
                        ))
                      )}
                    </div>

                    {canManage && participants.length > 0 && (
                      <p className="mt-2 pb-1 text-center text-[10px] text-slate-400">
                        Survolez un membre pour gérer ses droits
                      </p>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* ── Bloc administrateurs ──────────────────────────────── */}
                {admins.length > 0 && (
                  <>
                    <Separator />
                    <div className="px-5 py-4 pb-8">
                      <div className="mb-3 flex items-center gap-2">
                        <Crown className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                          Administrateurs
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {participants
                          .filter((p) => admins.includes(p.id))
                          .map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center gap-2.5 rounded-xl bg-amber-50/60 px-3 py-1.5"
                            >
                              <UserAvatar user={p} size="sm" />
                              <span className="flex-1 truncate text-sm font-medium text-slate-700">
                                {p.name}
                              </span>
                              <Crown className="h-3 w-3 flex-shrink-0 text-amber-400" />
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Dialog ajout de membre */}
      {discussion?.groupMessage && (
        <AddMemberDialog
          open={addMemberOpen}
          onOpenChange={setAddMemberOpen}
          discussionId={discussion.groupMessage.discussionId}
          groupId={discussion.groupMessage.id}
          existingParticipantIds={participants.map((p) => p.id)}
          //onSuccess={onactions}
        />
      )}
    </>
  )
}
