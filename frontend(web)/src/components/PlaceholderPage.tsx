export default function PlaceholderPage({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="rounded-xl bg-white p-8 shadow">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">
        {description ?? 'This screen will be built in a later step.'}
      </p>
    </div>
  )
}