"use client"

import { deleteDiscussionAction } from "@/lib/actions/message/deleteDiscussion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertCircle, Loader2 } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

type Props = {
  discussionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function DeleteDiscussion({
  discussionId,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const { ok, message } = await deleteDiscussionAction(discussionId)
        if (!ok) {
          toast.error(
            message || "Une erreur s'est produite lors de la suppression"
          )
        } else {
          toast.success(message)
          if (onSuccess) onSuccess()
          onOpenChange(false)
        }
      } catch {
        toast.error("Une erreur s'est produite lors de la suppression")
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[400px]">
        <AlertDialogHeader className="mx-auto flex flex-col items-center gap-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <AlertDialogTitle className="mx-auto text-center text-xl">
            Supprimer la discussion ?
          </AlertDialogTitle>
          <AlertDialogDescription className="mx-auto text-center">
            Cette action masquera la discussion de votre liste. Les autres
            participants pourront toujours la voir.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex w-full flex-row justify-center space-x-2 sm:justify-center">
          <AlertDialogCancel
            disabled={isPending}
            className="flex-1 rounded-full border-slate-200"
          >
            Annuler
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isPending}
            className="flex-1 rounded-full bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Suppression...
              </>
            ) : (
              "Supprimer"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteDiscussion
