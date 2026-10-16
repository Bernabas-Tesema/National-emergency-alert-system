import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-slate-900">
          National Emergency Alert System
        </h1>
        <p className="mt-2 text-slate-600">Tailwind is working.</p>
        <Button className="mt-4">shadcn/ui is working</Button>
      </div>
    </div>
  )
}

export default App