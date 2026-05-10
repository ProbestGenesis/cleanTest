'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { getPendingResetRequests, adminResetPassword } from '@/lib/actions/password-reset'
import { CheckCircle, Clock, RefreshCw, User } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

export default function PasswordRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const fetchRequests = async () => {
    setIsLoading(true)
    const res = await getPendingResetRequests()
    if (res.ok) {
      setRequests(res.data || [])
    } else {
      toast.error(res.error || "Erreur lors du chargement des demandes")
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleReset = async (requestId: string) => {
    startTransition(async () => {
      const res = await adminResetPassword(requestId)
      if (res.ok) {
        toast.success("Mot de passe réinitialisé au matricule")
        fetchRequests()
      } else {
        toast.error(res.error || "Erreur lors de la réinitialisation")
      }
    })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Demandes de réinitialisation</h1>
          <p className="text-muted-foreground text-sm">Gérez les demandes manuelles de réinitialisation de mot de passe.</p>
        </div>
        <Button variant="outline" onClick={fetchRequests} disabled={isLoading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
        </Button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Spinner />
          </div>
        ) : requests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground">Aucune demande en attente.</p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="overflow-hidden border-l-4 border-l-accent">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{request.user.name}</p>
                      <p className="text-xs text-muted-foreground">{request.user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-start sm:items-center gap-1 w-full sm:w-auto">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Matricule</span>
                    <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{request.user.matricule || 'N/A'}</span>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                    <Button 
                      onClick={() => handleReset(request.id)}
                      disabled={isPending}
                      size="sm"
                      className="bg-accent hover:bg-accent/90 rounded-full px-4"
                    >
                      {isPending ? <Spinner  /> : "Réinitialiser au matricule"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
