export default function PlaceholderPage({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="rounded-xl border border-[#1b2e34] bg-[#111d21] p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
      <p className="mt-2 text-xs text-slate-400">
        {description ?? 'This screen will be built in a later step.'}
      </p>
    </div>
  )
}