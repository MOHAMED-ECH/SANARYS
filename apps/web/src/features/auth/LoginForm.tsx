"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MeResponse } from "@sanarys/schemas";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { authApi, AuthError, isMfaRequired } from "@/lib/auth-api";

/**
 * Connexion en une ou deux etapes.
 *
 * L'etape du code n'apparait que si le compte a un second facteur actif. Le
 * defi voyage en cookie httpOnly pose par l'API : rien a conserver ici, et
 * rien que le JavaScript de la page puisse lire.
 */
export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /** Le personnel SANARYS rejoint la file commerciale, les clients le portail. */
  function enter(me: MeResponse) {
    router.push(me.staffRole ? "/staff/leads" : "/portail");
    router.refresh();
  }

  function report(caught: unknown) {
    setError(
      caught instanceof AuthError
        ? caught.message
        : "Connexion impossible pour le moment. Merci de réessayer.",
    );
    setPending(false);
  }

  async function submitCredentials(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const result = await authApi.login(email.trim(), password);

      if (isMfaRequired(result)) {
        // Le mot de passe n'est plus utile : on ne le garde pas en memoire
        // plus longtemps que necessaire.
        setPassword("");
        setStep("code");
        setPending(false);
        return;
      }

      enter(result);
    } catch (caught) {
      report(caught);
    }
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      enter(await authApi.verifyMfa(code.trim()));
    } catch (caught) {
      report(caught);
      setCode("");
    }
  }

  if (step === "code") {
    return (
      <form onSubmit={submitCode} noValidate className="surface-card p-7 md:p-8">
        <h2 className="font-heading text-2xl font-bold text-navy-950">Vérification en deux étapes</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Saisissez le code à six chiffres affiché par votre application d&apos;authentification.
        </p>

        {error ? (
          <p role="alert" className="mt-5 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-6">
          <TextField
            label="Code de vérification"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            // `one-time-code` permet au telephone de proposer le code reçu, et
            // `inputMode` d'ouvrir directement le pave numerique.
            autoComplete="one-time-code"
            inputMode="numeric"
            autoFocus
            placeholder="123456"
          />
        </div>

        <Button type="submit" size="lg" className="mt-7 w-full" disabled={pending}>
          {pending ? "Vérification…" : "Vérifier"}
        </Button>

        <p className="mt-5 text-xs leading-relaxed text-slate-600">
          Téléphone perdu ou inaccessible ? Saisissez à la place l&apos;un des codes de secours
          remis lors de l&apos;activation. Chacun ne fonctionne qu&apos;une fois.
        </p>

        <button
          type="button"
          onClick={() => {
            setStep("credentials");
            setCode("");
            setError(null);
          }}
          className="mt-4 text-sm font-semibold text-petrol-600 underline underline-offset-2"
        >
          Revenir à l&apos;identification
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submitCredentials} noValidate className="surface-card p-7 md:p-8">
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
