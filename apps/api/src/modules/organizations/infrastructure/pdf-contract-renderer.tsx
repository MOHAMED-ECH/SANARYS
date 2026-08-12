import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { pdfPalette as palette } from "../../../shared/pdf/branding.js";
import type { DocumentPayload } from "../domain/ports.js";

/**
 * Convention-cadre de services sanitaires mutualises.
 *
 * Ce document a la forme d'un contrat, parce que c'en est un : en-tete et pied
 * de page repetes sur chaque feuillet, identification complete des parties,
 * articles numerotes, blocs de signature. Un client le fera relire par son
 * conseil — il doit pouvoir l'etre.
 *
 * Les mentions legales de SANARYS (forme juridique, RC, ICE, capital) ne sont
 * PAS inventees ici. Elles reprennent le meme marqueur « a completer » que la
 * page des mentions legales du site : fabriquer un numero de registre qui a
 * l'air vrai serait la pire facon de remplir un gabarit.
 */

/** Marqueur unique pour tout ce qui reste a renseigner par SANARYS. */
const A_COMPLETER = "[à compléter]";

const styles = StyleSheet.create({
  page: {
    paddingTop: 96,
    paddingBottom: 88,
    paddingHorizontal: 52,
    fontSize: 9.5,
    color: palette.slate,
    lineHeight: 1.55,
  },

  // --- En-tete, repete sur chaque feuillet --------------------------------
  header: {
    position: "absolute",
    top: 34,
    left: 52,
    right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1.5,
    borderBottomColor: palette.petrol,
    paddingBottom: 8,
  },
  brand: { fontSize: 16, color: palette.navy, fontWeight: "bold", letterSpacing: 1.2 },
  brandSub: { fontSize: 7, color: palette.petrol, marginTop: 1 },
  headerRight: { textAlign: "right" },
  headerRef: { fontSize: 7.5, color: palette.navy, fontWeight: "bold" },
  headerMeta: { fontSize: 7, marginTop: 1 },

  // --- Pied de page, repete sur chaque feuillet ---------------------------
  //
  // Positionne par `top` et non par `bottom` : avec `bottom`, le moteur ne
  // rendait tout simplement pas le bloc — verifie en extrayant le texte page
  // par page, ou il etait absent des trois feuillets alors que l'en-tete, cale
  // par `top`, apparaissait partout. 842 pt est la hauteur d'une page A4.
  footer: {
    position: "absolute",
    top: 842 - 74,
    left: 52,
    right: 52,
    borderTopWidth: 1,
    borderTopColor: palette.sand,
    paddingTop: 6,
  },
  footerLegal: { fontSize: 6.5, color: palette.slate, lineHeight: 1.4 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  footerNote: { fontSize: 6.5, color: palette.copper },
  footerPage: { fontSize: 6.5 },

  // --- Titre ---------------------------------------------------------------
  titleBlock: { marginBottom: 20, textAlign: "center" },
  title: { fontSize: 14, color: palette.navy, fontWeight: "bold", letterSpacing: 0.4 },
  subtitle: { fontSize: 9, color: palette.petrol, marginTop: 4 },

  // --- Parties -------------------------------------------------------------
  lead: { marginBottom: 10, fontWeight: "bold", color: palette.navy },
  party: {
    borderLeftWidth: 2,
    borderLeftColor: palette.petrol,
    paddingLeft: 10,
    marginBottom: 12,
  },
  partyName: { color: palette.navy, fontWeight: "bold" },
  partyRole: { fontSize: 8, color: palette.petrol, marginBottom: 2 },
  between: { textAlign: "center", marginVertical: 4, color: palette.navy, fontWeight: "bold" },

  // --- Articles ------------------------------------------------------------
  article: { marginTop: 14 },
  articleTitle: {
    fontSize: 10,
    color: palette.navy,
    fontWeight: "bold",
    marginBottom: 5,
    borderLeftWidth: 3,
    borderLeftColor: palette.copper,
    paddingLeft: 6,
  },
  paragraph: { marginBottom: 4 },
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 12, color: palette.copper },
  bulletText: { flex: 1 },

  table: { marginTop: 6, borderWidth: 1, borderColor: palette.sand },
  tableHead: { flexDirection: "row", backgroundColor: palette.mist },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: palette.sand },
  cell: { padding: 5, flex: 1 },
  cellNarrow: { padding: 5, width: 90, textAlign: "right" },
  cellHead: { color: palette.navy, fontWeight: "bold" },

  // --- Signatures ----------------------------------------------------------
  signatures: { flexDirection: "row", marginTop: 26, gap: 20 },
  signatureBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.sand,
    borderRadius: 3,
    padding: 10,
    minHeight: 96,
  },
  signatureTitle: { color: palette.navy, fontWeight: "bold", fontSize: 8.5 },
  signatureMeta: { fontSize: 7.5, marginTop: 2 },
  signatureLine: {
    marginTop: 34,
    borderTopWidth: 1,
    borderTopColor: palette.slate,
    paddingTop: 3,
    fontSize: 7,
  },
});

export interface ContractParty {
  readonly organizationName: string;
  readonly sharePercent: number | null;
}

export interface ContractDocumentData {
  readonly reference: string;
  readonly label: string;
  readonly organizationName: string;
  readonly zoneName: string | null;
  readonly startDate: Date;
  readonly endDate: Date | null;
  readonly modules: readonly string[];
  readonly parties: readonly ContractParty[];
}

const MODULE_LABELS: Record<string, string> = {
  AMBULANCE: "Ambulance dédiée avec équipage",
  INFIRMIER: "Présence infirmière sur les heures d'activité",
  MEDECIN: "Présence médicale programmée",
  INFIRMERIE: "Infirmerie centrale équipée",
};

/**
 * Tourne correctement le nom d'une zone dans une phrase.
 *
 * Les zones sont enregistrees sous « Zone Industrielle Bouskoura » : ecrire
 * « la zone industrielle de Zone Industrielle Bouskoura » repeterait le
 * qualificatif. Quand le nom se suffit a lui-meme, on l'emploie tel quel.
 */
function zonePhrase(nom: string): string {
  return /zone\s+industrielle/i.test(nom) ? `la ${nom}` : `la zone industrielle de ${nom}`;
}

const dateFr = (value: Date) =>
  value.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

function Article({ numero, titre, children }: { numero: number; titre: string; children: React.ReactNode }) {
  return (
    <View style={styles.article}>
      <Text style={styles.articleTitle}>
        Article {numero} — {titre}
      </Text>
      {children}
    </View>
  );
}

function Puce({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>—</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function ContractDeed({ data, generatedAt }: { data: ContractDocumentData; generatedAt: Date }) {
  const zone = data.zoneName ?? A_COMPLETER;
  const zoneDansPhrase = data.zoneName ? zonePhrase(data.zoneName) : `la zone industrielle ${A_COMPLETER}`;

  return (
    <Document title={`SANARYS — ${data.label}`} author="SANARYS" language="fr">
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.brand}>SANARYS</Text>
            <Text style={styles.brandSub}>
              Santé opérationnelle mutualisée des zones industrielles
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerRef}>Réf. {data.reference}</Text>
            <Text style={styles.headerMeta}>Convention-cadre CSPS</Text>
            <Text style={styles.headerMeta}>Édition du {dateFr(generatedAt)}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerLegal}>
            SANARYS — {A_COMPLETER} au capital de {A_COMPLETER} · RC {A_COMPLETER} · ICE{" "}
            {A_COMPLETER} · Siège : Casablanca, Maroc · contact@sanarys.ma · +212 5 22 00 00 00
          </Text>
          <View style={styles.footerRow}>
            <Text style={styles.footerNote}>
              Document de démonstration — sans valeur contractuelle
            </Text>
            <Text
              style={styles.footerPage}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
            />
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>CONVENTION-CADRE</Text>
          <Text style={styles.title}>DE SERVICES SANITAIRES MUTUALISÉS</Text>
          <Text style={styles.subtitle}>{zone}</Text>
        </View>

        <Text style={styles.lead}>Entre les soussignés,</Text>

        <View style={styles.party}>
          <Text style={styles.partyRole}>Le prestataire</Text>
          <Text style={styles.partyName}>SANARYS</Text>
          <Text>
            {A_COMPLETER} au capital de {A_COMPLETER}, immatriculée au registre du commerce de
            Casablanca sous le numéro {A_COMPLETER}, ICE {A_COMPLETER}, dont le siège social est
            sis {A_COMPLETER}, Casablanca, Maroc.
          </Text>
          <Text>Représentée par {A_COMPLETER}, en qualité de {A_COMPLETER}.</Text>
          <Text>Ci-après désignée « SANARYS ».</Text>
        </View>

        <Text style={styles.between}>et</Text>

        <View style={styles.party}>
          <Text style={styles.partyRole}>Le groupement</Text>
          <Text style={styles.partyName}>{data.organizationName}</Text>
          <Text>
            Groupement d&apos;entreprises implantées dans {zoneDansPhrase}, immatriculé sous le{" "}
            numéro {A_COMPLETER}, dont le siège est sis {A_COMPLETER}.
          </Text>
          <Text>Représenté par {A_COMPLETER}, dûment habilité à cet effet.</Text>
          <Text>Ci-après désigné « le Groupement ».</Text>
        </View>

        <Text style={styles.paragraph}>
          Ci-après désignées ensemble « les Parties », il a été préalablement exposé ce qui suit.
        </Text>

        <Article numero={1} titre="Objet">
          <Text style={styles.paragraph}>
            La présente convention a pour objet de définir les conditions dans lesquelles SANARYS
            met en place et exploite, au bénéfice des entreprises membres du Groupement, un Centre
            de Services Partagés Sanitaires (ci-après « le CSPS ») implanté au sein de{" "}
            {zoneDansPhrase}.
          </Text>
          <Text style={styles.paragraph}>
            Le CSPS constitue un dispositif de secours et de prévention mutualisé. Il ne se
            substitue ni à la médecine du travail, ni aux services publics de secours.
          </Text>
        </Article>

        <Article numero={2} titre="Modules contractualisés">
          <Text style={styles.paragraph}>
            SANARYS met à disposition du Groupement les moyens suivants :
          </Text>
          {data.modules.length === 0 ? (
            <Puce>{A_COMPLETER}</Puce>
          ) : (
            data.modules.map((module) => (
              <Puce key={module}>{MODULE_LABELS[module] ?? module}</Puce>
            ))
          )}
          <Text style={styles.paragraph}>
            Toute évolution du périmètre fait l&apos;objet d&apos;un avenant écrit et signé des deux
            Parties.
          </Text>
        </Article>

        <Article numero={3} titre="Engagements de service">
          <Puce>
            Disponibilité du dispositif sur l&apos;intégralité des heures d&apos;activité déclarées
            par le Groupement.
          </Puce>
          <Puce>
            Objectif de délai d&apos;intervention inférieur à dix (10) minutes depuis le point
            d&apos;ancrage vers chaque site membre. Ce délai constitue un objectif contractuel ; il
            est mesuré et publié mensuellement.
          </Puce>
          <Puce>
            Remise d&apos;un rapport mensuel d&apos;activité agrégé dans les cinq (5) jours ouvrés
            suivant la fin de chaque mois.
          </Puce>
          <Puce>
            Maintenance, assurance et remplacement des matériels immobilisés pris en charge par
            SANARYS.
          </Puce>
        </Article>

        <Article numero={4} titre="Clé de répartition entre membres">
          <Text style={styles.paragraph}>
            La contribution de chaque entreprise membre est calculée selon une clé hybride : une
            part fixe égale entre les membres, et une part proportionnelle à l&apos;effectif
            déclaré. La répartition en vigueur à la date de signature est la suivante.
          </Text>

          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.cell, styles.cellHead]}>Entreprise membre</Text>
              <Text style={[styles.cellNarrow, styles.cellHead]}>Quote-part</Text>
            </View>
            {data.parties.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={styles.cell}>{A_COMPLETER}</Text>
                <Text style={styles.cellNarrow}>—</Text>
              </View>
            ) : (
              data.parties.map((party) => (
                <View key={party.organizationName} style={styles.tableRow}>
                  <Text style={styles.cell}>{party.organizationName}</Text>
                  <Text style={styles.cellNarrow}>
                    {party.sharePercent === null ? "—" : `${party.sharePercent} %`}
                  </Text>
                </View>
              ))
            )}
          </View>

          <Text style={[styles.paragraph, { marginTop: 6 }]}>
            La clé est révisée annuellement sur la base des effectifs constatés. Les montants
            correspondants figurent en annexe financière, établie séparément.
          </Text>
        </Article>

        <Article numero={5} titre="Durée et renouvellement">
          <Text style={styles.paragraph}>
            La présente convention prend effet le {dateFr(data.startDate)}
            {data.endDate
              ? ` et expire le ${dateFr(data.endDate)}.`
              : " pour une durée indéterminée, chaque Partie pouvant y mettre fin dans les conditions de l'article 7."}
          </Text>
        </Article>

        <Article numero={6} titre="Données personnelles et confidentialité">
          <Text style={styles.paragraph}>
            Les rapports remis au Groupement sont exclusivement agrégés. Ils ne contiennent aucune
            information permettant d&apos;identifier un salarié, ni aucun élément de dossier de
            soins. Les données de santé éventuellement recueillies lors d&apos;une intervention
            relèvent du secret médical et ne sont en aucun cas communiquées au Groupement ni à ses
            membres.
          </Text>
          <Text style={styles.paragraph}>
            Les Parties s&apos;engagent au respect de la loi 09-08 relative à la protection des
            personnes physiques à l&apos;égard du traitement des données à caractère personnel.
          </Text>
        </Article>

        <Article numero={7} titre="Résiliation">
          <Text style={styles.paragraph}>
            Chaque Partie peut résilier la présente convention par lettre recommandée avec accusé
            de réception, moyennant un préavis de {A_COMPLETER}. En cas de manquement grave, la
            résiliation peut intervenir de plein droit après mise en demeure restée sans effet
            pendant trente (30) jours.
          </Text>
        </Article>

        <Article numero={8} titre="Droit applicable et juridiction">
          <Text style={styles.paragraph}>
            La présente convention est régie par le droit marocain. Tout différend relatif à son
            interprétation ou à son exécution sera soumis, à défaut de règlement amiable, aux
            tribunaux compétents de Casablanca.
          </Text>
        </Article>

        <View style={styles.signatures} wrap={false}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Pour SANARYS</Text>
            <Text style={styles.signatureMeta}>Nom et qualité : {A_COMPLETER}</Text>
            <Text style={styles.signatureMeta}>Fait à Casablanca, le {A_COMPLETER}</Text>
            <Text style={styles.signatureLine}>Signature et cachet</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Pour le Groupement</Text>
            <Text style={styles.signatureMeta}>Nom et qualité : {A_COMPLETER}</Text>
            <Text style={styles.signatureMeta}>Fait à {A_COMPLETER}, le {A_COMPLETER}</Text>
            <Text style={styles.signatureLine}>Signature et cachet</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export class PdfContractRenderer {
  async render(data: ContractDocumentData, generatedAt = new Date()): Promise<DocumentPayload> {
    const bytes = await renderToBuffer(<ContractDeed data={data} generatedAt={generatedAt} />);
    return {
      bytes,
      mimeType: "application/pdf",
      fileName: `sanarys-convention-${data.reference.toLowerCase()}.pdf`,
    };
  }
}
