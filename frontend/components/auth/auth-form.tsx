"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authErrorMessage, createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-path";

export type AuthMode = "login" | "signup";

const emailField = z.string().trim().min(1, "Enter your email address").email("That doesn't look like an email address");

const schema = z.object({
  email: emailField,
  name: z.string().trim().max(120).optional(),
  password: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const COPY = {
  login: {
    heading: "Welcome back",
    sub: "Sign in to see what your home used this month.",
    magicButton: "Email me a sign-in link",
    passwordButton: "Sign in",
    switchText: "New here?",
    switchLabel: "Create an account",
    switchHref: "/signup",
  },
  signup: {
    heading: "Start tracking your home",
    sub: "Electricity, water and cooking gas in one place — free, and yours alone.",
    magicButton: "Email me a sign-up link",
    passwordButton: "Create account",
    switchText: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/login",
  },
} as const;

/**
 * Sign-in and sign-up, magic link first with a password disclosure underneath.
 *
 * Both modes talk to Supabase from the browser so the session cookie is written
 * by the same client the proxy reads. Email links land on `/auth/confirm`,
 * which exchanges the token and forwards to `next`.
 */
export function AuthForm({ mode }: { mode: AuthMode }) {
  const copy = COPY[mode];
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next")) ?? "/";
  const linkExpired = params.get("error") === "link_expired";

  const [usePassword, setUsePassword] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(
    linkExpired ? "That link has expired or was already used. Send yourself a new one." : null,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", name: "", password: "" },
  });
  const { isSubmitting } = form.formState;

  function redirectUrl(): string {
    const url = new URL("/auth/confirm", window.location.origin);
    if (next !== "/") url.searchParams.set("next", next);
    return url.toString();
  }

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const supabase = createClient();
    const email = values.email.trim().toLowerCase();
    const name = values.name?.trim() || undefined;

    try {
      if (usePassword) {
        const password = values.password ?? "";
        if (password.length < 8) {
          form.setError("password", { message: "Use at least 8 characters" });
          return;
        }
        if (mode === "signup") {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: name ? { full_name: name } : undefined, emailRedirectTo: redirectUrl() },
          });
          if (error) throw error;
          // Projects with email confirmation on return no session yet.
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            setSentTo(email);
            return;
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }
        router.replace(next);
        router.refresh();
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: mode === "signup",
          data: name ? { full_name: name } : undefined,
          emailRedirectTo: redirectUrl(),
        },
      });
      if (error) throw error;
      setSentTo(email);
    } catch (err) {
      setFormError(authErrorMessage(err));
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          <MailCheck className="size-7" aria-hidden />
        </div>
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold">Check your inbox</h1>
          <p className="text-sm text-muted-foreground">
            We sent a link to <span className="font-medium text-foreground">{sentTo}</span>. Open it
            on this device to finish signing in.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full touch-target"
          onClick={() => {
            setSentTo(null);
            setFormError(null);
          }}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">{copy.heading}</h1>
        <p className="text-sm text-muted-foreground">{copy.sub}</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          {mode === "signup" ? (
            <Field>
              <FieldLabel htmlFor="name">Your name</FieldLabel>
              <Input
                id="name"
                autoComplete="name"
                placeholder="Ananya Rao"
                className="touch-target"
                {...form.register("name")}
              />
              <FieldDescription>Only shown to you.</FieldDescription>
            </Field>
          ) : null}

          <Field data-invalid={form.formState.errors.email ? true : undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              className="touch-target"
              aria-invalid={form.formState.errors.email ? true : undefined}
              {...form.register("email")}
            />
            <FieldError errors={form.formState.errors.email ? [form.formState.errors.email] : undefined} />
          </Field>

          {usePassword ? (
            <Field data-invalid={form.formState.errors.password ? true : undefined}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="touch-target"
                aria-invalid={form.formState.errors.password ? true : undefined}
                {...form.register("password")}
              />
              <FieldDescription>At least 8 characters.</FieldDescription>
              <FieldError
                errors={form.formState.errors.password ? [form.formState.errors.password] : undefined}
              />
            </Field>
          ) : null}

          {formError ? (
            <p role="alert" className="text-sm font-medium text-bad-fg">
              {formError}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full touch-target" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : usePassword ? <KeyRound aria-hidden /> : <Mail aria-hidden />}
            {usePassword ? copy.passwordButton : copy.magicButton}
          </Button>
        </FieldGroup>
      </form>

      <button
        type="button"
        onClick={() => {
          setUsePassword((on) => !on);
          setFormError(null);
        }}
        className="focus-ring w-full rounded-lg py-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {usePassword ? "Email me a link instead" : "Use a password instead"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        {copy.switchText}{" "}
        <Link
          href={next === "/" ? copy.switchHref : `${copy.switchHref}?next=${encodeURIComponent(next)}`}
          className="focus-ring rounded font-medium text-primary underline-offset-4 hover:underline"
        >
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  );
}
