"use client"

import { createDiscussion } from "@/lib/actions/message/createDiscussion"
import { tagGroupMembers } from "@/lib/actions/message/tagGroupMembers"
import { tagRecipient } from "@/lib/actions/message/tagRecipient"
import ImageLightbox from "@/components/message/ImageLightbox"
import { RecipientProfileHeader } from "@/components/message/RecipientProfileHeader"
//import GroupAssignTasksDialog from "@/components/tasks/GroupAssignTasksDialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { GroupMessage } from "@/generated/prisma/client"
import { authClient } from "@/lib/auth-client"
import { useDiscussionMessages, messagingKeys, type DiscussionFullResponse } from "@/lib/hooks/useMessaging"
import { useQueryClient } from "@tanstack/react-query"
import messengerIllustration from "@/assets/illustration/message_sent.svg"
import { upload } from "@vercel/blob/client"
import {
  ChevronLeft,
  FileArchive,
  FileAudio,
  FileCode2,
  File as FileIconLucide,
  FileImage as FileImageIcon,
  FileJson,
  FilePlus,
  FileSpreadsheet,
  FileText,
  FileVideo,
  LucideIcon,
  Menu,
  Mic,
  NotebookPen,
  Pause,
  Play,
  Send,
  Trash,
  X,
} from "lucide-react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import React, { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { DrawerMenu } from "@/components/message/group/InfoDrawer"

type Sender = {
  id: string
  name: string | null
  image: string | null
}

type Member = {
  id: string
  name: string | null
  image: string | null
  role?: string
}

type DiscussionInfo = {
  id: string
  name: string | null
  image: string | null
  isGroup: boolean
  groupMessage: GroupMessage
  members: Member[]
}



// Type local — étend ChatMessage avec les champs UI optimistes
type Message = {
  id: string
  senderId: string
  sender?: Sender
  content: string
  images?: string[]
  createdAt: string
  isView: boolean
  viewBy: string[]
  _pending?: boolean
  _pendingAttachments?: PendingAttachment[]
}

type PendingAttachment = {
  id: string
  file: File
  previewUrl: string | null
  isImage: boolean
}

type FileVisualMeta = {
  extension: string
  label: string
  icon: LucideIcon
  iconClassName: string
  badgeClassName: string
}

const imageExtensions = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "bmp",
  "tiff",
  "ico",
  "avif",
  "heic",
])

const audioExtensions = new Set(["mp3", "wav", "ogg", "m4a", "aac", "flac"])
const videoExtensions = new Set(["mp4", "mov", "avi", "webm", "mkv", "m4v"])
const archiveExtensions = new Set(["zip", "rar", "7z", "tar", "gz"])
const codeExtensions = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "php",
  "java",
  "c",
  "cpp",
  "cs",
  "go",
  "rb",
  "swift",
  "kt",
  "html",
  "css",
])
const spreadsheetExtensions = new Set(["xls", "xlsx", "csv", "ods"])

const fmt = (date: string) => {
  const d = new Date(date)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  }
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate())

const formatDaySeparatorLabel = (date: string) => {
  const msgDate = new Date(date)
  const today = startOfDay(new Date())
  const day = startOfDay(msgDate)
  const diffMs = today.getTime() - day.getTime()
  const diffDays = Math.round(diffMs / 86400000)

  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return "Hier"

  return msgDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

const getInitials = (name: string | null | undefined) =>
  name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?"

const getExtensionFromName = (value: string) => {
  const clean = value.split("?")[0].split("#")[0]
  const parts = clean.split(".")
  if (parts.length < 2) return "FILE"
  return parts.pop()!.toUpperCase()
}

const getExtensionFromUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    const queryName =
      parsed.searchParams.get("filename") ||
      parsed.searchParams.get("fileName") ||
      parsed.searchParams.get("name") ||
      parsed.searchParams.get("download")
    if (queryName) {
      const extFromQuery = getExtensionFromName(queryName)
      if (extFromQuery !== "FILE") return extFromQuery
    }
    const pathname = decodeURIComponent(parsed.pathname)
    return getExtensionFromName(pathname)
  } catch {
    return getExtensionFromName(url)
  }
}

const getFileNameFromUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    const pathname = decodeURIComponent(parsed.pathname)
    const segment = pathname.split("/").filter(Boolean).pop()
    return segment || "fichier"
  } catch {
    const clean = decodeURIComponent(url.split("?")[0].split("#")[0])
    const segment = clean.split("/").filter(Boolean).pop()
    return segment || "fichier"
  }
}

const isImageByExtension = (extension: string) =>
  imageExtensions.has(extension.toLowerCase())

const isImageFile = (file: File) => {
  if (file.type.startsWith("image/")) return true
  const ext = getExtensionFromName(file.name)
  return isImageByExtension(ext)
}

const isImageUrl = (url: string) => {
  const ext = getExtensionFromUrl(url)
  return isImageByExtension(ext)
}

const getFileMeta = (filenameOrUrl: string): FileVisualMeta => {
  const extension = filenameOrUrl.startsWith("http")
    ? getExtensionFromUrl(filenameOrUrl)
    : getExtensionFromName(filenameOrUrl)
  const ext = extension.toLowerCase()

  if (isImageByExtension(ext)) {
    return {
      extension,
      label: "Image",
      icon: FileImageIcon,
      iconClassName: "text-emerald-600",
      badgeClassName: "bg-emerald-50 text-emerald-700 border-emerald-200",
    }
  }
  if (ext === "pdf") {
    return {
      extension,
      label: "PDF",
      icon: FileText,
      iconClassName: "text-red-600",
      badgeClassName: "bg-red-50 text-red-700 border-red-200",
    }
  }
  if (spreadsheetExtensions.has(ext)) {
    return {
      extension,
      label: "Tableur",
      icon: FileSpreadsheet,
      iconClassName: "text-green-600",
      badgeClassName: "bg-green-50 text-green-700 border-green-200",
    }
  }
  if (audioExtensions.has(ext)) {
    return {
      extension,
      label: "Audio",
      icon: FileAudio,
      iconClassName: "text-orange-600",
      badgeClassName: "bg-orange-50 text-orange-700 border-orange-200",
    }
  }
  if (videoExtensions.has(ext)) {
    return {
      extension,
      label: "Vidéo",
      icon: FileVideo,
      iconClassName: "text-fuchsia-600",
      badgeClassName: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    }
  }
  if (archiveExtensions.has(ext)) {
    return {
      extension,
      label: "Archive",
      icon: FileArchive,
      iconClassName: "text-amber-700",
      badgeClassName: "bg-amber-50 text-amber-700 border-amber-200",
    }
  }
  if (ext === "json") {
    return {
      extension,
      label: "JSON",
      icon: FileJson,
      iconClassName: "text-cyan-600",
      badgeClassName: "bg-cyan-50 text-cyan-700 border-cyan-200",
    }
  }
  if (codeExtensions.has(ext)) {
    return {
      extension,
      label: "Code",
      icon: FileCode2,
      iconClassName: "text-violet-600",
      badgeClassName: "bg-violet-50 text-violet-700 border-violet-200",
    }
  }
  if (["txt", "doc", "docx", "rtf", "odt", "md"].includes(ext)) {
    return {
      extension,
      label: "Document",
      icon: FileText,
      iconClassName: "text-slate-700",
      badgeClassName: "bg-slate-100 text-slate-700 border-slate-300",
    }
  }

  return {
    extension,
    label: "Fichier",
    icon: FileIconLucide,
    iconClassName: "text-slate-600",
    badgeClassName: "bg-slate-100 text-slate-700 border-slate-300",
  }
}

function UserAvatar({
  user,
  size = "md",
}: {
  user?: Sender | Member | null
  size?: "sm" | "md" | "lg"
}) {
  const sizeClass =
    size === "sm"
      ? "w-7 h-7 text-[10px]"
      : size === "lg"
        ? "w-16 h-16 text-lg"
        : "w-8 h-8 text-xs"
  return (
    <div
      className={`${sizeClass} flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary`}
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

function Header({
  discussion,
  onMenuOpen,
  isLoading,
  currentUserId,
}: {
  discussion?: DiscussionInfo | null
  onMenuOpen: () => void
  isLoading: boolean
  currentUserId: string
}) {
  const router = useRouter()
  const [teamTaskDialog, setTeamTaskDialog] = useState(false)

  const isGroup = !!discussion?.groupMessage
  const recipient = !isGroup
    ? discussion?.members?.find((p) => p.id !== currentUserId)
    : null

  const displayName = recipient
    ? recipient.name
    : (discussion?.name ?? "Discussion")
  const displayImage = recipient ? recipient.image : (discussion?.image ?? "")

  return (
    <div className="sticky top-0 z-40 border-b border-slate-100 bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 max-sm:hidden"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 lg:hidden">
          <ChevronLeft className="h-5 w-5" />
        </button>

        {isLoading ? (
          <div className="flex flex-1 items-center gap-3">
            <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-slate-100" />
            <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar className="relative size-12">
              <AvatarImage src={displayImage ?? ""} />
              <AvatarFallback className="text-lg text-primary">
                {displayName?.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm leading-tight font-semibold text-slate-800">
                {displayName}
              </span>
              {discussion?.isGroup && (discussion.members?.length ?? 0) > 0 && (
                <span className="text-[11px] leading-tight text-slate-400">
                  {discussion.members.length} membre
                  {discussion.members.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          {discussion?.groupMessage && (
            <Button
              variant="outline"
              className="rounded-full"
              size="icon"
              onClick={() => {
                setTeamTaskDialog(true)
              }}
            >
              <NotebookPen />
            </Button>
          )}
          <button
            onClick={onMenuOpen}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/*teamTaskDialog && (
        <GroupAssignTasksDialog
          isOpen={teamTaskDialog}
          onClose={() => setTeamTaskDialog(false)}
          members={
            (Array.isArray(discussion?.groupMessage.participants)
              ? discussion?.groupMessage.participants
              : []) as any
          }
          messageGroupId={discussion?.groupMessage.id}
          targetName={discussion?.name || "ce groupe"}
        />
      )*/}
    </div>
  )
}

function AttachmentPreviewBar({
  attachments,
  onRemove,
}: {
  attachments: PendingAttachment[]
  onRemove: (id: string) => void
}) {
  if (attachments.length === 0) return null

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2">
      {attachments.map((attachment) => {
        if (attachment.isImage && attachment.previewUrl) {
          return (
            <div
              key={attachment.id}
              className="group relative w-16 flex-shrink-0"
            >
              <img
                src={attachment.previewUrl}
                alt={attachment.file.name}
                className="h-16 w-16 rounded-xl border border-slate-200 object-cover"
              />
              <button
                onClick={() => onRemove(attachment.id)}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white opacity-100 shadow transition-opacity md:opacity-0 md:group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
              <p className="mt-0.5 truncate text-center text-[9px] text-slate-400">
                {attachment.file.name}
              </p>
            </div>
          )
        }

        const meta = getFileMeta(attachment.file.name)
        const Icon = meta.icon

        return (
          <div
            key={attachment.id}
            className="group relative w-[128px] flex-shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-2"
          >
            <button
              onClick={() => onRemove(attachment.id)}
              className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white opacity-100 shadow transition-opacity md:opacity-0 md:group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
                <Icon className={`h-4 w-4 ${meta.iconClassName}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-500">
                  {meta.extension}
                </p>
                <p
                  className="truncate text-[11px] text-slate-700"
                  title={attachment.file.name}
                >
                  {attachment.file.name}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AudioPlayer({ src, mine }: { src: string; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const isDraggingRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const fmtTime = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return "0:00"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
    } else {
      el.play()
    }
    setPlaying(!playing)
  }

  const handleTimeUpdate = () => {
    const el = audioRef.current
    if (!el || isDraggingRef.current) return
    setCurrentTime(el.currentTime)
    if (el.duration) setProgress((el.currentTime / el.duration) * 100)
  }

  const handleLoadedMetadata = () => {
    const el = audioRef.current
    if (el) setDuration(el.duration)
  }

  const handleEnded = () => {
    setPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    if (audioRef.current) audioRef.current.currentTime = 0
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    el.currentTime = ratio * el.duration
    setProgress(ratio * 100)
    setCurrentTime(el.currentTime)
  }

  return (
    <div
      className={`flex w-full max-w-[280px] items-center gap-2.5 rounded-2xl px-3 py-2.5 ${
        mine
          ? "border border-primary bg-primary shadow-sm"
          : "border border-slate-200 bg-white shadow-sm"
      }`}
    >
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
        className="hidden"
      />

      {/* Play / Pause button */}
      <button
        onClick={toggle}
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${
          mine
            ? "bg-white/30 text-white hover:bg-white/40"
            : "bg-primary text-white hover:bg-primary/90"
        }`}
        aria-label={playing ? "Pause" : "Lecture"}
      >
        {playing ? (
          <Pause className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
        )}
      </button>

      {/* Waveform + seek */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Progress */}
        <div
          className="relative flex h-7 cursor-pointer items-center select-none"
          onClick={handleSeek}
        >
          <Progress
            value={progress}
            className={`h-2 ${mine ? "bg-white/30 [&>div]:bg-white" : "bg-primary/20 [&>div]:bg-primary"}`}
          />
        </div>

        {/* Time */}
        <div
          className={`flex justify-between text-[9px] font-medium ${mine ? "text-white/70" : "text-slate-400"}`}
        >
          <span>{fmtTime(currentTime)}</span>
          <span>{fmtTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}

function Bubble({
  msg,
  currentUserId,
  currentWorkerId,
  onImageClick,
  onDelete,
}: {
  msg: Message
  currentUserId: string
  currentWorkerId: string
  onImageClick: (url: string) => void
  onDelete?: (id: string) => void
}) {
  const renderTextWithLinks = (value: string) => {
    const re = /(https?:\/\/[^\s]+|\/interne\/[^\s]+)/g
    const parts = value.split(re)

    return parts.map((part, idx) => {
      if (!part) return null
      if (
        part.startsWith("http://") ||
        part.startsWith("https://") ||
        part.startsWith("/interne/")
      ) {
        return (
          <a
            key={`${idx}-${part}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {part}
          </a>
        )
      }
      return <span key={`${idx}-${part}`}>{part}</span>
    })
  }

  const mine = msg.senderId === currentUserId
  const hasText = msg.content.trim().length > 0

  const renderAttachmentBlock = () => {
    const images: { url: string; isPending?: boolean }[] = []
    const files: {
      url: string
      name: string
      extension: string
      isPending?: boolean
    }[] = []

    if (msg._pending && msg._pendingAttachments) {
      msg._pendingAttachments.forEach((att) => {
        if (att.isImage && att.previewUrl) {
          images.push({ url: att.previewUrl, isPending: true })
        } else if (att.previewUrl) {
          const ext = getExtensionFromName(att.file.name)
          files.push({
            url: att.previewUrl,
            name: att.file.name,
            extension: ext,
            isPending: true,
          })
        }
      })
    } else {
      const urls = msg.images ?? []
      urls.forEach((url) => {
        if (isImageUrl(url)) {
          images.push({ url })
        } else {
          files.push({
            url,
            name: getFileNameFromUrl(url),
            extension: getExtensionFromUrl(url),
          })
        }
      })
    }

    if (images.length === 0 && files.length === 0) return null

    return (
      <>
        {images.length > 0 && (
          <div
            className={`grid gap-1 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {images.map((img, i) => (
              <img
                key={`${img.url}-${i}`}
                src={img.url}
                alt=""
                className={`cursor-pointer rounded-[12px] border border-white/20 object-cover transition-opacity hover:opacity-90 ${img.isPending ? "opacity-60" : ""} ${images.length === 1 ? "max-w-[220px]" : "h-[95px] w-[95px]"}`}
                onClick={() => onImageClick(img.url)}
              />
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div className="flex w-full flex-col gap-1.5">
            {files.map((file, i) => {
              const isAudioFile = audioExtensions.has(
                file.extension.toLowerCase()
              )
              const isVoiceRecord = file.name.startsWith("Vocale_")

              if (isAudioFile || isVoiceRecord) {
                return (
                  <div key={`${file.url}-${i}`} className="flex flex-col gap-1">
                    {isVoiceRecord && (
                      <span
                        className={`pl-1 text-[10px] font-medium ${mine ? "text-slate-500" : "text-slate-400"}`}
                      >
                        🎙 Message vocal
                      </span>
                    )}
                    <AudioPlayer src={file.url} mine={mine} />
                  </div>
                )
              }

              const meta = getFileMeta(
                file.name !== "fichier" ? file.name : file.url
              )
              const Icon = meta.icon

              return (
                <a
                  key={`${file.url}-${i}`}
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex w-full max-w-[280px] items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${mine ? "border-primary bg-primary text-white shadow-sm hover:bg-primary/90" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${mine ? "border-white/30 bg-white/20" : "border-slate-200 bg-slate-100"}`}
                  >
                    <Icon
                      className={`h-4 w-4 ${mine ? "text-white" : meta.iconClassName}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${mine ? "border-white/40 bg-white/10 text-white/90" : meta.badgeClassName}`}
                    >
                      {meta.label} · {file.extension}
                    </p>
                    <p className="mt-0.5 truncate text-xs" title={file.name}>
                      {file.name}
                    </p>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </>
    )
  }

  const hasAttachments =
    (msg._pending &&
      msg._pendingAttachments &&
      msg._pendingAttachments.length > 0) ||
    (msg.images && msg.images.length > 0)

  if (mine) {
    return (
      <div className="group mb-2 flex justify-end">
        {onDelete && !msg._pending && (
          <button
            onClick={() => onDelete(msg.id)}
            className="mr-2 self-center rounded-full p-1.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
            title="Supprimer ce message"
          >
            <Trash className="h-4 w-4" />
          </button>
        )}
        <div className="flex max-w-[85%] flex-col items-end gap-1 sm:max-w-md">
          {hasAttachments && renderAttachmentBlock()}
          {hasText && (
            <div
              className={`rounded-[18px_18px_4px_18px] px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-line text-white shadow-sm transition-opacity duration-300 ${msg._pending ? "bg-primary/30 opacity-60" : "bg-gradient-to-br from-primary to-primary/80"}`}
            >
              {renderTextWithLinks(msg.content)}
            </div>
          )}
          <div className="pr-1 text-[10px] text-slate-400">
            {msg._pending ? "Envoi..." : fmt(msg.createdAt)}
            {!msg._pending && (
              <span className="ml-1">
                {msg.viewBy?.length > 0 ? "✓✓" : "✓"}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-2 flex items-end justify-start gap-2">
      <UserAvatar user={msg.sender} size="md" />
      <div className="flex max-w-[85%] flex-col gap-0.5 sm:max-w-md">
        {msg.sender?.name && (
          <span className="pl-1 text-[11px] font-medium text-slate-500">
            {msg.sender.name}
          </span>
        )}
        {hasAttachments && renderAttachmentBlock()}
        {hasText && (
          <div className="rounded-[18px_18px_18px_4px] bg-white px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-line text-slate-800 shadow-sm">
            {renderTextWithLinks(msg.content)}
          </div>
        )}
        <div className="pl-1 text-[10px] text-slate-400">
          {fmt(msg.createdAt)}
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  const router = useRouter()
  const { data: session } = authClient.useSession()

  const [input, setInput] = useState("")
  const [sendingCount, setSendingCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([])
  const [selectedImageIdx, setSelectedImageIdx] = useState<number | null>(null)
  const [voiceHintVisible, setVoiceHintVisible] = useState(false)
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const pendingAttachmentsRef = useRef<PendingAttachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const markedDiscussionIdRef = useRef<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  const params = useSearchParams()
  const discussionId = params.get("di")

  const queryClient = useQueryClient()
  const { data: apiData, isLoading } = useDiscussionMessages(discussionId)
  const discussion = apiData?.data ?? null
  const discussionLoading = isLoading

  const messages: Message[] = (apiData?.data?.message ?? []) as Message[]
  const messageCount = messages.length
  const myWorkerId = session?.user?.workerId ?? ""
  const myUserId = session?.user?.id ?? ""

  const allConversationImages = messages
    .flatMap((m) => m.images ?? [])
    .filter((url) => isImageUrl(url))

  const handleImageClick = (url: string) => {
    const idx = allConversationImages.indexOf(url)
    if (idx !== -1) setSelectedImageIdx(idx)
  }

  const isGroup = !!discussion?.groupMessage
  const recipient = !isGroup
    ? discussion?.members?.find((m) => m.id !== myWorkerId)
    : null

  const handleTag = async () => {
    if (!recipient?.id || !discussionId) return
    const { ok, message } = await tagRecipient({
      recipientId: recipient.id,
      discussionId: discussionId,
    })
    if (ok) {
      toast.success("Notification envoyée avec succès")
    } else {
      toast.error(message || "Erreur lors de l'envoi de la notification")
    }
  }

  const handleTagGroup = async () => {
    if (!discussionId || !discussion?.members) return
    // On passe tous les workerIds — le serveur exclut automatiquement l'émetteur
    const participantWorkerIds = discussion.members.map((m: any) => m.id)
    const { ok, message } = await tagGroupMembers({
      discussionId: discussionId,
      participantWorkerIds,
    })
    if (ok) {
      toast.success(message || "Notifications envoyées à tous les membres")
    } else {
      toast.error(message || "Erreur lors de l'envoi des notifications")
    }
  }

  const handleMeet = async () => {
    if (isGeneratingMeet) return
    setIsGeneratingMeet(true)
    try {
      const res = await fetch("/api/google/meet", { method: "POST" })
      const json = await res.json()
      if (json.ok && json.data) {
        await handleSend(undefined, json.data)
        toast.success("Lien vidéo généré et envoyé")
      } else {
        toast.error(json.message || "Erreur lors de la génération du lien")
      }
    } catch {
      toast.error("Erreur de connexion au service Meet")
    } finally {
      setIsGeneratingMeet(false)
    }
  }

  const handleGroup = async () => {
    if (!recipient) return
    const { ok, message } = await createDiscussion({
      participants: [recipient],
      isGroup: true,
      groupName: `Groupe avec ${recipient.name}`,
    })
    if (ok) {
      toast.success("Groupe créé avec succès")
    } else {
      toast.error(message || "Erreur lors de la création du groupe")
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!discussionId) return

    // Mise à jour optimiste immédiate
    queryClient.setQueryData<DiscussionFullResponse>(
      messagingKeys.messages(discussionId),
      (old) => {
        if (!old?.data) return old
        return {
          ...old,
          data: {
            ...old.data,
            message: old.data.message.filter((m) => m.id !== messageId),
          },
        }
      }
    )

    try {
      const { deleteMessage } = await import("@/lib/actions/message/deleteMessage")
      const res = await deleteMessage(messageId)
      if (res.ok) {
        toast.success(res.message)
      } else {
        toast.error(res.message)
        queryClient.invalidateQueries({ queryKey: messagingKeys.messages(discussionId) })
      }
    } catch {
      toast.error("Erreur lors de la suppression")
      queryClient.invalidateQueries({ queryKey: messagingKeys.messages(discussionId) })
    }
  }

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments
  }, [pendingAttachments])

  useEffect(() => {
    return () => {
      pendingAttachmentsRef.current.forEach((attachment) => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
      })
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messageCount])

  useEffect(() => {
    if (!voiceHintVisible) return
    const timeout = setTimeout(() => setVoiceHintVisible(false), 2500)
    return () => clearTimeout(timeout)
  }, [voiceHintVisible])

  useEffect(() => {
    if (!discussionId || !session?.user?.id) return
    if (markedDiscussionIdRef.current === discussionId) return
    markedDiscussionIdRef.current = discussionId

    fetch(`/api/messages/${discussionId}`, {
      method: "PATCH",
      body: JSON.stringify({}),
    })
      .then(() => {
        router.refresh()
        queryClient.invalidateQueries({ queryKey: messagingKeys.messages(discussionId) })
      })
      .catch(() => {})
  }, [discussionId, router, session?.user?.id, queryClient])

  useEffect(() => {
    // No-op for now, removed body overflow and height calculation
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const newAttachments: PendingAttachment[] = files.map((file) => {
      const image = isImageFile(file)
      return {
        id: crypto.randomUUID(),
        file,
        isImage: image,
        previewUrl: URL.createObjectURL(file),
      }
    })

    setPendingAttachments((prev) => [...prev, ...newAttachments])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleRemoveAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((item) => item.id !== id)
    })
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")
    const s = (seconds % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.start(200)
      setIsRecording(true)
      setRecordingDuration(0)

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error("Error accessing microphone:", err)
      setErrorMsg("Impossible d'accéder au microphone")
    }
  }

  const handleStopAndSend = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        })
        mediaRecorderRef.current?.stream
          .getTracks()
          .forEach((track) => track.stop())

        const file = new File([audioBlob], `Vocale_${Date.now()}.webm`, {
          type: "audio/webm",
        })
        const attachment: PendingAttachment = {
          id: crypto.randomUUID(),
          file,
          isImage: false,
          previewUrl: URL.createObjectURL(file), // Important for preview, though we don't display it in UI before sending
        }

        handleSend(attachment)
      }
      mediaRecorderRef.current.stop()
      if (recordingIntervalRef.current)
        clearInterval(recordingIntervalRef.current)
      setIsRecording(false)
      setRecordingDuration(0)
    }
  }

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream
          .getTracks()
          .forEach((track) => track.stop())
      }
      mediaRecorderRef.current.stop()
      if (recordingIntervalRef.current)
        clearInterval(recordingIntervalRef.current)
      setIsRecording(false)
      setRecordingDuration(0)
      audioChunksRef.current = []
    }
  }

  const handleSend = async (
    extraAttachment?: PendingAttachment,
    overrideText?: string
  ) => {
    const text = overrideText ?? input.trim()
    const attachmentsToSend = extraAttachment
      ? [...pendingAttachments, extraAttachment]
      : [...pendingAttachments]
    const hasContent = text.length > 0 || attachmentsToSend.length > 0
    if (!hasContent || !discussionId || !session?.user?.id) return

    setErrorMsg(null)
    setSendingCount((prev) => prev + 1)
    if (!overrideText) setInput("")

    setPendingAttachments([])
    let sendSucceeded = false

    const tempId = crypto.randomUUID()
    const optimisticMsg: Message = {
      id: tempId,
      senderId: session.user.id,
      sender: {
        id: session.user.id,
        name: session.user.name ?? null,
        image: session.user.image ?? null,
      },
      content: text,
      images: attachmentsToSend
        .map((attachment) => attachment.previewUrl)
        .filter((url): url is string => Boolean(url)),
      createdAt: new Date().toISOString(),
      isView: false,
      viewBy: [],
      _pending: true,
      _pendingAttachments: attachmentsToSend,
    }

    queryClient.setQueryData<DiscussionFullResponse>(
      messagingKeys.messages(discussionId!),
      (old) => {
        if (!old?.data) return old
        return {
          ...old,
          data: {
            ...old.data,
            message: [...(old.data.message ?? []), optimisticMsg as never],
          },
        }
      }
    )

    try {
      const fileUrls: string[] = []

      // On upload chaque fichier côté client
      for (const attachment of attachmentsToSend) {
        try {
          const uniqueName = `${Date.now()}-${attachment.file.name}`
          const blob = await upload(uniqueName, attachment.file, {
            access: "public",
            handleUploadUrl: "/api/upload/blob",
          })
          fileUrls.push(blob.url)
        } catch (uploadError) {
          console.error(
            "Upload failed for file:",
            attachment.file.name,
            uploadError
          )
          throw new Error(
            `Échec de l'envoi du fichier: ${attachment.file.name}`
          )
        }
      }

      const res = await fetch(`/api/messages/${discussionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: text,
          fileUrls,
        }),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok)
        throw new Error(json?.message ?? "Erreur lors de l'envoi")

      sendSucceeded = true
      queryClient.invalidateQueries({ queryKey: messagingKeys.messages(discussionId!) })
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Une erreur est survenue")
      setPendingAttachments((prev) => [...attachmentsToSend, ...prev])
      queryClient.invalidateQueries({ queryKey: messagingKeys.messages(discussionId!) })
    } finally {
      if (sendSucceeded) {
        attachmentsToSend.forEach((attachment) => {
          if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
        })
      }
      setSendingCount((prev) => Math.max(0, prev - 1))
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = input.trim().length > 0 || pendingAttachments.length > 0

  const messagesWithSeparators = messages.flatMap((msg, index) => {
    const prev = messages[index - 1]
    const currentDay = new Date(msg.createdAt).toDateString()
    const previousDay = prev ? new Date(prev.createdAt).toDateString() : null
    const shouldInsertSeparator = !prev || previousDay !== currentDay

    if (!shouldInsertSeparator) {
      return [{ type: "message" as const, msg }]
    }

    return [
      {
        type: "separator" as const,
        label: formatDaySeparatorLabel(msg.createdAt),
        key: `sep-${currentDay}`,
      },
      { type: "message" as const, msg },
    ]
  })

  if (!session) {
    return <p></p>
  }

  if (!discussionId) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-2 p-4">
        <div className="relative h-54 w-54">
          <Image
            src={messengerIllustration}
            alt="illustration sur la page messagerie"
          />
        </div>
        <p className="text-center text-lg text-muted-foreground sm:text-xl">
          Sélectionnez une discussion
        </p>
      </div>
    )
  }

  return (
    <div
      id="chat-container"
      className="relative flex h-full w-full flex-col overflow-hidden bg-slate-50"
    >
      <Header
        discussion={discussion}
        onMenuOpen={() => setDrawerOpen(true)}
        isLoading={discussionLoading}
        currentUserId={myWorkerId}
      />

      <DrawerMenu
        open={drawerOpen}
        isGroup={discussion?.groupMessage ? true : false}
        onOpenChange={setDrawerOpen}
        discussion={discussion}
        currentUserId={myWorkerId}
        currentUserRole={session.user.role}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={() => setNotificationsEnabled((v) => !v)}
        onTag={isGroup ? handleTagGroup : handleTag}
        onMeet={handleMeet}
        onGroup={handleGroup}
        isGeneratingMeet={isGeneratingMeet}
      />

      <div
        className="flex flex-1 flex-col overflow-y-auto px-2 pt-3 sm:px-4"
        style={{
          paddingBottom: pendingAttachments.length > 0 ? "10.5rem" : "6.5rem",
        }}
      >
        {!discussion?.groupMessage && (
          <RecipientProfileHeader
            recipient={recipient}
            onTag={handleTag}
            onMeet={handleMeet}
            onGroup={handleGroup}
            isGeneratingMeet={isGeneratingMeet}
          />
        )}

        {isLoading ? (
          <div className="mt-4 flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
              >
                <div className="h-10 w-40 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-[60vh] flex-col items-center justify-center space-y-6">
            <div className="relative h-44 w-44 sm:h-54 sm:w-54">
              <Image
                src={messengerIllustration}
                alt="illustration sur la page messagerie"
              />
            </div>
            <p className="text-center text-lg text-muted-foreground sm:text-xl">
              Commencez la discussion
            </p>
          </div>
        ) : (
          messagesWithSeparators.map((item) => {
            if (item.type === "separator") {
              return (
                <div
                  key={item.key}
                  className="my-3 flex items-center justify-center"
                >
                  <div className="h-px flex-1 bg-slate-200/80" />
                  <span className="mx-3 text-[10px] tracking-[0.12em] text-slate-400 uppercase">
                    {item.label}
                  </span>
                  <div className="h-px flex-1 bg-slate-200/80" />
                </div>
              )
            }

            return (
              <Bubble
                key={item.msg.id}
                msg={item.msg}
                currentUserId={myUserId}
                currentWorkerId={myWorkerId}
                onImageClick={handleImageClick}
                onDelete={handleDeleteMessage}
              />
            )
          })
        )}

        {errorMsg && (
          <div className="mt-2 text-sm text-red-500">{errorMsg}</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="absolute bottom-0 z-40 w-full border-t border-slate-100 bg-white">
        <AttachmentPreviewBar
          attachments={pendingAttachments}
          onRemove={handleRemoveAttachment}
        />

        {voiceHintVisible && (
          <div className="px-3 pt-2 text-[11px] text-slate-500">
            Envoi vocal en préparation. Cette option sera bientôt disponible.
          </div>
        )}

        {sendingCount > 0 && (
          <div className="px-3 pt-2 text-[11px] text-slate-500">
            {sendingCount} envoi{sendingCount > 1 ? "s" : ""} en cours...
          </div>
        )}

        <div className="flex w-full items-center gap-2 px-2 py-3 sm:px-3">
          {isRecording ? (
            <>
              <Button
                variant="ghost"
                className="flex-shrink-0 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600"
                size="icon"
                onClick={handleCancelRecording}
              >
                <Trash className="h-5 w-5" />
              </Button>
              <div className="flex flex-1 animate-pulse items-center justify-center space-x-2 font-medium text-red-500">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span>{formatDuration(recordingDuration)}</span>
              </div>
              <Button
                className="flex-shrink-0 rounded-full bg-primary hover:bg-primary/90"
                size="icon"
                onClick={handleStopAndSend}
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
            </>
          ) : (
            <>
              <Button
                className="flex-shrink-0 rounded-full"
                variant="outline"
                size="icon"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <FilePlus className="h-4 w-4" />
              </Button>

              <Button
                className="flex-shrink-0 rounded-full"
                variant="outline"
                size="icon"
                type="button"
                onClick={startRecording}
                aria-label="Enregistrer un message vocal"
              >
                <Mic className="h-4 w-4" />
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

              <textarea
                ref={textareaRef}
                className="scrollbar-thin max-h-[150px] min-h-[40px] flex-1 resize-none rounded-[20px] border border-slate-200 bg-white px-4 py-2 text-sm placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:py-2.5"
                style={{ height: "40px" }}
                placeholder="Écrivez quelque chose"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
              />

              <Button
                className="flex-shrink-0 rounded-full"
                variant={canSend ? "default" : "outline"}
                onClick={() => handleSend()}
                disabled={!canSend}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {selectedImageIdx !== null && (
        <ImageLightbox
          images={allConversationImages}
          initialIndex={selectedImageIdx}
          onClose={() => setSelectedImageIdx(null)}
        />
      )}
    </div>
  )
}
