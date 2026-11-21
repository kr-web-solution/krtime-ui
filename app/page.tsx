"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/auth-storage";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getAccessToken() ? "/dashboard/" : "/login/");
  }, [router]);
  return (
    <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
      Redirecting…
    </div>
  );
}
