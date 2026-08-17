"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth-context";
import type { Post } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";

export default function MyPostsPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[] | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api<{ posts: Post[] }>(`/api/posts?limit=50`);
      setPosts(data.posts.filter((p) => p.author.id === user.id));
    } catch {
      setPosts([]);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">My Posts</h1>
      <p className="mt-1 text-sm text-muted">Everything you&apos;ve shared on the community feed.</p>

      <div className="mt-6 space-y-4">
        {posts === null ? (
          <Skeleton className="h-40" />
        ) : posts.length === 0 ? (
          <EmptyState title="You haven't posted yet" message="Share something from your last trek." />
        ) : (
          posts.map((p) => (
            <Link key={p.id} href={`/community/${p.id}`} className="card flex items-center gap-4">
              {p.media_urls.length > 0 && (
                <div className="h-16 w-16 shrink-0 rounded-xl bg-sand bg-cover bg-center" style={{ backgroundImage: `url(${p.media_urls[0]})` }} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-forest">{p.caption || "Untitled post"}</p>
                <p className="mt-0.5 text-xs text-muted-faint">
                  {new Date(p.created_at).toLocaleDateString()} · {p.like_count} likes · {p.comment_count} comments
                </p>
              </div>
              <span className="text-xs font-semibold text-trail-deep">View →</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}