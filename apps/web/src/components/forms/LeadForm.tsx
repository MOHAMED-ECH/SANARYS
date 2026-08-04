"use client";

import { useState } from "react";
import type { IndustrialZoneDto } from "@sanarys/schemas";
import { Button } from "@/components/ui/Button";
import { ChoiceCard, ChoiceGroup, SelectField, TextField } from "@/components/ui/Field";
import { api } from "@/lib/api";

/**
 * Formulaire de contact / demande d'audit.
 *
 * Minimisation : seuls les champs necessaires au rappel sont obligatoires.
 * La mention de collecte est affichee au point de collecte et le consentement
 * est horodate et versionne cote serveur (loi 09-08 / CNDP).
 */

interface Props {
  /** "audit" cree aussi une demande d'audit rattachee au lead. */
  intent: "contact" | "audit";
  zones: IndustrialZoneDto[];
}

const CONSENT_VERSION = "2026.08.0";

export function LeadForm({ intent, zones }: Props) {
  const [form, setForm] = useState({
    contactName: "",
    contactRole: "",
    companyName: "",
    contactEmail: "",
    contactPhone: "",
    industrialZoneId: "",
    preferredChannel: "EMAIL" as "EMAIL" | "PHONE" | "WHATSAPP",
    message: "",
    consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [globalError, setGlobalError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.contactName.trim()) next.contactName = "Merci d'indiquer votre nom.";
    if (!form.companyName.trim()) next.companyName = "Merci d'indiquer votre entreprise.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
      next.contactEmail = "Merci d'indiquer un email professionnel valide.";
    }
    if (!form.consent) next.consent = "Votre accord est nécessaire pour vous recontacter.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setStatus("sending");
    setGlobalError(null);

    try {
      const lead = await api.createLead({
        contactName: form.contactName.trim(),
        contactRole: form.contactRole.trim() || undefined,
        companyName: form.companyName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim() || undefined,
        preferredChannel: form.preferredChannel,
        industrialZoneId: form.industrialZoneId || undefined,
        source: intent === "audit" ? "formulaire_audit" : "formulaire_contact",
        consentMarketing: form.consent,
        consentVersion: CONSENT_VERSION,
      });

      if (intent === "audit") {
        await api.createAuditRequest({
          leadId: lead.id,
          notes: form.message.trim() || undefined,
        });
        void api.track("request_audit", { type_organisation: "PME" });
      } else {
        void api.track("book_meeting", { canal: form.preferredChannel });
      }

      setStatus("sent");
    } catch {
      setGlobalError(
        "Votre demande n'a pas pu être transmise. Merci de réessayer ou de nous écrire directement à contact@sanarys.ma.",
      );
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="rounded-lg border border-success/30 bg-success/10 p-8">
        <h2 className="font-heading text-2xl font-bold text-navy-950">
          {intent === "audit" ? "Votre demande d'audit est enregistrée" : "Votre message est transmis"}
        </h2>
        <p className="mt-3 leading-relaxed text-slate-600">
          Un conseiller SANARYS vous recontacte
          {form.preferredChannel === "EMAIL"
            ? " par email"
            : form.preferredChannel === "PHONE"
              ? " par téléphone"
              : " sur WhatsApp"}
          . Notre objectif de prise en charge est de moins de deux heures ouvrées.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          En attendant, vous pouvez estimer votre dispositif avec le simulateur : le résultat servira
          de base à notre échange.
        </p>
        <a
          href="/simulateur"
          className="mt-5 inline-flex items-center gap-2 font-heading text-sm font-semibold text-petrol-600 underline underline-offset-4"
        >
          Lancer le simulateur
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="surface-card p-6 md:p-8">
      <h2 className="font-heading text-2xl font-bold text-navy-950">
        {intent === "audit" ? "Demander un audit terrain gratuit" : "Nous écrire"}
      </h2>
      <p className="mt-2 text-[0.95rem] leading-relaxed">
        {intent === "audit"
          ? "Nos équipes se déplacent, cartographient la zone et évaluent les risques. L'audit est gratuit et sans engagement."
          : "Décrivez votre besoin : un conseiller vous recontacte selon le canal que vous préférez."}
      </p>

      {globalError ? (
        <p role="alert" className="mt-5 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          {globalError}
        </p>
      ) : null}

      <div className="mt-7 space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Nom et prénom"
            required
            value={form.contactName}
            error={errors.contactName}
            onChange={(event) => update("contactName", event.target.value)}
            autoComplete="name"
          />
          <TextField
            label="Fonction"
            value={form.contactRole}
            onChange={(event) => update("contactRole", event.target.value)}
            placeholder="Directeur QHSE"
            autoComplete="organization-title"
          />
        </div>

        <TextField
          label="Entreprise ou groupement"
          required
          value={form.companyName}
          error={errors.companyName}
          onChange={(event) => update("companyName", event.target.value)}
          autoComplete="organization"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Email professionnel"
            type="email"
            required
            value={form.contactEmail}
            error={errors.contactEmail}
            onChange={(event) => update("contactEmail", event.target.value)}
            autoComplete="email"
          />
          <TextField
            label="Téléphone"
            type="tel"
            value={form.contactPhone}
            onChange={(event) => update("contactPhone", event.target.value)}
            autoComplete="tel"
            placeholder="+212 6 00 00 00 00"
          />
        </div>

        <SelectField
          label="Zone industrielle concernée"
          value={form.industrialZoneId}
          onChange={(event) => update("industrialZoneId", event.target.value)}
          hint="Si votre zone n'est pas listée, précisez-la dans votre message."
        >
          <option value="">Non listée / autre zone</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name} — {zone.city}
            </option>
          ))}
        </SelectField>

        <ChoiceGroup legend="Canal de contact préféré" columns={3}>
          <ChoiceCard
            name="channel"
            label="Email"
            checked={form.preferredChannel === "EMAIL"}
            onChange={() => update("preferredChannel", "EMAIL")}
          />
          <ChoiceCard
            name="channel"
            label="Téléphone"
            checked={form.preferredChannel === "PHONE"}
            onChange={() => update("preferredChannel", "PHONE")}
          />
          <ChoiceCard
            name="channel"
            label="WhatsApp"
            checked={form.preferredChannel === "WHATSAPP"}
            onChange={() => update("preferredChannel", "WHATSAPP")}
          />
        </ChoiceGroup>

        <div>
          <label
            htmlFor="lead-message"
            className="block font-heading text-sm font-semibold text-navy-950"
          >
            Votre message
            <span className="ms-2 text-xs font-normal text-slate-400">(facultatif)</span>
          </label>
          <textarea
            id="lead-message"
            rows={4}
            value={form.message}
            onChange={(event) => update("message", event.target.value)}
            className="mt-2 w-full rounded-md border border-navy-950/15 bg-mist-white px-3.5 py-2.5 text-[0.95rem] text-navy-950 transition-colors duration-fast placeholder:text-slate-600/50 focus:border-petrol-600"
            placeholder="Nombre d'entreprises intéressées, contraintes particulières, échéance envisagée…"
          />
          <p className="mt-1 text-xs text-slate-600">
            Merci de ne transmettre aucune information de santé concernant une personne.
          </p>
        </div>

        {/* Mention de collecte au point de collecte. */}
        <div className="rounded-md border border-navy-950/12 bg-mist-50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(event) => update("consent", event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-petrol-600"
            />
            <span className="text-sm leading-relaxed text-slate-600">
              J&apos;accepte que SANARYS utilise ces informations pour me recontacter au sujet de ma
              demande.
              {errors.consent ? (
                <span role="alert" className="mt-1 block font-medium text-danger">
                  {errors.consent}
                </span>
              ) : null}
            </span>
          </label>
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            <strong className="text-navy-950">Responsable :</strong> SANARYS ·{" "}
            <strong className="text-navy-950">Finalité :</strong> répondre à votre demande ·{" "}
            <strong className="text-navy-950">Destinataires :</strong> équipes commerciales SANARYS ·{" "}
            <strong className="text-navy-950">Durée :</strong> limitée au suivi commercial. Vous
            disposez d&apos;un droit d&apos;accès, de rectification et d&apos;opposition à
            contact@sanarys.ma. Traitement soumis à la loi 09-08.
          </p>
        </div>
      </div>

      <Button type="submit" size="lg" className="mt-7 w-full" disabled={status === "sending"}>
        {status === "sending"
          ? "Envoi en cours…"
          : intent === "audit"
            ? "Demander l'audit terrain"
            : "Envoyer ma demande"}
      </Button>
    </form>
  );
}
