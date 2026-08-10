"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Post } from "@/lib/types";
import { useAuth } from "@/components/auth-context";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Reveal } from "@/components/Reveal";
import { PostComposerModal } from "./PostComposerModal";
import { placeholderImage } from "@/lib/images";
import { Heart, ChatCircle, Plus } from "@phosphor-icons/react";

function formatPostDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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
      <section className="bg-forest-deep py-14 text-white md:py-16">
        <div className="container-x flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              Community
            </p>
            <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Stories from the trail
            </h1>
            <p className="mt-4 max-w-lg leading-relaxed text-white/70">
              Photos, updates, and memories from club treks. Share your own.
            </p>
          </div>
          {user && (
            <button onClick={() => setShowComposer(true)} className="btn-trail">
              <Plus size={16} weight="bold" />
              New post
            </button>
          )}
        </div>
      </section>

      <section className="container-x py-12 md:py-16">
        {posts === null ? (
          <div className="grid gap-5 md:grid-cols-2">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            title="No posts yet"
            message={user ? "Be the first to share something from the trail." : "Check back soon. Members are always sharing new stories."}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {posts.map((p, i) => (
              <Reveal key={p.id} delay={(i % 2) * 70}>
                <Link
                  href={`/community/${p.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className="relative overflow-hidden">
                    <div
                      className="aspect-[4/3] bg-sand bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]"
                      style={{
                        backgroundImage: `url(${p.media_urls[0] || placeholderImage(p.id, 800, 600)})`,
                      }}
                    />
                    {p.category_name && (
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-forest backdrop-blur">
                        {p.category_name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-forest text-xs font-bold text-white">
                        {p.author.full_name.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-forest">{p.author.full_name}</p>
                        <p className="text-xs text-foreground/50">{formatPostDate(p.created_at)}</p>
                      </div>
                    </div>
                    <p className="line-clamp-3 text-sm leading-relaxed text-foreground/80">
                      {p.caption || "View post"}
                    </p>
                    <div className="mt-auto flex items-center gap-5 text-xs font-medium text-foreground/55">
                      <span className={`inline-flex items-center gap-1.5 ${p.liked_by_me ? "text-trail-deep" : ""}`}>
                        <Heart size={14} weight={p.liked_by_me ? "fill" : "regular"} />
                        {p.like_count}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <ChatCircle size={14} />
                        {p.comment_count}
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}

        {nextCursor && (
          <div className="mt-10 text-center">
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
