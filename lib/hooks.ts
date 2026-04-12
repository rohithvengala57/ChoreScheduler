"use client";

import { useState, useCallback } from "react";

export function useAsync<T>(
  fn: (...args: unknown[]) => Promise<T>
): { run: (...args: unknown[]) => Promise<T | undefined>; loading: boolean; error: string | null } {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: unknown[]) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [fn]
  );

  return { run, loading, error };
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<{ data?: T; error?: string; warnings?: string[] }> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}
