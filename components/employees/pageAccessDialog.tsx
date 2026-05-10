"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { updateUserPageAccess } from "@/lib/actions/workers/pageAccessMutation"
import {
  isDefaultPageAccess,
  normalizePageAccess,
  PAGE_ACCESS_OPTIONS,
} from "@/lib/pageAccess"
import { Settings2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface PageAccessDialogProps {
  userId: string
  userName: string
  initialAccess: string[]
  userRole?: string | null
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export default function PageAccessDialog({
  userId,
  userName,
  initialAccess,
  userRole,
  trigger,
  onSuccess,
}: PageAccessDialogProps) {
  if (userRole === "superadmin") return null

  const [selectedPages, setSelectedPages] = useState<string[]>(
    normalizePageAccess(initialAccess)
  )
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleTogglePage = (pageId: string) => {
    if (isDefaultPageAccess(pageId)) return

    setSelectedPages((prev) =>
      prev.includes(pageId)
        ? prev.filter((id) => id !== pageId)
        : [...prev, pageId]
    )
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const result = await updateUserPageAccess(
        userId,
        normalizePageAccess(selectedPages)
      )
      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        if (onSuccess) onSuccess()
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild className="w-full">
        {trigger || (
          <span className="flex w-full justify-between rounded-lg px-0.5 py-2 transition-all hover:bg-accent hover:text-accent-foreground">
            <p className="max-sm:hidden"> Gérer les accès</p>
            <Settings2 size={16} color="red" />
          </span>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gérer les accès pour {userName}</DialogTitle>
          <DialogDescription>
            Sélectionnez les pages auxquelles cet utilisateur peut accéder. Les
            pages Accueil, Messagerie, Employés et Stock sont toujours
            autorisées.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {PAGE_ACCESS_OPTIONS.map((page) => (
            <div key={page.id} className="flex items-center space-x-2">
              <Checkbox
                id={`${userId}-${page.id}`}
                checked={selectedPages.includes(page.id)}
                disabled={isDefaultPageAccess(page.id)}
                onCheckedChange={() => handleTogglePage(page.id)}
              />
              <Label
                htmlFor={`${userId}-${page.id}`}
                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {page.label}
              </Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="rounded-full"
          >
            {loading ? <Spinner /> : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
