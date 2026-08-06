import clsx from "clsx";
import type { ReactNode } from "react";
import { ORIGIN_NOTICE, type MediaAsset } from "@/content/media";

/**
 * Visuel avec sa mention d'origine.
 *
 * La mention n'est pas optionnelle et n'est pas pilotee par l'appelant : elle
 * decoule de `asset.origin`. Un developpeur presse ne peut donc pas publier
 * une photo de banque d'images sans qu'elle s'annonce comme telle.
 *
 * `children` permet de rendre un visuel construit en React (schema anime)
 * plutot qu'un fichier : la regle de mention s'applique de la meme facon.
 */
export function Figure({
  asset,
  caption,
  children,
  className,
  captionClassName,
  onDark = false,
}: {
  asset: MediaAsset;
  /** Legende editoriale, distincte de la mention d'origine. */
  caption?: ReactNode | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
  /**
   * Permet de contraindre la legende quand le visuel, lui, est pleine largeur :
   * une legende collee au bord de l'ecran ne se lit pas. La mention d'origine
   * reste rendue dans tous les cas.
   */
  captionClassName?: string | undefined;
  onDark?: boolean | undefined;
}) {
  const notice = asset.origin === "sanarys" ? null : ORIGIN_NOTICE[asset.origin];

  return (
    <figure className={className}>
      {children ?? (
        // eslint-disable-next-line @next/next/no-img-element -- l'Image Optimizer
        // de Next est volontairement desactive (voir next.config.mjs et
        // docs/dependances-securite.md) : on sert donc une balise standard,
        // avec les dimensions pour eviter tout decalage de mise en page.
        <img
          src={asset.src}
          width={asset.width}
          height={asset.height}
          alt={asset.alt}
          className="h-auto w-full"
          loading="lazy"
          decoding="async"
        />
      )}

      {caption || notice ? (
        <figcaption
          className={clsx(
            "mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm",
            onDark ? "text-mist-50/70" : "text-slate-400",
            captionClassName,
          )}
        >
          {caption ? <span className="contents leading-relaxed">{caption}</span> : null}
          {notice ? (
            <span
              className={clsx(
                "font-heading text-xs font-semibold uppercase tracking-[0.1em]",
                onDark ? "text-mist-50/50" : "text-slate-400",
              )}
            >
              {notice}
              {asset.credit ? ` · ${asset.credit}` : ""}
            </span>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
