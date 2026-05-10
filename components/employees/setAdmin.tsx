import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

import { Worker } from '@/generated/prisma/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth-client'
import clsx from 'clsx'
import { UserStar } from 'lucide-react'
import { useState, useTransition } from 'react'

type Props = {
  data: Worker & { workAccount: { id: string } | null },
  isAlready: boolean
}

function SetAdminDialog({ data, isAlready }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSuccess, setIsSuccess] = useState<{ message: string; ok: undefined | boolean }>({
    message: '',
    ok: undefined,
  })

  const [openDialog, setOpenDialog] = useState(false)
  const clearMessage = () => {
    setIsSuccess({ ok: false, message: '' })
  }

  const closeDialog = () => {
    setOpenDialog(false)
  }
  const handleAdmin = async () => {
   
    if (!data.workAccount) {
      return null
    }

    if (isAlready) {
      const { error } = await authClient.admin.setRole({
        userId: data.workAccount.id,
        role: 'user',
      })
  
      if (error) {
        console.log(error)
        setIsSuccess({ message: "Une erreur s'est produite veuillez ressayer", ok: false })
        return
      }
  
      setIsSuccess({
        message: `L'employé(e) ${data.name} a perdu ses accès administrateur`,
        ok: true,
      })
      setTimeout(() => {
        clearMessage()
        closeDialog()
        router.refresh()
      }, 1000)
      return
    }

    const { error } = await authClient.admin.setRole({
      userId: data.workAccount.id,
      role: 'admin',
    })

    if (error) {
      console.log(error)
      setIsSuccess({ message: "Une erreur s'est produite veuillez ressayer", ok: false })

      return
    }

    setIsSuccess({
      message: `Felicitation ${data.name} a maintenant access au privilege administrateur`,
      ok: true,
    })
    setTimeout(() => {
      clearMessage()
      closeDialog()
      router.refresh()
    }, 1000)
  }
  return (
    <Dialog onOpenChange={closeDialog} open={openDialog}>
      <div className="flex flex-col space-y-2 cursor-pointer" onClick={() => setOpenDialog(true)}>
        {' '}
        <span className="flex  justify-between  w-full hover:bg-accent hover:text-accent-foreground transition-all py-2 px-0.5 rounded-lg">
        {isAlready ? `Supprimer des administrateurs` :` Ajouter aux administrateurs`}
          <UserStar size={16} />
        </span>
      </div>

      <DialogContent className='flex flex-col'>
        <DialogHeader>
          <DialogTitle>{isAlready ? `Supprimer des administrateurs` :` Accorder des autorisations administrateur`}</DialogTitle>

          <DialogDescription>
            Cette action donnera à l’utilisateur des droits administrateur supplémentaires. Veillez
            à confirmer que vous souhaitez lui accorder ces autorisations, car elles lui permettront
            d’effectuer des modifications sensibles au sein de l’application.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <div className="flex justify-end items-center space-x-4">
            <Button
              className="rounded-full"
              variant={'outline'}
              onClick={() => setOpenDialog(false)}
            >
              Annuler
            </Button>
            {!isSuccess.message && (
              <Button
                className="rounded-full"
                onClick={() =>
                  startTransition(async () => {
                    await handleAdmin()
                  })
                }
              >
                {isPending ? <Spinner /> : ` Ajouter comme admin`}
              </Button>
            )}
          </div>
        </DialogFooter>

       <div className='flex justify-center items-center'> {isSuccess.message && (
          <p className={clsx('font-medium', {
              'text-green-500': isSuccess.ok,
              'text-destructive': isSuccess.ok === false,
            })}>
            {isSuccess.message}
          </p>
        )} </div>
      </DialogContent>

    </Dialog>
  )
}

export default SetAdminDialog
