"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import type { MembershipRole } from "@sanarys/schemas";
import { authApi, AuthError, type MemberDto } from "@/lib/auth-api";
import { Button } from "@/components/ui/Button";
import { ChoiceCard, ChoiceGroup, TextField } from "@/components/ui/Field";

/**
 * Gestion des membres d'une organisation.
 *
 * L'invitation exige une appartenance DIRECTE avec le role ORG_ADMIN : un
 * administrateur de groupement voit les membres de ses PME mais ne peut pas
 * y inviter quelqu'un (regle appliquee cote serveur, reflechie ici dans l'UI).
 */

const ROLE_LABELS: Record<string, { label: string; detail: string }> = {
  ORG_ADMIN: { label: "Administrateur", detail: "Gère les accès et voit l'ensemble des documents" },
  HSE_MANAGER: { label: "Responsable HSE", detail: "Consulte rapports, incidents agrégés et formations" },
  COMPANY_DIRECTOR: { label: "Direction", detail: "Consulte contrats, rapports et indicateurs" },
  ZONE_MANAGER: { label: "Gestionnaire de zone", detail: "Pilote le groupement et suit la couverture" },
  VIEWER: { label: "Lecture seule", detail: "Consulte sans pouvoir agir" },
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Actif", className: "bg-success/12 text-success" },
  INVITED: { label: "Invitation en attente", className: "bg-warning/12 text-warning" },
  SUSPENDED: { label: "Suspendu", className: "bg-danger/12 text-danger" },
};

const INVITABLE_ROLES: MembershipRole[] = [
  "ORG_ADMIN",
  "HSE_MANAGER",
  "COMPANY_DIRECTOR",
  "VIEWER",
];

export function MembersView({
  organizationId,
  canInvite,
}: {
  organizationId: string;
  canInvite: boolean;
}) {
  const [members, setMembers] = useState<MemberDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      setMembers(await authApi.members(organizationId));
    } catch {
      setError("La liste des membres n'a pas pu être chargée.");
    }
  }, [organizationId]);

  useEffect(() => {
    setMembers(null);
    setError(null);
    void load();
  }, [load]);

  if (error) {
    return (
      <p role="alert" className="rounded-lg border border-warning/30 bg-warning/10 p-6 text-navy-950">
        {error}
      </p>
    );
  }

  if (!members) {
    return (
      <p className="rounded-lg border border-navy-950/8 bg-mist-white p-8 text-center text-slate-600" aria-live="polite">
        Chargement…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-navy-950">
            {members.length} membre{members.length > 1 ? "s" : ""}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Les accès sont nominatifs. Chaque connexion et chaque consultation de document est
            journalisée.
          </p>
        </div>
        {canInvite ? (
          <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? "secondary" : "primary"}>
            {showForm ? "Annuler" : "Inviter un utilisateur"}
          </Button>
        ) : null}
      </div>

      {showForm && canInvite ? (
        <InviteForm
          organizationId={organizationId}
          onDone={() => {
            setShowForm(false);
            void load();
          }}
        />
      ) : null}

      <ul className="divide-y divide-navy-950/8 border-y border-navy-950/8">
        {members.map((member) => {
          const role = ROLE_LABELS[member.role];
          const status = STATUS_LABELS[member.status];
          return (
            <li key={member.userId} className="flex flex-wrap items-start justify-between gap-4 py-4">
              <div>
                <p className="font-heading font-semibold text-navy-950">{member.fullName}</p>
                <p className="mt-0.5 text-sm text-slate-600">{member.email}</p>
                <p className="mt-1.5 text-sm">
                  <span className="font-medium text-navy-950">{role?.label ?? member.role}</span>
                  <span className="text-slate-400"> — {role?.detail}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", status?.className)}>
                  {status?.label ?? member.status}
                </span>
                {!member.mfaEnabled ? (
                  <span className="text-xs text-slate-400">Double authentification inactive</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {!canInvite ? (
        <p className="rounded-lg border-s-4 border-petrol-600 bg-mist-white p-5 text-sm leading-relaxed text-slate-600">
          Seul un administrateur rattaché directement à cette organisation peut inviter de nouveaux
          utilisateurs. Depuis un groupement, vous consultez les membres de vos entreprises sans
          pouvoir modifier leurs accès.
        </p>
      ) : null}

      <p className="rounded-lg border border-warning/30 bg-warning/10 p-5 text-sm leading-relaxed text-navy-950">
        <strong>Limite connue de cette version :</strong> la double authentification n&apos;est pas
        encore disponible. Elle est requise pour les profils privilégiés avant toute ouverture en
        production.
      </p>
    </div>
  );
}

function InviteForm({
  organizationId,
  onDone,
}: {
  organizationId: string;
  onDone: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MembershipRole>("VIEWER");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = "Merci d'indiquer le nom du destinataire.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Adresse email invalide.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    setFeedback(null);
    try {
      await authApi.inviteMember(organizationId, { email: email.trim(), fullName: fullName.trim(), role });
      onDone();
    } catch (caught) {
      setFeedback(
        caught instanceof AuthError ? caught.message : "L'invitation n'a pas pu être envoyée.",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="surface-card p-6">
      <h3 className="font-heading text-lg font-bold text-navy-950">Inviter un utilisateur</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
        L&apos;invitation crée un accès nominatif. Le destinataire choisit son mot de passe à la
        première connexion ; le lien expire au bout de sept jours.
      </p>

      {feedback ? (
        <p role="alert" className="mt-4 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          {feedback}
        </p>
      ) : null}

      <div className="mt-5 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Nom et prénom"
            required
            value={fullName}
            error={errors.fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          <TextField
            label="Email professionnel"
            type="email"
            required
            value={email}
            error={errors.email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <ChoiceGroup legend="Rôle attribué" hint="Le rôle détermine ce que la personne pourra consulter.">
          {INVITABLE_ROLES.map((value) => (
            <ChoiceCard
              key={value}
              name="role"
              label={ROLE_LABELS[value]!.label}
              hint={ROLE_LABELS[value]!.detail}
              checked={role === value}
              onChange={() => setRole(value)}
            />
          ))}
        </ChoiceGroup>
      </div>

      <Button type="submit" className="mt-6" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer l'invitation"}
      </Button>

      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        Dans cette version, l&apos;email d&apos;invitation n&apos;est pas réellement envoyé :
        l&apos;intention est journalisée côté serveur. Le branchement d&apos;un fournisseur d&apos;email
        est nécessaire avant mise en production.
      </p>
    </form>
  );
}
