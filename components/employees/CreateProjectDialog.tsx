'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useWorkers } from '@/lib/hooks/useWorkers'
import { createProject } from '@/lib/actions/projects/project'
import { useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FolderPlus, UserCheck, Users, Banknote } from 'lucide-react'
import { toast } from 'sonner'

interface CreateProjectDialogProps {
  children?: React.ReactNode
}

export default function CreateProjectDialog({ children }: CreateProjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: workers = [], isLoading: workersLoading } = useWorkers()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState<number>(0)
  const [chefId, setChefId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState<string>('')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)

  const handleToggleParticipant = (workerId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    )
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Le nom du projet est requis")
      return
    }
    if (!chefId) {
      toast.error("Veuillez sélectionner un chef de projet")
      return
    }

    setIsCreating(true)
    try {
      const res = await createProject({
        name,
        description,
        chefId,
        participantIds: selectedParticipants,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        budget,
      })

      if (res.ok) {
        toast.success(res.message)
        setIsOpen(false)
        // Reset form
        setName('')
        setDescription('')
        setChefId('')
        setSelectedParticipants([])
        // Refresh project lists
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      } else {
        toast.error(res.message)
      }
    } catch (error) {
      toast.error("Une erreur est survenue lors de la création")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <FolderPlus className="w-4 h-4" /> Créer un projet
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau projet</DialogTitle>
          <DialogDescription>
            Définissez les détails du projet et assignez les participants.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du projet</Label>
            <Input
              id="name"
              placeholder="Ex: Construction Villa A"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optionnel)</Label>
            <Textarea
              id="description"
              placeholder="Détails du projet..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget" className="flex items-center gap-2">
              <Banknote className="w-4 h-4" /> Budget Prévisionnel (XOF)
            </Label>
            <Input
              id="budget"
              type="number"
              placeholder="Ex: 500000"
              value={budget || ''}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin (Optionnel)</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Chef de projet
            </Label>
            <Select value={chefId} onValueChange={setChefId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le chef" />
              </SelectTrigger>
              <SelectContent>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Participants
            </Label>
            <ScrollArea className="h-[150px] border rounded-md p-2">
              {workersLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Spinner />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {workers.map((w) => (
                    <div key={w.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`worker-${w.id}`}
                        checked={selectedParticipants.includes(w.id)}
                        onCheckedChange={() => handleToggleParticipant(w.id)}
                      />
                      <Label
                        htmlFor={`worker-${w.id}`}
                        className="text-xs font-normal cursor-pointer"
                      >
                        {w.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? <Spinner className="mr-2" /> : <FolderPlus className="mr-2 w-4 h-4" />}
            Créer le projet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
