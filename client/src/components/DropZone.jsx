/**
 * DropShare — File Drop Zone Component
 */
import { useState, useCallback, useRef } from 'react';
import { formatBytes } from '../utils/fileUtils';

export default function DropZone({ onFileSelect }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile]         = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback((f) => {
    setFile(f);
    onFileSelect(f);
  }, [onFileSelect]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  return (
    <div>
      <div
        id="drop-zone"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3
          text-center transition-all duration-200
          ${dragging
            ? 'drop-zone-active'
            : 'border-surface-500 hover:border-brand-500 hover:bg-brand-600/5'}`}
      >
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all
          ${dragging ? 'bg-brand-600/30 scale-110' : 'bg-surface-700'}`}>
          <svg className={`w-7 h-7 transition-colors ${dragging ? 'text-brand-300' : 'text-slate-500'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        {file ? (
          <div className="space-y-1">
            <p className="font-medium text-slate-100">{file.name}</p>
            <p className="text-sm text-slate-500">{formatBytes(file.size)}</p>
            <p className="text-xs text-brand-400">Click to change file</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="font-medium text-slate-300">Drop file here or click to browse</p>
            <p className="text-sm text-slate-600">Any file type supported · Max 5 GB</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" className="hidden"
        onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
    </div>
  );
}
