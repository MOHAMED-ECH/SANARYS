"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { authApi, AuthError } from "@/lib/auth-api";

/**
 * Vérification en deux étapes : état, activation, désactivation.
 *
 * L'activation est en deux temps volontairement — un secret est d'abord
 * affiché, puis le facteur n'est activé qu'une fois un premier code vérifié.
 * Sans cette confirmation, une saisie erronée dans l'application
 * d'authentification enfermerait l'utilisateur dehors à la déconnexion
 * suivante.
 */

type Phase =
  | { name: "loading" }
  | { name: "idle"; enabled: boolean; remainingRecoveryCodes: number }
  | { name: "enrolling"; secret: string }
  | { name: "codes"; codes: string[] }
  | { name: "disabling" };

export function SecurityView() {
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refresh() {
    try {
      const status = await authApi.mfaStatus();
      setPhase({ name: "idle", ...status });
    } catch {
      setError("État de sécurité indisponible pour le moment.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function report(caught: unknown) {
    setError(
      caught instanceof AuthError ? caught.message : "Opération impossible pour le moment.",
    );
    setPending(false);
  }

  async function startEnrollment() {
    setPending(true);
    setError(null);
    try {
      const offer = await authApi.startMfaEnrollment();
      setPhase({ name: "enrolling", secret: offer.secret });
      setPending(false);
    } catch (caught) {
      report(caught);
    }
  }

  async function confirmEnrollment(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { recoveryCodes } = await authApi.confirmMfaEnrollment(code.trim());
      setCode("");
      setPhase({ name: "codes", codes: recoveryCodes });
      setPending(false);
    } catch (caught) {
      report(caught);
    }
  }

  async function disable(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await authApi.disableMfa(password);
      setPassword("");
      setPending(false);
      await refresh();
    } catch (caught) {
      report(caught);
    }
  }

  if (phase.name === "loading") {
    return <p className="text-slate-600">Chargement…</p>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-bold text-navy-950">Sécurité du compte</h1>
      <p className="mt-2 leading-relaxed text-slate-600">
        La vérification en deux étapes ajoute un code temporaire à votre mot de passe. Même volé,
        celui-ci ne suffit plus à ouvrir une session.
      </p>

      {error ? (
        <p role="alert" className="mt-6 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {phase.name === "idle" ? (
        <section className="surface-card mt-8 p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-lg font-bold text-navy-950">
                Vérification en deux étapes
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {phase.enabled
                  ? `Active. ${phase.remainingRecoveryCodes} code${phase.remainingRecoveryCodes > 1 ? "s" : ""} de secours restant${phase.remainingRecoveryCodes > 1 ? "s" : ""}.`
                  : "Inactive. Votre mot de passe est actuellement le seul rempart."}
              </p>
            </div>
            <span
              className={
                phase.enabled
                  ? "rounded-full bg-petrol-100 px-3 py-1 font-heading text-xs font-bold uppercase tracking-[0.1em] text-petrol-600"
                  : "rounded-full bg-sand-200 px-3 py-1 font-heading text-xs font-bold uppercase tracking-[0.1em] text-navy-950"
              }
            >
              {phase.enabled ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="mt-6">
            {phase.enabled ? (
              <Button variant="secondary" onClick={() => setPhase({ name: "disabling" })}>
                Désactiver
              </Button>
            ) : (
              <Button onClick={startEnrollment} disabled={pending}>
                {pending ? "Préparation…" : "Activer"}
              </Button>
            )}
          </div>
        </section>
      ) : null}

      {phase.name === "enrolling" ? (
        <form onSubmit={confirmEnrollment} className="surface-card mt-8 p-7">
          <h2 className="font-heading text-lg font-bold text-navy-950">
            1. Enregistrez la clé dans votre application
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Ouvrez votre application d&apos;authentification (Google Authenticator, Authy,
            1Password…), choisissez « Saisir une clé de configuration » et recopiez la clé
            ci-dessous. Le compte à indiquer est votre adresse professionnelle.
          </p>

          <p className="mt-5 select-all break-all rounded-md bg-mist-50 px-4 py-3 font-mono text-lg tracking-wider text-navy-950">
            {phase.secret.match(/.{1,4}/g)?.join(" ")}
          </p>

          <h2 className="mt-8 font-heading text-lg font-bold text-navy-950">
            2. Confirmez avec un premier code
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            La vérification ne sera activée qu&apos;une fois ce code validé — une clé mal recopiée
            ne peut donc pas vous bloquer dehors.
          </p>

          <div className="mt-5">
            <TextField
              label="Code à six chiffres"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="one-time-code"
              inputMode="numeric"
              placeholder="123456"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Vérification…" : "Activer la vérification"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCode("");
                setError(null);
                void refresh();
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : null}

      {phase.name === "codes" ? (
        <section className="surface-card mt-8 border-copper-500/40 p-7">
          <h2 className="font-heading text-lg font-bold text-navy-950">
            Vérification activée — conservez ces codes de secours
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Ils sont affichés <strong>une seule fois</strong> et ne pourront plus être relus : la
            base n&apos;en garde que des empreintes. Imprimez-les ou rangez-les dans votre
            gestionnaire de mots de passe. Chacun ne fonctionne qu&apos;une fois, et remplace le
            code de l&apos;application si vous perdez votre téléphone.
          </p>

          <ul className="mt-6 grid gap-2 font-mono text-sm sm:grid-cols-2">
            {phase.codes.map((recoveryCode) => (
              <li key={recoveryCode} className="select-all rounded-md bg-mist-50 px-4 py-2.5 tracking-wider">
                {recoveryCode}
              </li>
            ))}
          </ul>

          <Button className="mt-7" onClick={() => void refresh()}>
            J&apos;ai conservé ces codes
          </Button>
        </section>
      ) : null}

      {phase.name === "disabling" ? (
        <form onSubmit={disable} className="surface-card mt-8 p-7">
          <h2 className="font-heading text-lg font-bold text-navy-950">
            Désactiver la vérification en deux étapes
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Votre mot de passe redeviendra le seul rempart de votre compte. Il vous est redemandé
            ici : sans cela, une session laissée ouverte suffirait à retirer la protection.
          </p>

          <div className="mt-5">
            <TextField
              label="Mot de passe"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Désactivation…" : "Confirmer la désactivation"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPassword("");
                setError(null);
                void refresh();
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
