"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError, loginRequest } from "@/lib/api";
import { APP_NAME } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "admin@example.com",
      password: "ChangeMeNow!Admin1",
    },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      const session = await loginRequest(values.email, values.password);
      if (!["super_admin", "admin", "manager"].includes(session.role)) {
        setError("This account cannot access the admin console.");
        return;
      }
      router.replace("/dashboard/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof TypeError) {
        setError(
          "Cannot reach API. Check NEXT_PUBLIC_API_BASE_URL and that the API is running.",
        );
      } else {
        setError(err instanceof Error ? err.message : "Login failed");
      }
    }
  }

  return (
    <div className="bg-app-gradient grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-md border-border/70 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-12 w-12 rounded-md object-contain" />
            <p className="font-display text-3xl text-primary">{APP_NAME}</p>
          </div>
          <CardTitle className="mt-2">Admin sign in</CardTitle>
          <CardDescription>
            Manage sites, employees, devices, and attendance reviews.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email / username</Label>
              <Input id="email" type="email" autoComplete="username" {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
            </div>
            <p className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Local admin: <span className="font-medium text-foreground">admin@example.com</span>
              {" / "}
              <span className="font-medium text-foreground">ChangeMeNow!Admin1</span>
            </p>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
