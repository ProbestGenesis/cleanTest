import React from "react"
import { prisma } from "@/lib/prisma"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, MapPin, Phone } from "lucide-react"

type Props = {}

export default async function PrestataireList({}: Props) {
  const prestataires = await prisma.prestataire.findMany()

  if (prestataires.length === 0) {
    return (
      <div className="p-6 text-center text-gray-600 flex items-cemter justify-center h-[50vh] w-full flex-col space-y-12">
        Aucun prestataire trouvé pour le moment.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-2 sm:p-4">
      {prestataires.map((p) => (
        <Card key={p.id} className="hover:shadow-lg transition">
          <CardHeader>
            <CardTitle>{p.name}</CardTitle>
            <CardDescription>{p.role}</CardDescription>
          </CardHeader>

          <CardContent>
            {p.description && (
              <p className="text-sm text-gray-600 mb-2">{p.description}</p>
            )}

            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Disponibilité :</span>{" "}
                {p.disponibility ? (
                  <Badge variant="default">Disponible</Badge>
                ) : (
                  <Badge variant="destructive">Indisponible</Badge>
                )}
              </p>
              <p>
                <span className="font-medium">Tarif journalier :</span>{" "}
                {p.dailyRate} FCFA
              </p>
              {p.phone && (
                <p className="flex items-center gap-1">
                  <Phone className="w-4 h-4" /> {p.phone}
                </p>
              )}
              {p.email && (
                <p className="flex items-center gap-1">
                  <Mail className="w-4 h-4" /> {p.email}
                </p>
              )}
              {p.address && (
                <p className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> {p.address}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter>
            <Button variant="default" disabled={!p.disponibility}>
              Contacter
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
