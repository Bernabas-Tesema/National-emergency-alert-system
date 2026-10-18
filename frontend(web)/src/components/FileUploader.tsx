import { useRef, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'

const MAX_SIZE_MB = 25

function isAccepted(file: File) {
  return (
    file.type === 'application/pdf' ||
    file.type.startsWith('image/') ||
    file.type.startsWith('video/')
  )
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface FileUploaderProps {
  files: File[]
  onChange: (files: File[]) => void
}

export default function FileUploader({ files, onChange }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  function handleSelect(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    const problems: string[] = []
    const accepted: File[] = []

    for (const file of picked) {
      const duplicate = files.some(
        (f) => f.name === file.name && f.size === file.size,
      )
      if (!isAccepted(file)) {
        problems.push(`${file.name}: only PDF, image or video files are allowed`)
      } else if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        problems.push(`${file.name}: larger than ${MAX_SIZE_MB} MB`)
      } else if (!duplicate) {
        accepted.push(file)
      }
    }

    setError(problems.join('. '))
    if (accepted.length > 0) onChange([...files, ...accepted])
    e.target.value = '' // lets the user pick the same file again later
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf,image/*,video/*"
        className="hidden"
        onChange={handleSelect}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
      >
        Add attachments
      </Button>
      <p className="text-xs text-slate-500">
        PDF, images or video. Up to {MAX_SIZE_MB} MB each.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {files.length > 0 && (
        <ul className="divide-y divide-[#1b2e34] rounded-lg border border-[#1b2e34] bg-[#111d21]">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}`}
              className="flex items-center justify-between px-3 py-2 text-xs"
            >
              <span className="truncate text-slate-200 font-medium">
                {file.name}{' '}
                <span className="text-slate-400">({formatSize(file.size)})</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}