"use client"

import React from "react"
import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { PackageSearch } from "lucide-react"

export const description = "Graphique de répartition du stock"

const chartConfig = {
  products: { label: "Produits" },
  inStock: { label: "Quantité suffisante", color: "#22c55e" },
  underThreshold: { label: "En dessous du seuil", color: "#f97316" },
  outOfStock: { label: "Rupture", color: "#ef4444" },
} satisfies ChartConfig

type ChartDatum = { status: string; products: number; label: string; fill?: string }

const SHORT_LABELS: Record<string, string> = {
  inStock: "Au dessus du sueil",
  underThreshold: "Faible quantité",
  outOfStock: "En rupture",
}


export function ChartPieLabel({
  inStockProducts,
  outOfStockProducts,
  lowerInStock,
  categoryData
}: {
  inStockProducts: number
  outOfStockProducts: number
  lowerInStock: number
  categoryData?: {
    inStock: { category: string; count: number }[]
    outOfStock: { category: string; count: number }[]
    lowerInStock: { category: string; count: number }[]
  }
}) {
  const totalProducts = inStockProducts + outOfStockProducts + lowerInStock;

  const chartData: ChartDatum[] = [
    { status: "inStock", products: inStockProducts, label: SHORT_LABELS.inStock, fill: "var(--color-inStock)" },
    { status: "underThreshold", products: lowerInStock, label: SHORT_LABELS.underThreshold, fill: "var(--color-underThreshold)" },
    { status: "outOfStock", products: outOfStockProducts, label: SHORT_LABELS.outOfStock, fill: "var(--color-outOfStock)" },
  ].filter((d) => d.products > 0)

  const renderLabel = ({
    cx,
    cy,
    midAngle,
    outerRadius,
    payload,
  }: any) => {
    const RADIAN = Math.PI / 180
    // Offset du label depuis le bord de la tranche
    const offset = 18
    const x = cx + (outerRadius + offset) * Math.cos(-midAngle * RADIAN)
    const y = cy + (outerRadius + offset) * Math.sin(-midAngle * RADIAN)
    const anchor = x > cx ? "start" : "end"

    return (
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        dominantBaseline="central"
        className="text-[11px] font-medium items-center flex space-x-2"
        fill="currentColor"
      >
        <tspan className="">{payload.label}</tspan>
        <tspan fontWeight="700"> {totalProducts > 0 ? ((payload.products / totalProducts) * 100).toFixed(1) : 0}%</tspan>
      </text>
    )
  }

  const CustomTooltipContent = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDatum;
      const statusKey = data.status === "underThreshold" ? "lowerInStock" : data.status as keyof typeof categoryData;
      const catsData = categoryData?.[statusKey] || [];
      
      return (
        <div className="bg-background border rounded-lg p-3 shadow-md flex flex-col gap-2 min-w-[200px] z-50">
          <p className="font-semibold text-sm border-b pb-1">
            {data.label} (Total: {data.products})
          </p>
          {catsData.length > 0 ? (
            <div className="flex flex-col gap-1">
              {catsData.map((c, i) => {
                const percentage = data.products > 0 ? ((c.count / data.products) * 100).toFixed(1) : 0;
                return (
                  <div key={i} className="flex justify-between items-center text-xs gap-4">
                    <span className="text-muted-foreground">{c.category || "Non catégorisé"}</span>
                    <span className="font-medium">{percentage}%</span>
                  </div>
                )
              })}
            </div>
          ) : (
             <p className="text-xs text-muted-foreground">Aucune donnée par catégorie</p>
          )}
        </div>
      )
    }
    return null;
  }


  return (
    <Card className="flex flex-col w-[360px] h-[260px] px-0 pt-2 pb-0 gap-0">
      <CardHeader className="flex flex-row justify-between items-center gap-2 py-0 px-4">
        <CardTitle className="text-xl">Répartition du stock</CardTitle>
        <PackageSearch className="w-6 h-6 text-muted-foreground" />
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 48, bottom: 0, left: 48 }}>
              <ChartTooltip content={<CustomTooltipContent />} cursor={false} />
              <Pie
                data={chartData}
                dataKey="products"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius="45%"
                outerRadius="62%"
                isAnimationActive={false}
                labelLine={false}
                label={renderLabel}
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={entry.fill}
                    style={{ transition: "fill .2s" }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>

      <CardFooter />
    </Card>
  )
}