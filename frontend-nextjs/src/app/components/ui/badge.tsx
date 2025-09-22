import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "destructive"
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2",
          {
            "border-transparent bg-slate-900 text-slate-50 hover:bg-slate-800":
              variant === "default",
            "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200":
              variant === "secondary",
            "border-slate-200 bg-white text-slate-900 hover:bg-slate-100":
              variant === "outline",
            "border-transparent bg-red-500 text-slate-50 hover:bg-red-600":
              variant === "destructive",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }