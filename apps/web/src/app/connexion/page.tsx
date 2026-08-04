import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Accès sécurisé à l'espace client SANARYS.",
  robots: { index: false, follow: false },
};

export default function ConnexionPage() {
  return (
    <div className="bg-mist-50">
      <div className="container-page flex min-h-[70vh] items-center py-16">
        <div className="mx-auto grid w-full max-w-4xl gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="hidden lg:block">
            <p className="eyebrow">Espace client</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-950">
              Votre dispositif, en toute transparence
            </h1>
            <p className="mt-5 leading-relaxed text-slate-600">
              Retrouvez vos contrats, vos rapports mensuels agrégés et l&apos;état de votre
              dispositif. Les accès sont nominatifs et journalisés.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {[
                "Contrats et modules actifs de votre organisation",
                "Rapports mensuels agrégés, sans donnée de santé individuelle",
                "Périmètre strictement limité à votre organisation",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-copper-500" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
