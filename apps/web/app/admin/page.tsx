"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Category } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { ImageUploader } from "@/components/ImageUploader";
import { formatDate } from "@/lib/format";

interface AdminTrip {
  id: string;
  title: string;
  slug: string;
  status: string;
  start_date: string | null;
  capacity: number;
  seats_booked: number;
  category_name: string;
}

export default function AdminTripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<AdminTrip[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<AdminTrip[]>("/api/admin/trips")
      .then(setTrips)
      .catch(() => setTrips([]));
    api<Category[]>("/api/categories").then(setCategories).catch(() => {});
  }, []);

  async function toggleStatus(trip: AdminTrip) {
    const next = trip.status === "published" ? "draft" : "published";
    try {
      await api(`/api/admin/trips/${trip.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setTrips((prev) => prev?.map((t) => (t.id === trip.id ? { ...t, status: next } : t)) ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update status");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-forest">Trips</h1>
          <p className="mt-1 text-sm text-muted">Create and manage treks.</p>
        </div>
        <button onClick={() => setShowCreate((v) => !v)} className="btn-forest px-5! py-2!">
          {showCreate ? "Close" : "+ New trip"}
        </button>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {showCreate && (
        <TripForm
          categories={categories}
          onDone={(id) => {
            setShowCreate(false);
            router.push(`/admin/trips/${id}/pricing`);
          }}
        />
      )}

      <div className="mt-6 space-y-3">
        {trips === null ? (
          <Skeleton className="h-40" />
        ) : trips.length === 0 ? (
          <EmptyState title="No trips yet" message="Create your first trip to get started." />
        ) : (
          trips.map((t) => (
            <div key={t.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/trips/${t.id}/pricing`} className="font-bold text-forest hover:underline">
                  {t.title}
                </Link>
                <p className="mt-1 text-xs text-muted">
                  {t.category_name} · {formatDate(t.start_date)} · {t.seats_booked}/{t.capacity} booked
                  {t.status === "published" ? "" : " · draft"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => toggleStatus(t)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${
                    t.status === "published"
                      ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                      : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  }`}
                >
                  {t.status === "published" ? "Unpublish" : "Publish"}
                </button>
                <Link href={`/admin/trips/${t.id}/pricing`} className="btn-ghost px-4! py-2! text-xs">
                  Pricing tiers
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TripForm({ categories, onDone }: { categories: Category[]; onDone: (id: string) => void }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  const field = "w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-forest";
  const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-faint";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const slug = ((fd.get("title") as string) || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    try {
      const data = await api<{ id: string }>("/api/admin/trips", {
        method: "POST",
        body: JSON.stringify({
          category_id: fd.get("category_id"),
          title: fd.get("title"),
          slug,
          summary: fd.get("summary") || null,
          description: fd.get("description") || null,
          location: fd.get("location") || null,
          meeting_point: fd.get("meeting_point") || null,
          difficulty: fd.get("difficulty"),
          distance_km: fd.get("distance_km") ? Number(fd.get("distance_km")) : null,
          start_date: fd.get("start_date"),
          capacity: Number(fd.get("capacity")),
          status: "draft",
          cover_image_url: coverUrl[0] || null,
          media_urls: mediaUrls,
        }),
      });
      onDone(data.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create trip");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mt-6 grid gap-4 sm:grid-cols-2">
      {error && <p className="col-span-full rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      <div>
        <label className={label}>Title</label>
        <input name="title" required className={field} />
      </div>
      <div>
        <label className={label}>Category</label>
        <select name="category_id" required className={field}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={label}>Summary</label>
        <input name="summary" className={field} />
      </div>
      <div className="sm:col-span-2">
        <label className={label}>Description</label>
        <textarea name="description" rows={3} className={`${field} resize-y`} />
      </div>
      <div>
        <label className={label}>Location</label>
        <input name="location" maxLength={200} className={field} />
      </div>
      <div>
        <label className={label}>Meeting point</label>
        <input name="meeting_point" maxLength={255} className={field} />
      </div>
      <div>
        <label className={label}>Difficulty</label>
        <select name="difficulty" className={field} defaultValue="easy">
          <option value="easy">Easy</option>
          <option value="moderate">Moderate</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      <div>
        <label className={label}>Distance (km)</label>
        <input name="distance_km" type="number" step="0.1" min="0" max="9999.99" className={field} />
      </div>
      <div>
        <label className={label}>Start date</label>
        <input name="start_date" type="date" required className={field} />
      </div>
      <div>
        <label className={label}>Capacity</label>
        <input name="capacity" type="number" min={1} max={999999} required className={field} />
      </div>
      <div className="sm:col-span-2">
        <ImageUploader value={coverUrl} onChange={setCoverUrl} max={1} multiple={false} label="Cover image" />
      </div>
      <div className="sm:col-span-2">
        <ImageUploader value={mediaUrls} onChange={setMediaUrls} max={20} label="Gallery (up to 20)" />
      </div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={submitting} className="btn-forest">
          {submitting ? "Creating…" : "Create trip"}
        </button>
        <p className="mt-2 text-xs text-muted-faint">
          Next step: add pricing tiers before publishing.
        </p>
      </div>
    </form>
  );
}
