"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/components/auth-context";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import type { Post } from "@/lib/types";

interface PostDetail extends Post {
  comments: { id: string; body: string; author_name: string; created_at: string }[];
}

export default function PostDetailPage() {
  const params = useParams<{ postId: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [error, setError] = useState(false);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const load = useCallback(async () => {
    try {
      setPost(await api<PostDetail>(`/api/posts/${params.postId}`));
    } catch {
      setError(true);
    }
  }, [params.postId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !post) {
    return (
      <div className="container-x py-20">
        <EmptyState title="Post not found" message="It may have been removed by a moderator." />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container-x py-12">
        <Skeleton className="h-96" />
      </div>
    );
  }

  async function toggleLike() {
    if (!user || !post) return;
    const data = await api<{ liked: boolean; like_count: number }>(`/api/posts/${post.id}/like`, { method: "POST" });
    setPost({ ...post, liked_by_me: data.liked, like_count: data.like_count });
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !post) return;
    setCommentError("");
    try {
      await api(`/api/posts/${post.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: comment }),
      });
      setComment("");
      await load();
    } catch (err) {
      setCommentError(err instanceof ApiError ? err.message : "Failed to comment");
    }
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !post) return;
    await api(`/api/posts/${post.id}/report`, {
      method: "POST",
      body: JSON.stringify({ reason: reportReason }),
    });
    setReportOpen(false);
    setReportReason("");
  }

  return (
    <div className="container-x max-w-3xl py-12">
      <Link href="/community" className="text-sm text-foreground/60 hover:underline">← Back to community</Link>

      <article className="card mt-6 overflow-hidden !p-0">
        <div className="flex items-center gap-3 border-b border-black/5 p-5">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-forest text-sm font-bold text-white">
            {post.author.full_name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="font-semibold text-forest">{post.author.full_name}</p>
            <p className="text-xs text-foreground/50">{new Date(post.created_at).toLocaleDateString()}</p>
          </div>
          {post.category_name && (
            <span className="ml-auto rounded-full bg-forest/10 px-3 py-1 text-xs font-semibold text-forest">
              {post.category_name}
            </span>
          )}
        </div>

        {post.media_urls.length > 0 && (
          <div className="grid gap-1 bg-black/5">
            {post.media_urls.length === 1 ? (
              <img src={post.media_urls[0]} alt="Post" className="max-h-[32rem] w-full object-cover" />
            ) : (
              <div className={`grid gap-1 ${post.media_urls.length === 2 ? "grid-cols-2" : "grid-cols-2"}`}>
                {post.media_urls.slice(0, 4).map((u, i) => (
                  <img key={i} src={u} alt="Post" className="aspect-square w-full object-cover" />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-5">
          {post.caption && <p className="whitespace-pre-wrap leading-relaxed text-foreground/80">{post.caption}</p>}

          <div className="mt-4 flex items-center gap-3 text-sm">
            <button
              onClick={toggleLike}
              className={`rounded-full px-4 py-2 font-semibold transition-colors ${
                post.liked_by_me ? "bg-trail text-white" : "bg-black/5 text-foreground/80 hover:bg-black/10"
              }`}
            >
              {post.liked_by_me ? "♥ Liked" : "♡ Like"} · {post.like_count}
            </button>
            {user && (
              <button onClick={() => setReportOpen((v) => !v)} className="rounded-full px-4 py-2 font-medium text-foreground/50 hover:bg-black/5">
                Report
              </button>
            )}
          </div>

          {reportOpen && (
            <form onSubmit={submitReport} className="mt-3 rounded-xl bg-red-50 p-4">
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm outline-none"
                placeholder="Why are you reporting this?"
                required
              />
              <div className="mt-2 flex gap-2">
                <button type="submit" className="btn rounded bg-red-600 !px-4 !py-2 text-white hover:bg-red-700">Submit report</button>
                <button type="button" onClick={() => setReportOpen(false)} className="btn-ghost !px-4 !py-2">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </article>

      {/* Comments */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-forest">
          Comments <span className="text-sm font-normal text-foreground/50">({post.comment_count})</span>
        </h2>

        {user && (
          <form onSubmit={submitComment} className="card mt-4">
            {commentError && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{commentError}</p>}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-forest"
              placeholder="Add a comment…"
              rows={2}
              required
            />
            <div className="mt-2 text-right">
              <button type="submit" className="btn-forest !px-5 !py-2">Comment</button>
            </div>
          </form>
        )}

        {!user && (
          <p className="mt-4 text-sm text-foreground/60">
            <Link href="/login" className="font-semibold text-trail-deep hover:underline">Sign in</Link> to like or comment.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {post.comments.length === 0 ? (
            <p className="text-sm text-foreground/50">No comments yet.</p>
          ) : (
            post.comments.map((c) => (
              <div key={c.id} className="card !p-4">
                <p className="text-sm font-semibold text-forest">{c.author_name}</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground/80">{c.body}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
