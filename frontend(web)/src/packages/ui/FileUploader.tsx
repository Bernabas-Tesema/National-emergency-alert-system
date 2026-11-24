import React, { useRef, useState } from 'react'
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Film,
  X,
  RotateCcw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

export interface UploadedFileItem {
  id: string
  name: string
  size: number
  type: string
  url?: string
  progress: number
  status: 'uploading' | 'complete' | 'error'
  error?: string
}

export interface FileUploaderProps {
  value?: UploadedFileItem[]
  onChange?: (files: UploadedFileItem[]) => void
  maxSizeMb?: number
  accept?: string[]
  maxFiles?: number
  readOnly?: boolean
  className?: string
}

const DEFAULT_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/webm',
]

export function FileUploader({
  value = [],
  onChange,
  maxSizeMb = 25,
  accept = DEFAULT_ACCEPT,
  maxFiles = 5,
  readOnly = false,
  className = '',
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFileItem[]>(value)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateFiles = (nextFiles: UploadedFileItem[]) => {
    setFiles(nextFiles)
    onChange?.(nextFiles)
  }

  const handleProcessFile = (file: File) => {
    if (!accept.includes(file.type)) {
      alert(`File type not allowed: ${file.name}. Only PDF, images, and videos are accepted.`)
      return
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      alert(`File exceeds maximum size of ${maxSizeMb}MB: ${file.name}`)
      return
    }

    const newItem: UploadedFileItem = {
      id: `f-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'uploading',
      url: URL.createObjectURL(file),
    }

    const nextList = [...files, newItem]
    updateFiles(nextList)

    // Simulate progress
    let p = 0
    const interval = setInterval(() => {
      p += 25
      if (p >= 100) {
        clearInterval(interval)
        newItem.progress = 100
        newItem.status = 'complete'
        updateFiles([...files.filter((f) => f.id !== newItem.id), newItem])
      } else {
        newItem.progress = p
        updateFiles([...files.filter((f) => f.id !== newItem.id), newItem])
      }
    }, 150)
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (readOnly) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    droppedFiles.slice(0, maxFiles - files.length).forEach(handleProcessFile)
  }

  const handleRemove = (id: string) => {
    updateFiles(files.filter((f) => f.id !== id))
  }

  const handleRetry = (item: UploadedFileItem) => {
    item.status = 'uploading'
    item.progress = 20
    updateFiles([...files])
    setTimeout(() => {
      item.progress = 100
      item.status = 'complete'
      updateFiles([...files])
    }, 600)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-teal-400" />
    if (type.startsWith('video/')) return <Film className="w-5 h-5 text-orange-400" />
    return <FileText className="w-5 h-5 text-sky-400" />
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Drag & Drop Area */}
      {!readOnly && files.length < maxFiles && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            isDragOver
              ? 'border-teal-400 bg-[#133e42]/20'
              : 'border-[#1b2e34] bg-[#111d21] hover:border-teal-500/60 hover:bg-[#16282d]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept.join(',')}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                Array.from(e.target.files)
                  .slice(0, maxFiles - files.length)
                  .forEach(handleProcessFile)
              }
            }}
          />
          <UploadCloud className="w-8 h-8 text-teal-400 mb-2" />
          <p className="text-sm font-medium text-slate-200">
            Click to upload or drag & drop files
          </p>
          <p className="text-xs text-slate-400 mt-1">
            PDF, Images (JPG, PNG, WebP), or Videos (MP4) up to {maxSizeMb}MB
          </p>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 rounded-lg border border-[#1b2e34] bg-[#111d21] text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(file.type)}
                <div className="truncate">
                  <p className="font-medium text-slate-200 truncate">{file.name}</p>
                  <p className="text-slate-400">{formatSize(file.size)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {file.status === 'uploading' && (
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-teal-400 h-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                    <span className="text-slate-400">{file.progress}%</span>
                  </div>
                )}

                {file.status === 'complete' && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Uploaded</span>
                  </span>
                )}

                {file.status === 'error' && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span>Failed</span>
                    </span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRetry(file)}
                        className="text-slate-400 hover:text-white"
                        title="Retry upload"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemove(file.id)}
                    className="text-slate-400 hover:text-red-400 transition-colors p-1"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileUploader
