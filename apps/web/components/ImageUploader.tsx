"use client";

import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

export function ImageUploader({
  value,
  onChange,
  max = 10,
  multiple = true,
  label = "Photos",
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  multiple?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadFile(file: File): Promise<string> {
    const sign = await api<{
      url: string;
      method: string;
      fields: Record<string, string>;
      public_url: string;
    }>(
      `/api/uploads/sign?file_name=${encodeURIComponent(file.name)}&content_type=${encodeURIComponent(file.type || "image/jpeg")}`
    );
    const fd = new FormData();
    Object.entries(sign.fields || {}).forEach(([k, v]) => fd.append(k, v));
    fd.append("file", file);
    const res = await fetch(sign.url, { method: sign.method, body: fd });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json().catch(() => ({}));
    return data.secure_url || sign.public_url;
  }

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const remaining = max - value.length;
    const picked = Array.from(files).slice(0, remaining);
    if (picked.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const f of picked) urls.push(await uploadFile(f));
      onChange([...value, ...urls].slice(0, max));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-faint">{label}</label>
      {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {value.map((u, i) => (
          <button
            key={`${u}-${i}`}
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="group relative h-20 w-20 overflow-hidden rounded-xl border border-black/10 bg-sand bg-cover bg-center"
            style={{ backgroundImage: `url(${u})` }}
            title="Remove image"
          >
            <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
              <span className="text-xl text-white">✕</span>
            </span>
          </button>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="grid h-20 w-20 place-items-center rounded-xl border-2 border-dashed border-black/15 text-xs text-muted transition hover:border-forest hover:text-forest disabled:opacity-50"
          >
            {uploading ? "…" : "+"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
  );
}
