"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Post } from "@/lib/types";
import { useAuth } from "@/components/auth-context";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { PostComposerModal } from "./PostComposerModal";

export default function CommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  const load = async (cursor?: string) => {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}&limit=10` : "?limit=10";
    const data = await api<{ posts: Post[]; next_cursor: string | null }>(`/api/posts${q}`);
    return data;
  };

  useEffect(() => {
    load()
      .then((d) => {
        setPosts(d.posts);
        setNextCursor(d.next_cursor);
      })
      .catch(() => setPosts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    const d = await load(nextCursor);
    setPosts((prev) => [...(prev ?? []), ...d.posts]);
    setNextCursor(d.next_cursor);
    setLoadingMore(false);
  };

  return (
    <>
      <section className="bg-forest-deep py-14 text-white">
        <div className="container-x flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/60">Community</p>
            <h1 className="text-3xl font-extrabold md:text-4xl">Stories from the trail</h1>
            <p className="mt-2 max-w-lg text-white/75">
              Photos, updates, and memories from club treks. Share your own.
            </p>
          </div>
          {user && (
            <button onClick={() => setShowComposer(true)} className="btn-trail">
              + New post
            </button>
          )}
        </div>
      </section>

      <section className="container-x py-12">
        {posts === null ? (
          <div className="grid gap-5 md:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            title="No posts yet"
            message={user ? "Be the first to share something from the trail." : "Check back soon — members are always sharing new stories."}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {posts.map((p) => (
              <Link key={p.id} href={`/community/${p.id}`} className="card group overflow-hidden p-0! transition-transform hover:-translate-y-1">
                {p.media_urls.length > 0 && (
                  <div className="h-56 bg-sand bg-cover bg-center" style={{ backgroundImage: `url(${p.media_urls[0]})` }} />
                )}
                <div className="space-y-3 p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-forest text-xs font-bold text-white">
                      {p.author.full_name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-forest">{p.author.full_name}</p>
                      <p className="text-xs text-foreground/50">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    {p.category_name && (
                      <span className="ml-auto rounded-full bg-forest/10 px-3 py-1 text-xs font-semibold text-forest">
                        {p.category_name}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-3 text-sm text-foreground/80">{p.caption || "View post"}</p>
                  <div className="flex items-center gap-4 text-xs font-medium text-foreground/60">
                    <span>♥ {p.like_count}</span>
                    <span>💬 {p.comment_count}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {nextCursor && (
          <div className="mt-8 text-center">
            <button onClick={loadMore} disabled={loadingMore} className="btn-ghost">
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </section>

      {showComposer && (
        <PostComposerModal
          onClose={() => setShowComposer(false)}
          onPosted={(post) => {
            setShowComposer(false);
            setPosts((prev) => [post, ...(prev ?? [])]);
          }}
        />
      )}
    </>
  );
}
