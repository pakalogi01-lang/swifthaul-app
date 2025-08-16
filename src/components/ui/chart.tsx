"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend as RechartsLegend,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Chart Components
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config: ChartConfig
    title?: string
    description?: string
  }
>(({ config, title, description, className, children, ...props }, ref) => {
  const [activeChart, setActiveChart] = React.useState(
    () => Object.keys(config)[0]
  )

  return (
    <Card className={cn("flex flex-col", className)} {...props} ref={ref}>
      <CardHeader className="flex-row items-center gap-4 space-y-0 pb-2 [&>div]:flex-auto">
        <div className="flex flex-col gap-1.5">
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <RechartsLegend
          content={
            <div className="flex gap-4 self-end justify-self-end">
              {Object.entries(config).map(([key, config]) => {
                const color = `var(--color-${key})`
                return (
                  <button
                    key={key}
                    data-active={activeChart === key}
                    className="flex items-center gap-2 rounded-md p-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted data-[active=true]:bg-muted data-[active=true]:text-foreground"
                    onClick={() => {
                      setActiveChart(key)
                    }}
                  >
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{
                        backgroundColor: color,
                      }}
                    />
                    {config.label}
                  </button>
                )
              })}
            </div>
          }
          verticalAlign="top"
          align="right"
        />
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = RechartsTooltip;

// Tooltip
const chartTooltipVariants = cva(
  "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  {
    variants: {
      label: {
        default: "",
        none: "hidden",
      },
    },
    defaultVariants: {
      label: "default",
    },
  }
)

type ChartTooltipContentProps = TooltipProps<any, any> &
  VariantProps<typeof chartTooltipVariants> & {
    hideLabel?: boolean
    nameKey?: string
  }

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(
  (
    {
      active,
      payload,
      label,
      className,
      label: variantsLabel,
      hideLabel,
      nameKey,
      ...props
    },
    ref
  ) => {
    if (!active) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(chartTooltipVariants({ label: variantsLabel }), className)}
        {...props}
      >
        <div className="grid gap-1.5">
          {!hideLabel && (
            <div className="font-medium text-muted-foreground">{label}</div>
          )}
          {payload?.map((item, i) => {
            const key = `${nameKey || item.name || "value"}`
            const itemConfig = item.payload?.[key]
            const color = item.color || "hsl(var(--foreground))"

            return (
              <div
                key={item.dataKey}
                className="flex items-center gap-2 [&>svg]:size-2.5 [&>svg]:text-muted-foreground"
              >
                {itemConfig?.icon ? (
                  <itemConfig.icon />
                ) : (
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{
                      backgroundColor: color,
                    }}
                  />
                )}
                <div className="flex-1 space-y-1">
                  <div className="text-sm">{item.name}</div>
                </div>
                <div className="text-right font-mono text-sm tabular-nums">
                  {item.value}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

// Types
type ChartConfig = {
  [k in string]: {
    label: string
    icon?: React.ComponentType
  } & ({ color?: string } | { theme: Record<string, string> })
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  // Re-export all of recharts to make it easy to use.
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  // And the types
  type ChartConfig,
}
