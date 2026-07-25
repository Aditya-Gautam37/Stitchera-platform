"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logout } from "@/lib/actions/auth";

type MenuProfile = {
  fullName: string | null;
  role: string;
} | null;

export function AccountMenu({ profile }: { profile: MenuProfile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!profile) {
    return (
      <Link
        href="/login"
        className="text-sm font-medium text-ink hover:text-indigo"
      >
        Sign in
      </Link>
    );
  }

  const dashboardHref = profile.role === "customer" ? "/dashboard" : "/admin";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1 text-sm font-medium text-ink hover:text-indigo"
      >
        {profile.fullName || "Account"}
        <svg
          viewBox="0 0 12 8"
          className={`h-2.5 w-2.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M1 1.5l5 5 5-5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-52 rounded-md border border-line bg-paper py-1 shadow-lg">
          <Link
            href={dashboardHref}
            className="block px-4 py-2 text-sm text-ink hover:bg-cotton"
            onClick={() => setOpen(false)}
          >
            Dashboard
          </Link>
          {profile.role === "customer" && (
            <>
              <Link
                href="/orders"
                className="block px-4 py-2 text-sm text-ink hover:bg-cotton"
                onClick={() => setOpen(false)}
              >
                My orders
              </Link>
              <Link
                href="/measurements"
                className="block px-4 py-2 text-sm text-ink hover:bg-cotton"
                onClick={() => setOpen(false)}
              >
                My measurements
              </Link>
            </>
          )}
          <form action={logout} className="border-t border-line-soft">
            <button
              type="submit"
              className="block w-full px-4 py-2 text-left text-sm text-ink-soft hover:bg-cotton"
            >
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
