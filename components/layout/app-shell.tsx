"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Moon,
  Sun,
  Users,
  Smartphone,
  LogOut,
  Clock3,
  Settings,
  ShieldAlert,
  CalendarOff,
  FileSpreadsheet,
  ClipboardPen,
  Palmtree,
  Siren,
  ClipboardCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { APP_NAME } from "@/lib/config";
import { apiFetch, logoutRequest } from "@/lib/api";
import { getAccessToken, getStoredName } from "@/lib/auth-storage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Dashboard } from "@/lib/types";

const nav = [
  { href: "/dashboard/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daily-attendance/", label: "Daily attendance", icon: ClipboardCheck },
  { href: "/locations/", label: "Locations", icon: MapPin },
  { href: "/employees/", label: "Employees", icon: Users },
  { href: "/devices/", label: "Devices", icon: Smartphone },
  { href: "/shifts/", label: "Shifts", icon: Clock3 },
  { href: "/holidays/", label: "Holidays", icon: Palmtree },
  { href: "/leave/", label: "Leave", icon: CalendarOff },
  { href: "/corrections/", label: "Corrections", icon: ClipboardPen },
  { href: "/reviews/", label: "Reviews", icon: ShieldAlert },
  { href: "/security/", label: "Security", icon: Siren },
  { href: "/reports/", label: "Reports", icon: FileSpreadsheet },
  { href: "/settings/", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const name = getStoredName() ?? "Admin";
  const loggedIn = Boolean(getAccessToken());
  const { data: dash } = useQuery({
    queryKey: ["dashboard-nav-cue"],
    queryFn: () => apiFetch<Dashboard>("/api/v1/admin/dashboard"),
    enabled: loggedIn,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const exitCue = dash?.geofence_exits_today ?? 0;

  async function onLogout() {
    await logoutRequest();
    router.replace("/login/");
  }

  return (
    <div className="min-h-screen bg-app-gradient text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1400px] gap-0 md:gap-6 md:px-4 md:py-4">
        <aside className="hidden w-60 shrink-0 flex-col rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur md:flex">
          <div className="mb-8 flex items-center gap-3 px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-10 w-10 rounded-md object-contain" />
            <div>
              <p className="font-display text-2xl tracking-tight text-primary">
                {APP_NAME}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Admin console</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
            {nav.map((item) => {
              const active = pathname?.startsWith(item.href.replace(/\/$/, ""));
              const Icon = item.icon;
              const showBadge = item.href === "/security/" && exitCue > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/15 text-primary shadow-[inset_3px_0_0_0_hsl(var(--secondary))]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {showBadge ? (
                    <span className="rounded-full bg-secondary/30 px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                      {exitCue}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <p className="truncate px-2 text-xs text-muted-foreground">{name}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Toggle theme"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-4 w-4 dark:hidden" />
                <Moon className="hidden h-4 w-4 dark:block" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="flex-1 justify-start"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border/60 bg-card/70 px-4 py-3 backdrop-blur md:hidden">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="h-8 w-8 rounded object-contain" />
              <p className="font-display text-xl text-primary">{APP_NAME}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onLogout}>
              Log out
            </Button>
          </header>
          <nav
            className="flex gap-1 overflow-x-auto border-b border-border/60 bg-card/50 px-2 py-2 md:hidden"
            aria-label="Mobile"
          >
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium",
                  pathname?.startsWith(item.href.replace(/\/$/, ""))
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground",
                )}
              >
                {item.label}
                {item.href === "/security/" && exitCue > 0 ? ` (${exitCue})` : ""}
              </Link>
            ))}
          </nav>
          <main className="flex-1 p-4 md:rounded-2xl md:border md:border-border/70 md:bg-card/70 md:p-6 md:shadow-sm md:backdrop-blur">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
