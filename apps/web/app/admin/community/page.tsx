"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { formatDate } from "@/lib/format";

interface Report {
  id: string;
  reporter_name: string;
  reason?: string | null;
  post_caption?: string | null;
  post_id?: string | null;
  comment_body?: string | null;
  status: string;
  created_at: string | null;
}

export default function AdminCommunityPage() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [filter, setFilter] = useState("open");
  const [error, setError] = useState("");

  const load = useCallback(async (status: string) => {
    try {
      setReports(await api<Report[]>(`/api/admin/reports?status=${status}`));
    } catch {
      setReports([]);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [load, filter]);

  async function act(report: Report, action: "hide" | "remove" | "dismiss") {
    try {
      if (action === "dismiss") {
        await api(`/api/admin/reports/${report.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "dismissed" }),
        });
      } else if (report.post_id) {
        await api(`/api/admin/posts/${report.post_id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: action === "remove" ? "removed" : "hidden" }),
        });
        await api(`/api/admin/reports/${report.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "reviewed" }),
        });
      }
      await load(filter);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action failed");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">Community moderation</h1>
      <p className="mt-1 text-sm text-foreground/60">Review reports and hide or remove content.</p>

      <div className="mt-4 flex gap-2">
        {["open", "reviewed", "dismissed"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              filter === s ? "bg-forest text-white" : "bg-black/5 text-foreground/70"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-6 space-y-3">
        {reports === null ? (
          <Skeleton className="h-40" />
        ) : reports.length === 0 ? (
          <EmptyState title="All clear" message="No reports in this queue." />
        ) : (
          reports.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-forest">Reported by {r.reporter_name}</p>
                <span className="text-xs text-foreground/50">{formatDate(r.created_at)}</span>
              </div>
              <p className="mt-2 text-sm text-foreground/80">
                {r.post_caption ? `Post: "${r.post_caption}"` : r.comment_body ? `Comment: "${r.comment_body}"` : "Target unknown"}
              </p>
              {r.reason && (
                <p className="mt-1 text-xs text-foreground/50">Reason: {r.reason}</p>
              )}
              {filter === "open" && r.post_id && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => act(r, "hide")} className="btn-ghost px-4! py-2! text-xs">Hide</button>
                  <button onClick={() => act(r, "remove")} className="btn rounded bg-red-600 px-4! py-2! text-xs text-white hover:bg-red-700">Remove</button>
                  <button onClick={() => act(r, "dismiss")} className="btn-ghost px-4! py-2! text-xs">Dismiss</button>
                </div>
              )}
              {filter === "open" && r.post_id && (
                <button onClick={() => act(r, "dismiss")} className="mt-3 btn-ghost px-4! py-2! text-xs">Dismiss</button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}