"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/auth-storage";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login/");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}
