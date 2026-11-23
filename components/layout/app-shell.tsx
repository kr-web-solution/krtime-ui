"use client";

import { useEffect, useState } from "react";
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
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { APP_NAME } from "@/lib/config";
import { apiFetch, logoutRequest } from "@/lib/api";
import { getAccessToken, getStoredName } from "@/lib/auth-storage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Dashboard } from "@/lib/types";

type NavItem = { href: string; label: string; icon: LucideIcon };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/daily-attendance/", label: "Daily attendance", icon: ClipboardCheck },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/employees/", label: "Employees", icon: Users },
      { href: "/devices/", label: "Devices", icon: Smartphone },
    ],
  },
  {
    label: "Time",
    items: [
      { href: "/locations/", label: "Locations", icon: MapPin },
      { href: "/shifts/", label: "Shifts", icon: Clock3 },
      { href: "/holidays/", label: "Holidays", icon: Palmtree },
      { href: "/leave/", label: "Leave", icon: CalendarOff },
      { href: "/corrections/", label: "Corrections", icon: ClipboardPen },
    ],
  },
  {
    label: "Risk",
    items: [
      { href: "/reviews/", label: "Reviews", icon: ShieldAlert },
      { href: "/security/", label: "Security", icon: Siren },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/reports/", label: "Reports", icon: FileSpreadsheet },
      { href: "/settings/", label: "Settings", icon: Settings },
    ],
  },
];

function pathActive(pathname: string | null, href: string) {
  return Boolean(pathname?.startsWith(href.replace(/\/$/, "")));
}

function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: string | undefined;
  setTheme: (value: string) => void;
}) {
  return (
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
  );
}

function SideNav({
  pathname,
  exitCue,
  checkInCue,
  onNavigate,
}: {
  pathname: string | null;
  exitCue: number;
  checkInCue: number;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto" aria-label="Main">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          <div className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active = pathActive(pathname, item.href);
              const Icon = item.icon;
              const badge =
                item.href === "/security/"
                  ? exitCue + checkInCue
                  : item.href === "/dashboard/"
                    ? checkInCue
                    : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/15 text-primary shadow-[inset_3px_0_0_0_hsl(var(--secondary))]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 ? (
                    <span className="rounded-full bg-secondary/30 px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const name = getStoredName() ?? "Admin";
  const loggedIn = Boolean(getAccessToken());
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: dash } = useQuery({
    queryKey: ["dashboard-nav-cue"],
    queryFn: () => apiFetch<Dashboard>("/api/v1/admin/dashboard"),
    enabled: loggedIn,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const exitCue = dash?.geofence_exits_today ?? 0;
  const checkInCue = dash?.check_in_alerts_count ?? 0;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  async function onLogout() {
    await logoutRequest();
    router.replace("/login/");
  }

  const brand = (
    <div className="mb-6 flex items-center gap-3 px-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt={APP_NAME} className="h-10 w-10 rounded-md object-contain" />
      <div>
        <p className="font-display text-2xl tracking-tight text-primary">{APP_NAME}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Admin console</p>
      </div>
    </div>
  );

  const footer = (
    <div className="mt-4 space-y-2 border-t border-border pt-4">
      <p className="truncate px-2 text-xs text-muted-foreground">{name}</p>
      <div className="flex gap-2">
        <ThemeToggle theme={theme} setTheme={setTheme} />
        <Button type="button" variant="ghost" className="flex-1 justify-start" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-app-gradient text-foreground">
      <div className="flex w-full min-h-screen">
        {/* Desktop / tablet: always-on vertical sidebar */}
        <aside className="sticky top-0 z-20 hidden h-screen w-64 shrink-0 flex-col border-r border-border/70 bg-card/90 p-4 backdrop-blur md:flex">
          {brand}
          <SideNav pathname={pathname} exitCue={exitCue} checkInCue={checkInCue} />
          {footer}
        </aside>

        {/* Mobile drawer overlay */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/45"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col border-r border-border bg-card p-4 shadow-xl">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3 px-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt={APP_NAME}
                    className="h-9 w-9 shrink-0 rounded-md object-contain"
                  />
                  <div className="min-w-0">
                    <p className="font-display truncate text-xl tracking-tight text-primary">
                      {APP_NAME}
                    </p>
                    <p className="text-xs text-muted-foreground">Admin console</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Close menu"
                  className="shrink-0"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <SideNav
                pathname={pathname}
                exitCue={exitCue}
                checkInCue={checkInCue}
                onNavigate={() => setMobileOpen(false)}
              />
              {footer}
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-card/95 px-3 py-3 backdrop-blur md:hidden">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt={APP_NAME} className="h-8 w-8 rounded object-contain" />
              <p className="font-display text-xl text-primary">{APP_NAME}</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle theme={theme} setTheme={setTheme} />
              <Button type="button" variant="outline" size="sm" onClick={onLogout}>
                Log out
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
