import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import type { SimulationInput, SimulationResult } from "@sanarys/schemas";
import type { SimulationSummaryDocument, SummaryGeneratorPort } from "../domain/ports.js";
import { pdfPalette } from "../../../shared/pdf/branding.js";

/**
 * Recapitulatif PDF de simulation (cahier des charges section 8.4).
 *
 * Contenu obligatoire : reference unique, date de generation, version du moteur,
 * reponses fournies, hypotheses, recommandations, ce qui n'est PAS inclus,
 * mention non contractuelle, coordonnees SANARYS.
 *
 * Limite connue : ce document est genere en francais. Le rendu arabe/RTL exige
 * des polices arabes embarquees et un moteur de mise en forme bidirectionnel -
 * c'est un chantier dedie, non couvert par cette version.
 */

// Charte partagee : voir shared/pdf/branding.ts. Les valeurs recopiees ici
// avaient diverge des tokens.
const palette = pdfPalette;

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: palette.slate, lineHeight: 1.5 },
  header: { borderBottomWidth: 2, borderBottomColor: palette.petrol, paddingBottom: 12, marginBottom: 20 },
  brand: { fontSize: 20, color: palette.navy, fontWeight: "bold", letterSpacing: 1 },
  brandSub: { fontSize: 9, color: palette.petrol, marginTop: 2 },
  title: { fontSize: 15, color: palette.navy, marginTop: 14, fontWeight: "bold" },
  meta: { fontSize: 8, color: palette.slate, marginTop: 6 },
  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 11,
    color: palette.navy,
    fontWeight: "bold",
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: palette.copper,
    paddingLeft: 6,
  },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 160, color: palette.navy },
  value: { flex: 1 },
  card: { backgroundColor: palette.mist, padding: 10, borderRadius: 4, marginBottom: 8 },
  cardTitle: { color: palette.navy, fontWeight: "bold", marginBottom: 3 },
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 10, color: palette.copper },
  notice: {
    marginTop: 18,
    padding: 10,
    backgroundColor: palette.sand,
    borderLeftWidth: 3,
    borderLeftColor: palette.copper,
    borderRadius: 3,
  },
  noticeTitle: { color: palette.navy, fontWeight: "bold", marginBottom: 3 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7,
    color: palette.slate,
    borderTopWidth: 1,
    borderTopColor: "#DDD",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

const MODULE_LABELS: Record<string, string> = {
  NURSE: "Infirmier(ère) permanent(e)",
  DOCTOR: "Médecin dédié sur site",
  INFIRMARY: "Infirmerie centrale aménagée",
};

const VEHICLE_LABELS: Record<string, string> = {
  TYPE_B: "Ambulance type B — soins d'urgence",
  TYPE_C: "Ambulance type C — réanimation mobile",
};

const RISK_LABELS: Record<string, string> = {
  LOW: "Faible",
  MEDIUM: "Modéré",
  HIGH: "Élevé",
};

interface Props {
  reference: string;
  input: SimulationInput;
  result: SimulationResult;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>—</Text>
      <Text style={{ flex: 1 }}>{children}</Text>
    </View>
  );
}

function SimulationSummary({ reference, input, result }: Props) {
  const generatedAt = new Date(result.generatedAt);
  const dateLabel = generatedAt.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document
      title={`SANARYS - Récapitulatif de simulation CSPS ${reference}`}
      author="SANARYS"
      subject="Simulation indicative de dispositif CSPS — document non contractuel"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.brand}>SANARYS</Text>
          <Text style={styles.brandSub}>Santé opérationnelle mutualisée des zones industrielles</Text>
        </View>

        <Text style={styles.title}>Récapitulatif de simulation CSPS</Text>
        <Text style={styles.meta}>
          Référence : {reference} · Généré le {dateLabel} · Moteur de règles version{" "}
          {result.ruleSetVersion}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Périmètre déclaré</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Zone industrielle</Text>
            <Text style={styles.value}>
              {input.zone?.zoneName ?? "-"} ({input.zone?.city ?? "-"})
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Entreprises concernées</Text>
            <Text style={styles.value}>{input.companies?.numberOfCompanies ?? "-"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Effectif total</Text>
            <Text style={styles.value}>{input.companies?.totalHeadcount ?? "-"} salaries</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Niveau de risque déclaré</Text>
            <Text style={styles.value}>
              {input.activity ? (RISK_LABELS[input.activity.riskLevel] ?? input.activity.riskLevel) : "-"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Travail de nuit</Text>
            <Text style={styles.value}>{input.schedule?.nightWork ? "Oui" : "Non"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Dispositif existant</Text>
            <Text style={styles.value}>
              {[
                input.existingSetup?.hasAmbulance ? "ambulance" : null,
                input.existingSetup?.hasInfirmary ? "infirmerie" : null,
                input.existingSetup?.existingStaff && input.existingSetup.existingStaff !== "NONE"
                  ? input.existingSetup.existingStaff === "NURSE"
                    ? "infirmier"
                    : "médecin"
                  : null,
              ]
                .filter(Boolean)
                .join(", ") || "aucun déclaré"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration indicative proposée</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Module socle : {VEHICLE_LABELS[result.vehicleType.code] ?? result.vehicleType.code}
            </Text>
            <Text>{result.vehicleType.rationale}</Text>
            <Text style={{ fontSize: 7, marginTop: 3, color: palette.slate }}>
              Règle appliquée : {result.vehicleType.ruleId}
            </Text>
          </View>

          {result.suggestedModules.length > 0 ? (
            result.suggestedModules.map((module) => (
              <View style={styles.card} key={module.ruleId}>
                <Text style={styles.cardTitle}>
                  Module suggéré : {MODULE_LABELS[module.code] ?? module.code}
                </Text>
                <Text>{module.rationale}</Text>
                <Text style={{ fontSize: 7, marginTop: 3, color: palette.slate }}>
                  Règle appliquée : {module.ruleId}
                </Text>
              </View>
            ))
          ) : (
            <Text>
              Aucun module optionnel n'est suggéré par le moteur sur la base des éléments déclarés.
              L'audit terrain peut faire évoluer cette recommandation.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Couverture visée</Text>
          <Text style={{ color: palette.navy, fontWeight: "bold" }}>{result.coverage.targetLabel}</Text>
          <Text style={{ marginTop: 3 }}>{result.coverage.rationale}</Text>
          <Text style={{ marginTop: 3, fontStyle: "italic" }}>{result.coverage.disclaimer}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clé de répartition indicative</Text>
          <Text>{result.costShare.rationale}</Text>
          <Text style={{ fontSize: 7, marginTop: 3 }}>
            Formule : {result.costShare.formula} · Règle : {result.costShare.ruleId}
          </Text>
        </View>

        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Hypothèses retenues</Text>
          {result.assumptions.map((assumption, index) => (
            <Bullet key={index}>{assumption}</Bullet>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ce que cette simulation ne couvre pas</Text>
          <Bullet>Aucun prix ferme ni engagement tarifaire : seules des fourchettes indicatives.</Bullet>
          <Bullet>Aucun calcul de routage réel : les temps affichés sont des objectifs, pas des mesures.</Bullet>
          <Bullet>Aucune évaluation médicale ni recommandation clinique.</Bullet>
          <Bullet>Aucune vérification de conformité réglementaire de votre site.</Bullet>
          <Bullet>La configuration définitive est arrêtée après audit terrain contradictoire.</Bullet>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Document non contractuel</Text>
          <Text>
            Ce récapitulatif est une estimation indicative produite automatiquement à partir des
            éléments que vous avez déclarés. Il ne constitue ni un devis, ni une offre, ni un
            engagement contractuel de SANARYS. Seule une proposition technique et financière signée,
            établie après audit terrain, engage les parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prochaine étape</Text>
          <Text>
            Demandez un audit terrain gratuit : nos équipes cartographient la zone, évaluent les
            risques et identifient l'emplacement optimal du point d'ancrage. Contact : contact@sanarys.ma
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            SANARYS · Récapitulatif de simulation {reference} · Moteur v{result.ruleSetVersion}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/**
 * Implementation du port de generation de recapitulatif.
 *
 * Le domaine ne connait ni React, ni le format PDF : il demande un
 * document, l'infrastructure decide comment il est produit.
 */
export class PdfSummaryGenerator implements SummaryGeneratorPort {
  async generate(params: {
    reference: string;
    input: SimulationInput;
    result: SimulationResult;
  }): Promise<SimulationSummaryDocument> {
    const bytes = await renderToBuffer(<SimulationSummary {...params} />);
    return {
      bytes,
      mimeType: "application/pdf",
      fileName: `SANARYS-${params.reference}.pdf`,
    };
  }
}
