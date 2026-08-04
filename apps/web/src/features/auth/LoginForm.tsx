"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { authApi, AuthError } from "@/lib/auth-api";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const me = await authApi.login(email.trim(), password);
      // Le personnel SANARYS rejoint la file commerciale, les clients le portail.
      router.push(me.staffRole ? "/staff/leads" : "/portail");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof AuthError
          ? caught.message
          : "Connexion impossible pour le moment. Merci de réessayer.",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="surface-card p-7 md:p-8">
      <h2 className="font-heading text-2xl font-bold text-navy-950">Connexion</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Accès réservé aux organisations clientes et au personnel SANARYS.
      </p>

      {error ? (
        <p role="alert" className="mt-5 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-6 space-y-5">
        <TextField
          label="Email professionnel"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
        <TextField
          label="Mot de passe"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
      </div>

      <Button type="submit" size="lg" className="mt-7 w-full" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>

      <p className="mt-5 text-xs leading-relaxed text-slate-600">
        Les connexions et les accès aux documents sont journalisés. Après plusieurs tentatives
        infructueuses, le compte est temporairement verrouillé.
      </p>
    </form>
  );
}
