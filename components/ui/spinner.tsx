import { cn } from "@/lib/utils"

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin",
        className
      )}
    />
  )
}