"use client"

import React, { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Mail, Phone, ExternalLink, Activity, ListTodo } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import type { Worker } from "@/generated/prisma/client"
import { WorkerData } from "@/lib/hooks/useWorkers"
import ListMenu from "@/components/ui/listMenu"
import { deleteWorker } from "@/lib/actions/workers/addWorker"
import { authClient } from "@/lib/auth-client"
import {
  getStatusLabel,
  getContractTypeLabel,
} from "@/lib/utils/employeeStatusColors"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

import SetAdminDialog from "./setAdmin"
import PageAccessDialog from "./pageAccessDialog"
import ParticularRoleDialog from "./particularRoleDialog"
import ResetPasswordDialog from "./resetPasswordDialog"
import IndividualAssignTasksDialog from "../tasks/IndividualAssignTasksDialog"
import ActivityDrawer from "./activityDrawer"
import PauseActivityDialog from "./pauseActivityDialog"
import ContractEndDialog from "./contractEndDialog"
import BanWorkerDialog from "./banDialog"

interface EmployeeCardProps {
  worker: WorkerData
}

export const EmployeeCard = ({ worker }: EmployeeCardProps) => {
  const { data: session } = authClient.useSession()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [isAssignOpen, setIsAssignOpen] = useState(false)

  const initials = worker.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const officialEnd = worker.officialEnd
    ? new Date(worker.officialEnd)
    : worker.contractDuration
      ? (() => {
          const d = new Date(worker.officalStart)
          d.setMonth(d.getMonth() + parseInt(worker.contractDuration))
          return d
        })()
      : null

  const isNearEnd = officialEnd
    ? officialEnd.getTime() - new Date().getTime() < 14 * 24 * 60 * 60 * 1000 &&
      officialEnd.getTime() - new Date().getTime() > 0
    : false

  const statusVariants: Record<
    string,
    "secondary" | "destructive" | "default" | "outline"
  > = {
    ACTIF: "secondary",
    INACTIF: "destructive",
    FIRED: "destructive",
    TIMEOFF: "outline",
    VACATION: "outline",
    SICK_LEAVE: "destructive",
  }

  const isAdmin = session?.user?.role === "superadmin"
  const workerForDialog = worker as unknown as Worker
  const workAccount = worker.workAccount as
    | (NonNullable<WorkerData["workAccount"]> & { particularRole?: string[] })
    | undefined
  const workerWithAccount = workerForDialog as Worker & {
    workAccount: { id: string; banned?: boolean | null } | null
  }

  const handleDelete = async (id: string) => {
    const result = await deleteWorker(id)

    if (result.ok) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workers"] }),
        queryClient.invalidateQueries({ queryKey: ["workerStats"] }),
      ])
      router.refresh()
    }

    return result
  }

  return (
    <Card className="relative overflow-hidden border bg-card transition-all hover:shadow-md dark:border-slate-800">
      <CardHeader className="pb-4">
        <div className="flex w-full justify-between">
          <Avatar className="size-16 border dark:border-slate-800">
            <AvatarImage src={worker.image ?? ""} className="object-cover" />
            <AvatarFallback className="bg-muted text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <ListMenu
            itemId={worker.id}
            deleteAction={handleDelete}
            showDelete={isAdmin}
            showEdit={
              isAdmin ||
              session?.user?.workRole?.toLowerCase() ===
                "assistant administratif"
            }
            page="worker"
            data={worker}
          >
            <div className="max-h-74">
              <ScrollArea className="h-70">
                {/* Groupe 1: Administration & Accès */}
                {isAdmin && (
                  <div className="flex flex-col space-y-1">
                    <p className="mb-1 px-1 text-[10px] font-bold tracking-tight text-slate-400 uppercase">
                      Administration & Accès
                    </p>
                    <SetAdminDialog
                      data={workerWithAccount}
                      isAlready={workAccount?.role === "admin"}
                    />

                    {workAccount && (
                      <>
                        <PageAccessDialog
                          userId={workAccount.id}
                          userName={worker.name}
                          initialAccess={workAccount.pageAccess || []}
                          userRole={workAccount.role}
                        />

                        <ParticularRoleDialog
                          workerId={workAccount.id}
                          userName={worker.name}
                          initialRoles={workAccount.particularRole || []}
                        />

                        <ResetPasswordDialog
                          workerId={worker.id}
                          workerName={worker.name}
                          matricule={worker.matricule}
                        />
                      </>
                    )}
                    <Separator className="my-2" />
                  </div>
                )}

                {/* Groupe 2: Gestion & Activité */}
                <div className="flex flex-col space-y-1">
                  <p className="mb-1 px-1 text-[10px] font-bold tracking-tight text-slate-400 uppercase">
                    Gestion & Activité
                  </p>
                  {isAdmin && (
                    <span
                      className="flex cursor-pointer justify-between rounded-lg px-2 py-2 transition-all hover:bg-accent hover:text-accent-foreground"
                      onClick={() => setIsAssignOpen(true)}
                    >
                      <p>Assigner une tâche</p>
                      <ListTodo size={18} />
                    </span>
                  )}

                  <ActivityDrawer workerId={worker.id}>
                    <span className="flex cursor-pointer justify-between rounded-lg px-2 py-2 transition-all hover:bg-accent hover:text-accent-foreground">
                      <p>Suivre l&apos;activité</p>
                      <Activity size={18} />
                    </span>
                  </ActivityDrawer>

                  <Link href={`/interne/employees/${worker.id}`}>
                    <span className="flex cursor-pointer justify-between rounded-lg px-2 py-2 transition-all hover:bg-accent hover:text-accent-foreground">
                      <p>Voir le profil</p>
                      <ExternalLink size={18} />
                    </span>
                  </Link>
                </div>

                {/* Groupe 3: Statut & Contrat */}
                {(isAdmin ||
                  session?.user?.workRole?.toLowerCase() ===
                    "assistant administratif") && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex flex-col space-y-1">
                      <p className="mb-1 px-1 text-[10px] font-bold tracking-tight text-slate-400 uppercase">
                        Statut & Contrat
                      </p>
                      <PauseActivityDialog data={workerForDialog} />
                      <ContractEndDialog data={workerForDialog} />
                      {isAdmin && (
                        <BanWorkerDialog
                          data={
                            workerWithAccount as Worker & {
                              workAccount: {
                                id: string
                                banned: boolean | null
                              } | null
                            }
                          }
                        />
                      )}
                    </div>
                  </>
                )}
              </ScrollArea>
            </div>
          </ListMenu>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg leading-none">
                {worker.name}
              </CardTitle>
              <Badge
                variant={statusVariants[worker.status] || "default"}
                className={cn(
                  "h-4 px-1.5 py-0 text-[10px]",
                  worker.status === "ACTIF" &&
                    "border-none bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                )}
              >
                {getStatusLabel(worker.status)}
              </Badge>
            </div>
            <CardDescription className="mt-1.5 text-sm font-medium text-muted-foreground">
              {worker.role}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-col space-y-2 rounded-lg bg-muted/30 p-3 dark:bg-slate-900/40">
          <div className="flex items-center space-x-3 overflow-hidden text-sm">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="truncate text-muted-foreground" title={worker.email}>
              {worker.email}
            </p>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">{worker.phone}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-2 text-[13px]">
          <span className="text-muted-foreground">Type de contrat</span>
          <span className="text-right font-medium">
            {getContractTypeLabel(worker.type)}
          </span>

          <span className="text-muted-foreground">Embauché le</span>
          <span className="text-right font-medium">
            {new Date(worker.officalStart).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>

          <span className="text-muted-foreground">Fin de contrat</span>
          <span
            className={cn(
              "text-right font-medium",
              isNearEnd
                ? "animate-pulse font-bold text-red-500"
                : "text-foreground"
            )}
          >
            {officialEnd
              ? officialEnd.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "Indéterminé"}
          </span>
        </div>

        {(isAdmin ||
          session?.user?.workRole?.toLowerCase() ===
            "assistant administratif") && (
          <div className="mt-2 animate-in border-t pt-2 transition-all duration-500 fade-in slide-in-from-top-1">
            <p className="mb-2 text-[10px] font-bold tracking-tight text-slate-400 uppercase">
              Infos Administration
            </p>
            <div className="flex justify-between text-[13px]">
              <span className="text-muted-foreground">Salaire Net</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {worker.salaryNet
                  ? new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "XOF",
                      minimumFractionDigits: 0,
                    }).format(worker.salaryNet)
                  : "Non défini"}
              </span>
            </div>
          </div>
        )}
      </CardContent>
      <IndividualAssignTasksDialog
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        worker={worker}
      />
    </Card>
  )
}
