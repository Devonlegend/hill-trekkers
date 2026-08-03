"use client";

import { useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import type { Post } from "@/lib/types";
import { ImageUploader } from "@/components/ImageUploader";

export function PostComposerModal({
  onClose,
  onPosted,
}: {
  onClose: () => void;
  onPosted: (post: Post) => void;
}) {
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<"public" | "members_only">("public");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const created = await api<{ id: string }>("/api/posts", {
        method: "POST",
        body: JSON.stringify({ caption, visibility, media_urls: mediaUrls, trip_id: null }),
      });
      const full = await api<Post>(`/api/posts/${created.id}`);
      onPosted(full);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const field = "w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-forest";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-forest">Share a post</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-black/5">✕</button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/50">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className={`${field} min-h-24 resize-y`}
              placeholder="What happened on the trail?"
            />
          </div>

          <ImageUploader value={mediaUrls} onChange={setMediaUrls} max={10} label="Photos (up to 10)" />

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/50">Visibility</label>
            <div className="flex gap-2">
              {(["public", "members_only"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    visibility === v ? "bg-forest text-white" : "bg-black/5 text-foreground/70"
                  }`}
                >
                  {v === "public" ? "🌍 Public" : "🔒 Members only"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-forest flex-1">
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
