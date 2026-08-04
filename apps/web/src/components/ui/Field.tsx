"use client";

import clsx from "clsx";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { useId } from "react";

const CONTROL =
  "w-full rounded-md border bg-mist-white px-3.5 py-2.5 text-[0.95rem] text-navy-950 transition-colors duration-fast placeholder:text-slate-400 focus:border-petrol-600";

function Wrapper({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block font-heading text-sm font-semibold text-navy-950">
        {label}
        {required ? (
          <span className="ms-1 text-copper-500" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ms-2 text-xs font-normal text-slate-400">(facultatif)</span>
        )}
      </label>
      {hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1 text-xs leading-relaxed text-slate-600">
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  required,
  ...props
}: { label: string; hint?: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Wrapper label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={clsx(hint && `${id}-hint`, error && `${id}-error`) || undefined}
        className={clsx(CONTROL, error ? "border-danger" : "border-navy-950/15")}
        {...props}
      />
    </Wrapper>
  );
}

export function SelectField({
  label,
  hint,
  error,
  required,
  children,
  ...props
}: { label: string; hint?: string; error?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Wrapper label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={clsx(hint && `${id}-hint`, error && `${id}-error`) || undefined}
        className={clsx(CONTROL, error ? "border-danger" : "border-navy-950/15")}
        {...props}
      >
        {children}
      </select>
    </Wrapper>
  );
}

/** Groupe de cases a cocher ou de boutons radio, presente comme une grille de cartes. */
export function ChoiceGroup({
  legend,
  hint,
  error,
  children,
  columns = 2,
}: {
  legend: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  columns?: 1 | 2 | 3;
}) {
  return (
    <fieldset>
      <legend className="font-heading text-sm font-semibold text-navy-950">{legend}</legend>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-600">{hint}</p> : null}
      <div
        className={clsx(
          "mt-3 grid gap-2",
          columns === 1 && "grid-cols-1",
          columns === 2 && "sm:grid-cols-2",
          columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {children}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function ChoiceCard({
  type = "radio",
  label,
  hint,
  checked,
  onChange,
  name,
}: {
  type?: "radio" | "checkbox";
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
  name?: string;
}) {
  return (
    <label
      className={clsx(
        "flex cursor-pointer items-start gap-3 rounded-md border p-3.5 transition-colors duration-fast",
        checked
          ? "border-petrol-600 bg-petrol-100/60"
          : "border-navy-950/12 bg-mist-white hover:border-petrol-600/40",
      )}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 accent-petrol-600"
      />
      <span>
        <span className="block text-sm font-medium text-navy-950">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-slate-600">{hint}</span> : null}
      </span>
    </label>
  );
}

/**
 * Question fermee Oui/Non.
 *
 * `checked` peut valoir `undefined` : dans ce cas AUCUNE reponse n'est
 * pre-selectionnee. Afficher "Non" coche alors que rien n'est enregistre
 * ferait croire a l'utilisateur qu'il a repondu, puis declencherait une
 * erreur de validation sans cause visible.
 */
export function ToggleField({
  label,
  hint,
  error,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  error?: string;
  checked: boolean | undefined;
  onChange: (value: boolean) => void;
}) {
  return (
    <ChoiceGroup legend={label} hint={hint} error={error}>
      <ChoiceCard label="Oui" checked={checked === true} onChange={() => onChange(true)} />
      <ChoiceCard label="Non" checked={checked === false} onChange={() => onChange(false)} />
    </ChoiceGroup>
  );
}
