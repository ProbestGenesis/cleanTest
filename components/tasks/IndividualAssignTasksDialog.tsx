import React from 'react'

export default function IndividualAssignTasksDialog({ isOpen, onClose, worker }: any) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background p-6 rounded-lg max-w-sm w-full shadow-lg">
        <h2 className="text-lg font-semibold mb-2">Assigner une tâche</h2>
        <p className="text-sm text-muted-foreground mb-4">Fonctionnalité d'assignation de tâche pour {worker?.name} à implémenter.</p>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
