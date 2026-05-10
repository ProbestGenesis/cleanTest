import { StockPageClient } from "@/components/stocks/StockPageClient"
import StockTabs from "@/components/stocks/stockTabs"
import { Skeleton } from "@/components/ui/skeleton"
import { getStockHistoryQueryResponse } from "@/lib/actions/stock/query/historyQuery"
import { getStockQueryResponse } from "@/lib/actions/stock/query/query"
import { prisma } from "@/lib/prisma"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { Suspense } from "react"

function toSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function StockPage(props: Props) {
  const searchParams = await props.searchParams
  const totalProducts = await prisma.product.count()
  const pendingHistoryValidationsCount = await prisma.stockEditHistorique.count(
    {
      where: {
        status: { in: ["PENDING_VALIDATION", "AWAITING_CONFIRMATION"] },
      },
    }
  )

  const queryClient = new QueryClient()

  const invPage = Number(toSingleParam(searchParams.inv_page) || 1)
  const invSearch = toSingleParam(searchParams.inv_search)
  const invCategory = toSingleParam(searchParams.inv_cat)
  const invOption = toSingleParam(searchParams.inv_opt)

  const invSearchParamsObj = new URLSearchParams({
    page: String(invPage),
    limit: "25",
  })
  if (invSearch) invSearchParamsObj.set("search", invSearch)
  if (invCategory && invCategory !== "all")
    invSearchParamsObj.set("category", invCategory)
  if (invOption) invSearchParamsObj.set("option", invOption)
  const invQueryStr = invSearchParamsObj.toString()

  await queryClient.prefetchQuery({
    queryKey: ["stock", invQueryStr],
    queryFn: () =>
      getStockQueryResponse({
        page: invPage,
        limit: 25,
        search: invSearch,
        category: invCategory,
        option: invOption,
      }),
  })

  const hisPage = Number(toSingleParam(searchParams.his_page) || 1)
  const hisType = toSingleParam(searchParams.his_type) as any
  const hisValidation = toSingleParam(searchParams.his_val) || "all"

  const hisSearchParamsObj = new URLSearchParams({
    page: String(hisPage),
    limit: "25",
    validation: hisValidation,
    onlySales: "false",
  })
  if (hisType && hisType !== "all") hisSearchParamsObj.set("type", hisType)
  const hisQueryStr = hisSearchParamsObj.toString()

  await queryClient.prefetchQuery({
    queryKey: ["stock-history", hisQueryStr],
    queryFn: () =>
      getStockHistoryQueryResponse({
        page: hisPage,
        limit: 25,
        validation: "all",
        type: hisType,
        onlySales: false,
      }),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StockPageClient
        tabsSlot={
          <Suspense
            fallback={<Skeleton className="h-[400px] w-full rounded-xl" />}
          >
            <StockTabs
              totalProducts={totalProducts}
              searchParams={searchParams}
              pendingHistoryValidationsCount={pendingHistoryValidationsCount}
            />
          </Suspense>
        }
      />
    </HydrationBoundary>
  )
}
