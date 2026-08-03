"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: string;
  email_verified: boolean;
  is_active: boolean;
  created_at: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setUsers(await api<AdminUser[]>("/api/admin/users"));
    } catch {
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setRole(u: AdminUser, role: string) {
    try {
      await api(`/api/admin/users/${u.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update role");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">Users</h1>
      <p className="mt-1 text-sm text-foreground/60">Member list and role management.</p>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-black/5 bg-white">
        {users === null ? (
          <Skeleton className="m-6 h-40" />
        ) : users.length === 0 ? (
          <div className="p-6"><EmptyState title="No users" /></div>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs font-semibold uppercase text-foreground/50">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Verified</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-black/5 last:border-0">
                  <td className="px-5 py-3 font-semibold text-forest">{u.full_name}</td>
                  <td className="px-5 py-3 text-foreground/70">{u.email}</td>
                  <td className="px-5 py-3">{u.email_verified ? "✓" : "—"}</td>
                  <td className="px-5 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => setRole(u, e.target.value)}
                      className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-sm outline-none"
                    >
                      <option value="member">member</option>
                      <option value="trip_leader">trip_leader</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-5 py-3 text-foreground/60">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}