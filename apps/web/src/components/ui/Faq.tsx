"use client";

import { useState } from "react";
import clsx from "clsx";

/** Accordéon FAQ. Chaque question est un bouton : navigation clavier native. */
export function Faq({ items }: { items: readonly { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <dl className="divide-y divide-navy-950/8 border-y border-navy-950/8">
      {items.map((item, index) => {
        const expanded = open === index;
        return (
          <div key={item.question}>
            <dt>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : index)}
                aria-expanded={expanded}
                aria-controls={`faq-panel-${index}`}
                id={`faq-question-${index}`}
                className="flex w-full items-center justify-between gap-4 py-5 text-start"
              >
                <span className="font-heading text-lg font-semibold text-navy-950">
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className={clsx(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-navy-950/12 transition-transform duration-base",
                    expanded && "rotate-45 border-copper-500 bg-copper-500 text-mist-white",
                  )}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 2v10M2 7h10"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </button>
            </dt>
            <dd
              id={`faq-panel-${index}`}
              aria-labelledby={`faq-question-${index}`}
              hidden={!expanded}
              className="pb-5 pe-12 text-[0.98rem] leading-relaxed text-slate-600"
            >
              {item.answer}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
