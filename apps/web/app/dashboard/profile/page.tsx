"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/components/auth-context";
import { api, ApiError } from "@/lib/api";
import { ImageUploader } from "@/components/ImageUploader";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<string[]>(user?.avatar_url ? [user.avatar_url] : []);

  if (!user) return null;

  const field = "w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-forest";
  const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-faint";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const fd = new FormData(e.currentTarget);
    const nextAvatar = avatar[0] ?? null;
    try {
      await api<{ user: { id: string } }>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fd.get("full_name"),
          phone: fd.get("phone") || null,
          emergency_contact_name: fd.get("emergency_contact_name") || null,
          emergency_contact_phone: fd.get("emergency_contact_phone") || null,
          medical_notes: fd.get("medical_notes") || null,
          avatar_url: nextAvatar,
        }),
      });
      setUser({ ...user!, full_name: fd.get("full_name") as string, phone: fd.get("phone") as string, avatar_url: nextAvatar });
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">Profile & safety</h1>
      <p className="mt-1 text-sm text-muted">Keep your emergency and medical info up to date.</p>

      <form onSubmit={onSubmit} className="card mt-6 space-y-4">
        {message && <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</p>}
        {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

        <ImageUploader value={avatar} onChange={setAvatar} max={1} multiple={false} label="Profile photo" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Full name</label>
            <input name="full_name" defaultValue={user.full_name} className={field} />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input name="phone" defaultValue={user.phone ?? ""} className={field} />
          </div>
        </div>

        <div className="rounded-xl bg-sand/70 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-faint">Emergency contact</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Name</label>
              <input name="emergency_contact_name" className={field} />
            </div>
            <div>
              <label className={label}>Phone</label>
              <input name="emergency_contact_phone" className={field} />
            </div>
          </div>
        </div>

        <div>
          <label className={label}>Medical notes (optional)</label>
          <textarea name="medical_notes" rows={3} className={`${field} resize-y`} placeholder="Allergies, medications, conditions — only shared with your trip leader." />
        </div>

        <button type="submit" disabled={saving} className="btn-forest">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}