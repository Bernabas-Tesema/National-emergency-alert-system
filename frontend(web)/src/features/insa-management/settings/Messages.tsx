export default function Messages({
  notice,
  error,
}: {
  notice: string
  error: string
}) {
  return (
    <>
      {notice && (
        <p className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </p>
      )}
    </>
  )
}