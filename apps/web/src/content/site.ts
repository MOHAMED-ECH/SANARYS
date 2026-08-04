/**
 * Contenu éditorial de référence.
 *
 * Règle de publication (cahier des charges section 14.2) : tout chiffre affiché
 * doit être sourçable. Les éléments ci-dessous proviennent de la brochure
 * SANARYS et sont présentés comme des ENGAGEMENTS ou des OBJECTIFS, jamais
 * comme des mesures vérifiées par un tiers. Aucun témoignage, logo client,
 * certification ou étude de cas n'est publié tant qu'il n'est pas vérifié
 * et autorisé par écrit.
 */

export const SITE = {
  name: "SANARYS",
  baseline: "Santé opérationnelle mutualisée des zones industrielles",
  headline: "La santé opérationnelle mutualisée des zones industrielles",
  subheadline:
    "Ambulance, personnel, infirmerie et reporting, déployés et pilotés par SANARYS pour les groupements de PME.",
  email: "contact@sanarys.ma",
  phone: "+212 5 22 00 00 00",
  city: "Casablanca, Maroc",
} as const;

/** Engagements de service issus de la brochure — formulés sans absolu. */
export const COMMITMENTS = [
  {
    value: "24/7",
    label: "Disponibilité opérationnelle",
    detail: "Le dispositif contractualisé couvre l'intégralité des heures d'activité de la zone.",
  },
  {
    value: "< 10 min",
    label: "Objectif contractuel d'intervention",
    detail:
      "Objectif de délai depuis le point d'ancrage vers chaque PME membre. Le délai réel est mesuré et publié dans le rapport mensuel.",
  },
  {
    value: "2 à 5 ans",
    label: "Durée de contrat recommandée",
    detail:
      "Un engagement pluriannuel permet d'amortir le dispositif sur l'ensemble du groupement.",
  },
  {
    value: "30 à 45 j",
    label: "Délai de déploiement",
    detail:
      "Délai indicatif entre la signature de la convention-cadre et la mise en service effective du CSPS.",
  },
] as const;

export const CSPS_STEPS = [
  {
    number: "01",
    title: "Un point d'ancrage central",
    description:
      "L'infirmerie du CSPS est implantée dans un local dédié au cœur de la zone, accessible depuis chaque PME membre.",
  },
  {
    number: "02",
    title: "Un rayonnement sur toute la zone",
    description:
      "L'ambulance couvre l'intégralité du périmètre. En cas d'urgence chez un membre, elle intervient directement sur site.",
  },
  {
    number: "03",
    title: "Un coût partagé entre les membres",
    description:
      "Les charges sont réparties selon une clé définie en commun, rendant accessible un dispositif qu'aucune PME ne financerait seule.",
  },
] as const;

export const SERVICES = [
  {
    slug: "location-ambulances",
    number: "01",
    title: "Location d'ambulances",
    summary:
      "Location longue, moyenne et courte durée — types A, B et C. Maintenance, assurance, fiscalité et remplacement inclus.",
    problem:
      "Immobiliser une ambulance, l'assurer, l'entretenir et la remplacer en cas de panne représente un investissement et une charge de gestion qu'une PME seule absorbe difficilement.",
    audience:
      "Directions générales, responsables HSE, gestionnaires de zones, organisateurs d'événements.",
    included: [
      "Véhicule conforme à la réglementation marocaine, type A, B ou C selon le niveau de risque",
      "Équipement embarqué : défibrillateur, oxygénothérapie, brancard, matériel de bilan",
      "Maintenance, assurance, vignette, contrôle technique et fiscalité pris en charge",
      "Véhicule de remplacement en cas d'immobilisation",
    ],
    steps: [
      "Analyse du besoin et du niveau de risque",
      "Choix du type de véhicule et de la durée",
      "Mise à disposition et prise en main",
      "Suivi de maintenance et reporting",
    ],
  },
  {
    slug: "personnel-medical",
    number: "02",
    title: "Personnel médical & paramédical",
    summary:
      "Médecins, infirmiers diplômés d'État, ambulanciers, secouristes. Permanence sur site, astreintes, missions ponctuelles.",
    problem:
      "Recruter, qualifier, planifier et remplacer du personnel médical est un métier à part entière, éloigné du cœur d'activité d'une entreprise industrielle.",
    audience: "Directions des ressources humaines, responsables QHSE, directions de site.",
    included: [
      "Personnel titulaire des diplômes et habilitations requis",
      "Permanence sur site pendant les heures d'activité, astreintes possibles",
      "Continuité assurée : remplacement immédiat en cas d'indisponibilité",
      "Tenue des registres d'accidents du travail et des dossiers de soins",
    ],
    steps: [
      "Définition du besoin et des horaires",
      "Sélection et vérification des habilitations",
      "Affectation et intégration sur site",
      "Suivi qualité et reporting mensuel",
    ],
  },
  {
    slug: "amenagement-medical",
    number: "03",
    title: "Aménagement d'espaces médicaux",
    summary:
      "Infirmeries d'entreprise clés en main, postes de secours, salles de soins, équipement et consommables.",
    problem:
      "Un local vide ne fait pas une infirmerie : il faut concevoir, équiper, approvisionner et maintenir la conformité dans le temps.",
    audience: "Directions techniques, services généraux, responsables HSE.",
    included: [
      "Conception et aménagement clés en main du local",
      "Mobilier médical : table d'examen, armoires pharmaceutiques, poste infirmier",
      "Fourniture initiale et renouvellement des consommables",
      "Signalétique réglementaire et mise en conformité",
    ],
    steps: [
      "Visite du local et étude d'implantation",
      "Proposition d'aménagement et validation",
      "Travaux, équipement et mise en service",
      "Réapprovisionnement périodique",
    ],
  },
  {
    slug: "couverture-evenementielle",
    number: "04",
    title: "Couverture événementielle (DPS)",
    summary:
      "Étude du risque, dimensionnement, coordination avec les autorités, documents réglementaires, bilan post-événement.",
    problem:
      "Un dispositif prévisionnel de secours mal dimensionné expose l'organisateur à un risque humain et à un risque réglementaire.",
    audience: "Organisateurs d'événements, collectivités, fédérations, entreprises.",
    included: [
      "Étude du risque et dimensionnement du dispositif",
      "Équipes qualifiées et matériel adapté à la manifestation",
      "Coordination avec les autorités compétentes",
      "Documents réglementaires et bilan post-événement",
    ],
    steps: [
      "Analyse de la manifestation et du public attendu",
      "Dimensionnement et proposition",
      "Déploiement le jour J",
      "Bilan et retour d'expérience",
    ],
  },
  {
    slug: "services-assureurs",
    number: "05",
    title: "Services aux assureurs",
    summary:
      "Transport sanitaire d'assurés, rapatriement intra-Maroc, assistance à domicile, expertises, dossiers administratifs.",
    problem:
      "Les assureurs ont besoin d'un opérateur capable d'intervenir partout au Maroc avec une traçabilité administrative irréprochable.",
    audience: "Compagnies d'assurance, sociétés d'assistance, mutuelles.",
    included: [
      "Transport sanitaire d'assurés et rapatriement intra-Maroc",
      "Assistance à domicile",
      "Appui aux expertises",
      "Constitution et suivi des dossiers administratifs",
    ],
    steps: [
      "Conventionnement",
      "Déclenchement de la mission",
      "Réalisation et traçabilité",
      "Restitution du dossier",
    ],
  },
  {
    slug: "transport-sanitaire",
    number: "06",
    title: "Transport sanitaire",
    summary:
      "Urgence médicalisée, transport programmé, transferts inter-établissements, mobilité réduite.",
    problem:
      "Le transport d'un patient exige le bon véhicule, le bon équipage et la bonne traçabilité, à la bonne heure.",
    audience: "Établissements de santé, entreprises, assureurs, particuliers via conventions.",
    included: [
      "Urgence médicalisée et transport programmé",
      "Transferts inter-établissements",
      "Transport de personnes à mobilité réduite",
      "Couverture nationale",
    ],
    steps: [
      "Réception et qualification de la demande",
      "Affectation de l'équipage et du véhicule",
      "Transport et transmission",
      "Clôture et traçabilité",
    ],
  },
  {
    slug: "formations",
    number: "07",
    title: "Formations & sensibilisation",
    summary:
      "Gestes qui sauvent, sauveteurs secouristes du travail, utilisation du défibrillateur, simulations d'évacuation.",
    problem:
      "Les premières minutes d'un accident se jouent avant l'arrivée des secours : elles dépendent des collègues présents.",
    audience: "Responsables HSE, RH, membres du comité de sécurité, référents sécurité.",
    included: [
      "Gestes qui sauvent et sauveteurs secouristes du travail",
      "Utilisation du défibrillateur automatisé externe",
      "Simulations d'évacuation",
      "Attestations et recyclages",
    ],
    steps: [
      "Analyse des besoins et des effectifs",
      "Planification des sessions",
      "Animation et évaluation",
      "Attestations et suivi des recyclages",
    ],
  },
  {
    slug: "conseil-audit",
    number: "08",
    title: "Conseil & audit sanitaire",
    summary:
      "Audit du dispositif sanitaire, protocoles d'urgence, mise en conformité réglementaire.",
    problem:
      "Sans état des lieux structuré, une entreprise découvre ses lacunes au pire moment : pendant l'accident ou pendant l'audit d'un donneur d'ordre.",
    audience: "Directions générales, QHSE, achats, auditeurs internes.",
    included: [
      "Audit du dispositif sanitaire existant",
      "Rédaction et test des protocoles d'urgence",
      "Plan de mise en conformité",
      "Restitution documentée",
    ],
    steps: [
      "Visite et collecte",
      "Analyse et identification des écarts",
      "Restitution et plan d'action",
      "Accompagnement à la mise en œuvre",
    ],
  },
] as const;

export const SECTORS = [
  {
    slug: "automobile",
    title: "Automobile & câblage",
    lead: "Lignes de production continues, effectifs denses, exigences fortes des donneurs d'ordre internationaux.",
    risks: [
      "Accidents mécaniques sur ligne et sur presses",
      "Troubles musculo-squelettiques liés aux postes répétitifs",
      "Travail posté incluant des équipes de nuit",
    ],
    stake:
      "Les donneurs d'ordre internationaux auditent le dispositif de secours de leurs fournisseurs. Un dispositif documenté et tracé devient un argument commercial.",
  },
  {
    slug: "logistique",
    title: "Logistique & entreposage",
    lead: "Grandes surfaces, engins de manutention, flux tendus et pics saisonniers.",
    risks: [
      "Collisions et renversements d'engins de manutention",
      "Chutes de hauteur depuis les racks et quais",
      "Pics d'activité saisonniers avec personnel intérimaire",
    ],
    stake:
      "Les grandes surfaces d'entreposage allongent les distances internes : le délai d'accès au blessé compte autant que le délai d'arrivée des secours.",
  },
  {
    slug: "textile",
    title: "Textile & confection",
    lead: "Effectifs importants, ateliers denses, forte proportion de personnel féminin.",
    risks: [
      "Coupures et piqûres sur machines de confection",
      "Malaises liés à la chaleur et à la station assise prolongée",
      "Densité d'occupation élevée des ateliers",
    ],
    stake:
      "La densité des ateliers impose des protocoles d'évacuation clairs et un point de soins accessible à pied.",
  },
  {
    slug: "agroalimentaire",
    title: "Agroalimentaire",
    lead: "Chaîne du froid, machines de découpe, exigences d'hygiène renforcées.",
    risks: [
      "Coupures sur machines de découpe",
      "Chutes de plain-pied sur sols humides",
      "Exposition au froid et aux produits de nettoyage",
    ],
    stake:
      "Les contraintes d'hygiène conditionnent l'implantation du poste de soins et les circuits d'intervention.",
  },
  {
    slug: "plasturgie",
    title: "Plasturgie & chimie",
    lead: "Presses à injection, matières chaudes, produits chimiques.",
    risks: [
      "Brûlures thermiques sur presses et extrudeuses",
      "Exposition à des produits chimiques",
      "Risque incendie lié aux matières",
    ],
    stake:
      "La nature des risques oriente le niveau d'équipement du véhicule et la qualification requise de l'équipe.",
  },
  {
    slug: "evenementiel",
    title: "Événementiel",
    lead: "Public nombreux, durée limitée, coordination avec les autorités.",
    risks: [
      "Malaises et déshydratation dans le public",
      "Mouvements de foule",
      "Accidents de montage et démontage",
    ],
    stake:
      "Le dispositif prévisionnel de secours doit être dimensionné et documenté avant l'événement, pas improvisé le jour J.",
  },
] as const;

export const FAQ = [
  {
    question: "Qu'est-ce qu'un CSPS exactement ?",
    answer:
      "Un Centre de Services Partagés Sanitaires est un dispositif médical mutualisé implanté au cœur d'une zone industrielle : une ambulance dédiée, un point d'ancrage central, et selon les besoins un infirmier, un médecin et une infirmerie aménagée. Il est financé collectivement par plusieurs PME voisines et exploité intégralement par SANARYS.",
  },
  {
    question: "Combien d'entreprises faut-il pour constituer un groupement ?",
    answer:
      "Il n'y a pas de seuil unique : le nombre dépend de l'effectif total, de l'étendue de la zone et du niveau de risque. Le simulateur vous donne un ordre de grandeur, et l'audit terrain permet d'arrêter la configuration définitive.",
  },
  {
    question: "Comment le coût est-il réparti entre les membres ?",
    answer:
      "Selon une clé de répartition définie en commun. Notre formule de référence combine une part fixe égale entre les membres et une part proportionnelle à l'effectif, mais elle est configurable par le groupement (surface, niveau de risque, horaires).",
  },
  {
    question: "Le simulateur donne-t-il un prix ?",
    answer:
      "Non. Le simulateur produit une configuration indicative et un ordre de grandeur de répartition, jamais un devis. Seule une proposition technique et financière établie après audit terrain engage les parties.",
  },
  {
    question: "Que se passe-t-il si l'ambulance est immobilisée ?",
    answer:
      "La continuité de service fait partie de l'engagement contractuel : en cas d'indisponibilité d'un véhicule ou d'un personnel, le remplacement est assuré sans rupture de service.",
  },
  {
    question: "Qui gère le personnel médical au quotidien ?",
    answer:
      "SANARYS assure la gestion opérationnelle complète : recrutement, habilitations, planning, remplacements, maintenance, consommables et reporting. Les PME membres n'ont aucune contrainte de gestion.",
  },
  {
    question: "Comment les données de santé sont-elles protégées ?",
    answer:
      "Le secret médical s'applique. Les rapports remis aux entreprises membres sont agrégés : ils ne contiennent pas d'information permettant d'identifier un salarié. Les traitements de données personnelles suivent le cadre de la loi 09-08 et les exigences de la CNDP.",
  },
  {
    question: "Quel est le délai de mise en place ?",
    answer:
      "Le délai indicatif est de 30 à 45 jours entre la signature de la convention-cadre et la mise en service, selon la disponibilité du local et la complexité de l'aménagement.",
  },
] as const;

export const DEPLOYMENT_STEPS = [
  {
    number: "01",
    title: "Expression d'intérêt",
    description:
      "Une PME, une association d'entreprises ou un gestionnaire de zone prend contact et exprime son intérêt.",
  },
  {
    number: "02",
    title: "Audit terrain gratuit",
    description:
      "Nos équipes cartographient la zone, évaluent les risques et identifient l'emplacement optimal du point d'ancrage.",
  },
  {
    number: "03",
    title: "Constitution du groupement",
    description:
      "Réunion avec les dirigeants des PME ciblées, présentation du modèle et définition de la clé de répartition.",
  },
  {
    number: "04",
    title: "Proposition finalisée",
    description:
      "Remise d'une proposition technique et financière détaillée, individuelle pour chaque PME membre.",
  },
  {
    number: "05",
    title: "Convention-cadre & contrats",
    description:
      "Signature de la convention-cadre avec le groupement et des contrats individuels avec chaque membre.",
  },
  {
    number: "06",
    title: "Déploiement",
    description:
      "Mise en service : aménagement, affectation de l'ambulance et du personnel, formation des référents sécurité.",
  },
] as const;

export type Service = (typeof SERVICES)[number];
export type Sector = (typeof SECTORS)[number];
