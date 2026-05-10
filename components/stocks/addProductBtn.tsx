"use client"
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import ProductDialog from './addProductDialog'

type Props = {}


function AddProductBtn({}: Props) {
    const [addWorkerDialog, setAddWorkerDialog]  = useState(false)

    const close = () => {
        setAddWorkerDialog(false)
    } 
  return (
    <>
        <Button className="rounded-full" onClick={() => setAddWorkerDialog(true)}>
            Ajouter un produit
      </Button>

       <ProductDialog onClose={close}  isOpen={addWorkerDialog} />
    </>
  )
} 

export default AddProductBtn