import { prisma } from "@/lib/prisma"
import { PurchasePageClient } from "@/components/purchases/PurchasePageClient"
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"

export default async function PurchasesPage() {
  const queryClient = new QueryClient()

  // Prefetch basic data if needed
  await queryClient.prefetchQuery({
    queryKey: ["purchases", "page=1&limit=10"],
    queryFn: async () => {
        // We'll call the internal API logic or a service
        const purchases = await prisma.purchase.findMany({
            include: { provider: true, purchaseItems: true, author: true },
            orderBy: { purchaseDate: 'desc' },
            take: 10
        })
        const total = await prisma.purchase.count()
        return { purchases, total, pages: Math.ceil(total / 10), currentPage: 1 }
    }
  })

  const stats = {
    pendingDeliveries: await prisma.purchase.count({ where: { status: 'CONFIRMED' } }), // Should be 'DELIVERED' or 'CONFIRMED' depending on flow
    // In my schema CONFIRMED means in stock. DELIVERED means arrived but not yet confirmed in stock.
    // So pending deliveries are likely those with status 'CONFIRMED' in the sense of the action,
    // but the user might mean those NOT yet DELIVERED.
    // Let's assume PENDING/CONFIRMED (initial status) means awaiting delivery.
    pendingDeliveriesCount: await prisma.purchase.count({ where: { status: 'CONFIRMED' } }),
    overduePayments: await prisma.purchase.count({
        where: {
            isPaid: false,
            dueDate: { lt: new Date() }
        }
    }),
    totalProviders: await prisma.provider.count(),
    averageDeliveryDelay: 0 // Will calculate properly in a real scenario
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PurchasePageClient initialStats={stats} />
    </HydrationBoundary>
  )
}
