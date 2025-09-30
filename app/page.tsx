import { Suspense } from "react"
import FormComponent from "@/components/form-component"

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <FormComponent />
    </Suspense>
  )
}