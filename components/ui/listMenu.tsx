"use client"

import React, { ReactNode, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Edit, Ellipsis, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import DeleteAlerteDialog from "@/components/ui/delete-alert-dialog"
import AddWorkerDialog from "@/components/employees/addWorkerDialog"
import { TypeDialog } from "@/components/employees/addWorkerDialog"

type Props = {
  deleteAction: (id: string) => Promise<{
    message: string
    ok: boolean
  }>
  data: any
  itemId: string
  children?: ReactNode
  page: string
  showDelete?: boolean
  showEdit?: boolean
}

function ListMenu({
  deleteAction,
  itemId,
  children,
  page,
  data,
  showDelete = true,
  showEdit = true,
}: Props) {
  const [openDialog, setOpenDialog] = useState(false)

  const close = () => {
    setOpenDialog(false)
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant={"outline"} size={"icon-sm"} className="h-8 w-8">
            <Ellipsis className="h-4 w-4" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="flex max-w-[200px] flex-col space-y-2 text-sm">
          {children}
          {showEdit && (
            <span
              className="flex cursor-pointer justify-between rounded px-1.5 py-1 transition-all hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                setOpenDialog(true)
              }}
            >
              <p>Modifier</p>
              <Edit size={16} />
            </span>
          )}

          {showDelete && showEdit && <Separator orientation="horizontal" />}

          {showDelete && (
            <DeleteAlerteDialog action={() => deleteAction(itemId)}>
              <span className="flex cursor-pointer justify-between rounded px-1.5 py-1 text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground">
                <p>Supprimer</p>
                <Trash size={16} />
              </span>
            </DeleteAlerteDialog>
          )}
        </PopoverContent>
      </Popover>

      {/* Note: AddClientDialog is currently not found in the project structure */}
      {/* {page === "client" && <AddClientDialog isOpen={openDialog} onClose={close} type={TypeDialog.update} data={data} />} */}
      {page === "worker" && (
        <AddWorkerDialog
          isOpen={openDialog}
          onClose={close}
          type={TypeDialog.update}
          data={data}
        />
      )}
    </>
  )
}

export default ListMenu
