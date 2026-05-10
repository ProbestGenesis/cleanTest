import { updateDiscussionInfo } from "@/lib/actions/message/group/udpateInfo"
import { Discussion } from "@/generated/prisma/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { upload } from "@vercel/blob/client"
import { Check, Pencil, X } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import React, {
  ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react"

type Props = {
  children?: ReactNode
  discussion: Discussion
  controlOpen?: boolean
  setControl?: any
  onUpdate?: (data: { name: string; image: string | undefined }) => void
}

function EditDiscussionInfo({
  children,
  discussion,
  onUpdate,
  controlOpen,
  setControl,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(discussion.name)
  const [previewImage, setPreviewImage] = useState<string | undefined>(
    discussion.image ?? undefined
  )
  const [imageFile, setImageFile] = useState<File | undefined>(undefined)
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(
    null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status?.ok) {
      const timer = setTimeout(() => {
        setOpen(false)
        setStatus(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [status, setOpen])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreviewImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        let imageUrl: string | undefined = undefined

        if (imageFile) {
          const uniqueName = `${Date.now()}-${imageFile.name}`
          const blob = await upload(uniqueName, imageFile, {
            access: "public",
            handleUploadUrl: "/api/upload/blob",
          })
          imageUrl = blob.url
        }

        const payloadImage = imageUrl ? imageUrl : undefined

        const res = await updateDiscussionInfo({
          name,
          image: payloadImage,
          discussionId: discussion.id,
        })
        setStatus(res)
        if (res.ok) {
          onUpdate?.({ name, image: imageUrl || previewImage })
          router.refresh()
        }
      } catch (error) {
        setStatus({
          ok: false,
          message: "Une erreur est survenue lors de la mise à jour.",
        })
        console.error("Failed to update discussion:", error)
      }
    })
  }

  const handleCancel = () => {
    setControl?.({ item: null, open: false })
    setName(discussion.name)
    setPreviewImage(discussion.image ?? undefined)
    setImageFile(undefined)
    setOpen(false)
    setStatus(null)
  }

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Dialog open={open || controlOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier les informations de la discussion</DialogTitle>

          <DialogDescription></DialogDescription>
        </DialogHeader>

        {status && (
          <div
            className={`flex items-center gap-2 rounded-lg p-3 text-xs font-medium ${
              status.ok
                ? "border border-emerald-100 bg-emerald-50 text-emerald-600"
                : "border border-red-100 bg-red-50 text-red-600"
            }`}
          >
            {status.ok ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            {status.message}
          </div>
        )}
        {/* Decorative header band */}

        {/* Avatar upload — overlaps the band */}
        <div className="flex flex-col gap-5 px-6 pb-2">
          <div className="flex items-end gap-4">
            <div className="group relative shrink-0">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-20 w-20 cursor-pointer overflow-hidden rounded-2xl shadow-lg ring-4 ring-white dark:ring-zinc-900"
              >
                {previewImage ? (
                  <Image
                    src={previewImage}
                    alt="Group"
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="from-background-foreground to-background-foreground flex h-full w-full items-center justify-center bg-gradient-to-br text-xl font-bold text-foreground">
                    {initials}
                  </div>
                )}
              </div>

              {/* Small camera badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-background-foreground absolute -right-1.5 -bottom-1.5 flex h-6 w-6 items-center justify-center rounded-full text-foreground shadow-md transition-colors"
              >
                <Pencil className="h-3 w-3" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            <div className="pb-1">
              <p className="mb-0.5 text-xs font-semibold tracking-wider text-violet-500 uppercase">
                Photo du groupe
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Cliquez pour changer l'image
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

          {/* Name field */}
          <div className="mt-0.5 mb-4 space-y-2">
            <Label
              htmlFor="group-name"
              className="text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400"
            >
              Nom du groupe
            </Label>
            <div className="relative">
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Entrez le nom du groupe…"
                maxLength={60}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-zinc-400 tabular-nums">
                {name.length}/60
              </span>
            </div>
          </div>

          {/* Actions */}
          <DialogFooter className="flex justify-between space-x-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
              className="rounded-full"
            >
              Annuler
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={isPending || !name.trim()}
              className="rounded-full"
            >
              {isPending ? <Spinner /> : <Check className="h-4 w-4" />}
              {isPending ? "Sauvegarde…" : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EditDiscussionInfo
