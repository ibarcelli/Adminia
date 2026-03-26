import { useState, useRef, type DragEvent } from 'react'

interface FileUploaderProps {
  onFileSelect: (file: File) => void
  loading: boolean
}

export function FileUploader({ onFileSelect, loading }: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'xlsx' && ext !== 'xls') {
      alert('Solo se aceptan archivos .xlsx o .xls')
      return
    }
    setFileName(file.name)
    setSelectedFile(file)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleImport() {
    if (selectedFile) onFileSelect(selectedFile)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <svg className="w-10 h-10 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {fileName ? (
          <p className="text-sm text-slate-700 font-medium">{fileName}</p>
        ) : (
          <p className="text-sm text-slate-500">
            Arrastra el extracto bancario aquí o haz click para seleccionar
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1">Formatos: .xlsx, .xls</p>
      </div>

      {selectedFile && (
        <button
          onClick={handleImport}
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Importando...' : 'Importar extracto'}
        </button>
      )}
    </div>
  )
}
