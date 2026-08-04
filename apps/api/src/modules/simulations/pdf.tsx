import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import type { SimulationInput, SimulationResult } from "@sanarys/schemas";

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

const palette = {
  navy: "#0A1730",
  petrol: "#0E6E7A",
  copper: "#B5652C",
  slate: "#4A5568",
  mist: "#F7F8FA",
  sand: "#EDE3D2",
};

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
  NURSE: "Infirmier(ere) permanent(e)",
  DOCTOR: "Medecin dedie sur site",
  INFIRMARY: "Infirmerie centrale amenagee",
};

const VEHICLE_LABELS: Record<string, string> = {
  TYPE_B: "Ambulance type B - soins d'urgence",
  TYPE_C: "Ambulance type C - reanimation mobile",
};

const RISK_LABELS: Record<string, string> = {
  LOW: "Faible",
  MEDIUM: "Modere",
  HIGH: "Eleve",
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
      title={`SANARYS - Recapitulatif de simulation CSPS ${reference}`}
      author="SANARYS"
      subject="Simulation indicative de dispositif CSPS - document non contractuel"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.brand}>SANARYS</Text>
          <Text style={styles.brandSub}>Sante operationnelle mutualisee des zones industrielles</Text>
        </View>

        <Text style={styles.title}>Recapitulatif de simulation CSPS</Text>
        <Text style={styles.meta}>
          Reference : {reference} · Genere le {dateLabel} · Moteur de regles version{" "}
          {result.ruleSetVersion}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perimetre declare</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Zone industrielle</Text>
            <Text style={styles.value}>
              {input.zone?.zoneName ?? "-"} ({input.zone?.city ?? "-"})
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Entreprises concernees</Text>
            <Text style={styles.value}>{input.companies?.numberOfCompanies ?? "-"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Effectif total</Text>
            <Text style={styles.value}>{input.companies?.totalHeadcount ?? "-"} salaries</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Niveau de risque declare</Text>
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
                    : "medecin"
                  : null,
              ]
                .filter(Boolean)
                .join(", ") || "aucun declare"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration indicative proposee</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Module socle : {VEHICLE_LABELS[result.vehicleType.code] ?? result.vehicleType.code}
            </Text>
            <Text>{result.vehicleType.rationale}</Text>
            <Text style={{ fontSize: 7, marginTop: 3, color: palette.slate }}>
              Regle appliquee : {result.vehicleType.ruleId}
            </Text>
          </View>

          {result.suggestedModules.length > 0 ? (
            result.suggestedModules.map((module) => (
              <View style={styles.card} key={module.ruleId}>
                <Text style={styles.cardTitle}>
                  Module suggere : {MODULE_LABELS[module.code] ?? module.code}
                </Text>
                <Text>{module.rationale}</Text>
                <Text style={{ fontSize: 7, marginTop: 3, color: palette.slate }}>
                  Regle appliquee : {module.ruleId}
                </Text>
              </View>
            ))
          ) : (
            <Text>
              Aucun module optionnel n'est suggere par le moteur sur la base des elements declares.
              L'audit terrain peut faire evoluer cette recommandation.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Couverture visee</Text>
          <Text style={{ color: palette.navy, fontWeight: "bold" }}>{result.coverage.targetLabel}</Text>
          <Text style={{ marginTop: 3 }}>{result.coverage.rationale}</Text>
          <Text style={{ marginTop: 3, fontStyle: "italic" }}>{result.coverage.disclaimer}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cle de repartition indicative</Text>
          <Text>{result.costShare.rationale}</Text>
          <Text style={{ fontSize: 7, marginTop: 3 }}>
            Formule : {result.costShare.formula} · Regle : {result.costShare.ruleId}
          </Text>
        </View>

        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Hypotheses retenues</Text>
          {result.assumptions.map((assumption, index) => (
            <Bullet key={index}>{assumption}</Bullet>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ce que cette simulation ne couvre pas</Text>
          <Bullet>Aucun prix ferme ni engagement tarifaire : seules des fourchettes indicatives.</Bullet>
          <Bullet>Aucun calcul de routage reel : les temps affiches sont des objectifs, pas des mesures.</Bullet>
          <Bullet>Aucune evaluation medicale ni recommandation clinique.</Bullet>
          <Bullet>Aucune verification de conformite reglementaire de votre site.</Bullet>
          <Bullet>La configuration definitive est arretee apres audit terrain contradictoire.</Bullet>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Document non contractuel</Text>
          <Text>
            Ce recapitulatif est une estimation indicative produite automatiquement a partir des
            elements que vous avez declares. Il ne constitue ni un devis, ni une offre, ni un
            engagement contractuel de SANARYS. Seule une proposition technique et financiere signee,
            etablie apres audit terrain, engage les parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prochaine etape</Text>
          <Text>
            Demandez un audit terrain gratuit : nos equipes cartographient la zone, evaluent les
            risques et identifient l'emplacement optimal du point d'ancrage. Contact : contact@sanarys.ma
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            SANARYS · Recapitulatif de simulation {reference} · Moteur v{result.ruleSetVersion}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderSimulationPdf(props: Props): Promise<Buffer> {
  return renderToBuffer(<SimulationSummary {...props} />);
}
