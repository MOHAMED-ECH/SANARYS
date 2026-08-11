import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { PDF_CONTACT, pdfPalette as palette } from "../../../shared/pdf/branding.js";
import type { DocumentPayload, ReportRendererPort, ReportView } from "../domain/ports.js";

/**
 * Rapport mensuel en PDF.
 *
 * Contrairement a la convention-cadre, ce document n'est PAS stocke : il se
 * deduit entierement du rapport en base et est rendu a la demande. Archiver
 * une copie ferait exister deux verites qui divergeraient a la premiere
 * correction de donnee, et il faudrait alors decider laquelle fait foi.
 *
 * Le document ne contient que des indicateurs agreges. Aucune donnee de sante,
 * aucun element permettant d'identifier un salarie — c'est ecrit noir sur
 * blanc dans le document lui-meme, parce qu'il circulera hors du portail.
 */

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 10, color: palette.slate, lineHeight: 1.5 },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: palette.petrol,
    paddingBottom: 12,
    marginBottom: 22,
  },
  brand: { fontSize: 20, color: palette.navy, fontWeight: "bold", letterSpacing: 1 },
  brandSub: { fontSize: 9, color: palette.petrol, marginTop: 2 },
  title: { fontSize: 16, color: palette.navy, marginTop: 16, fontWeight: "bold" },
  meta: { fontSize: 8, marginTop: 6 },

  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 11,
    color: palette.navy,
    fontWeight: "bold",
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: palette.copper,
    paddingLeft: 6,
  },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  kpiCell: { width: "50%", paddingHorizontal: 5, marginBottom: 10 },
  kpiCard: { backgroundColor: palette.mist, padding: 12, borderRadius: 4 },
  kpiLabel: { fontSize: 9, color: palette.navy, fontWeight: "bold" },
  kpiValue: { fontSize: 20, color: palette.petrol, fontWeight: "bold", marginTop: 4 },
  kpiHint: { fontSize: 7.5, marginTop: 4, lineHeight: 1.4 },

  notice: {
    marginTop: 22,
    padding: 12,
    backgroundColor: palette.sand,
    borderLeftWidth: 3,
    borderLeftColor: palette.copper,
    borderRadius: 3,
  },
  noticeTitle: { color: palette.navy, fontWeight: "bold", marginBottom: 4 },

  footer: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: palette.mist,
    paddingTop: 8,
    fontSize: 7.5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

/**
 * Libelles et mise en forme des indicateurs.
 *
 * Volontairement dupliques cote serveur plutot qu'importes du front : ce
 * document doit rester lisible sans le portail, et un rapport deja emis ne
 * doit pas changer de vocabulaire parce que l'interface a evolue.
 */
const KPI: Record<string, { label: string; format: (v: number) => string; hint: string }> = {
  availabilityRate: {
    label: "Disponibilité",
    format: (v) => `${(v * 100).toFixed(1)} %`,
    hint: "Part des heures d'activité durant lesquelles le dispositif contractualisé était effectivement opérationnel.",
  },
  interventionCount: {
    label: "Interventions",
    format: (v) => String(v),
    hint: "Nombre total d'interventions du dispositif sur la période, toutes entreprises membres confondues.",
  },
  avgResponseTimeMinutes: {
    label: "Délai moyen d'intervention",
    format: (v) => `${v.toFixed(1)} min`,
    hint: "Moyenne des délais entre l'appel et l'arrivée sur site, mesurée sur la période.",
  },
  trainingSessionsHeld: {
    label: "Sessions de formation",
    format: (v) => String(v),
    hint: "Sessions de formation aux gestes de secours animées sur la période.",
  },
};

function formatPeriod(period: string): string {
  const [annee, mois] = period.split("-").map(Number);
  if (!annee || !mois) return period;
  return new Date(Date.UTC(annee, mois - 1, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function MonthlyReport({
  organizationName,
  report,
  generatedAt,
}: {
  organizationName: string;
  report: ReportView;
  generatedAt: Date;
}) {
  const entrees = Object.entries(report.kpi).filter(
    ([cle, valeur]) => KPI[cle] && typeof valeur === "number",
  ) as [string, number][];

  return (
    <Document
      title={`SANARYS — Rapport ${report.period} — ${organizationName}`}
      author="SANARYS"
      language="fr"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>SANARYS</Text>
          <Text style={styles.brandSub}>
            Santé opérationnelle mutualisée des zones industrielles
          </Text>
          <Text style={styles.title}>Rapport mensuel — {formatPeriod(report.period)}</Text>
          <Text style={styles.meta}>{organizationName}</Text>
          <Text style={styles.meta}>
            {report.publishedAt
              ? `Publié le ${report.publishedAt.toLocaleDateString("fr-FR")}`
              : "Non publié"}
            {" · "}
            Document généré le {generatedAt.toLocaleDateString("fr-FR")} à{" "}
            {generatedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicateurs de la période</Text>

          {entrees.length === 0 ? (
            <Text>Aucun indicateur n&apos;a été enregistré pour cette période.</Text>
          ) : (
            <View style={styles.kpiGrid}>
              {entrees.map(([cle, valeur]) => {
                const meta = KPI[cle]!;
                return (
                  <View key={cle} style={styles.kpiCell}>
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiLabel}>{meta.label}</Text>
                      <Text style={styles.kpiValue}>{meta.format(valeur)}</Text>
                      <Text style={styles.kpiHint}>{meta.hint}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Portée de ce document</Text>
          <Text>
            Les indicateurs présentés sont agrégés à l&apos;échelle de l&apos;organisation. Ils ne
            contiennent aucune information permettant d&apos;identifier un salarié, ni aucun élément
            de dossier de soins. Les délais et taux affichés sont mesurés sur la période et
            s&apos;apprécient au regard des engagements de la convention-cadre.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            SANARYS · Rapport {report.period} · {PDF_CONTACT}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export class PdfReportRenderer implements ReportRendererPort {
  async render(params: {
    organizationName: string;
    report: ReportView;
    generatedAt: Date;
  }): Promise<DocumentPayload> {
    const bytes = await renderToBuffer(<MonthlyReport {...params} />);
    return {
      bytes,
      mimeType: "application/pdf",
      fileName: `sanarys-rapport-${params.report.period}.pdf`,
    };
  }
}
