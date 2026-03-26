import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente | RelancePro Africa',
  description: 'Conditions Générales de Vente de RelancePro Africa, plateforme SaaS de recouvrement de créances en Afrique.',
};

export default function CGVPage() {
  return (
    <>
      <header className="mb-8 not-prose">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Conditions Générales de Vente
        </h1>
        <p className="mt-2 text-muted-foreground">
          Applicables à compter du 15 janvier 2025
        </p>
      </header>

      <nav className="mb-8 p-4 bg-muted/50 rounded-lg not-prose">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
          Sommaire
        </h2>
        <ol className="space-y-1 text-sm">
          <li><a href="#objet" className="text-primary hover:underline">1. Objet du contrat</a></li>
          <li><a href="#services" className="text-primary hover:underline">2. Description des services</a></li>
          <li><a href="#obligations" className="text-primary hover:underline">3. Obligations des parties</a></li>
          <li><a href="#tarifs" className="text-primary hover:underline">4. Tarifs et paiement</a></li>
          <li><a href="#duree" className="text-primary hover:underline">5. Durée et résiliation</a></li>
          <li><a href="#responsabilite" className="text-primary hover:underline">6. Limitation de responsabilité</a></li>
          <li><a href="#propriete" className="text-primary hover:underline">7. Propriété intellectuelle</a></li>
          <li><a href="#donnees" className="text-primary hover:underline">8. Données personnelles</a></li>
          <li><a href="#droit" className="text-primary hover:underline">9. Droit applicable</a></li>
        </ol>
      </nav>

      <section id="objet" className="mb-8">
        <h2>1. Objet du contrat</h2>
        <p>
          Les présentes Conditions Générales de Vente (ci-après &quot;CGV&quot;) régissent les relations contractuelles entre 
          <strong> RelancePro Africa SAS</strong> (ci-après &quot;RelancePro Africa&quot; ou &quot;le Prestataire&quot;) 
          et toute personne physique ou morale (ci-après &quot;le Client&quot;) souhaitant souscrire aux services 
          proposés par RelancePro Africa.
        </p>
        <p>
          RelancePro Africa est une plateforme SaaS (Software as a Service) spécialisée dans le recouvrement 
          de créances, destinée aux entreprises opérant sur le continent africain.
        </p>
        <p>
          L&apos;utilisation des services de RelancePro Africa implique l&apos;acceptation pleine et entière 
          des présentes CGV par le Client.
        </p>
      </section>

      <section id="services" className="mb-8">
        <h2>2. Description des services</h2>
        
        <h3>2.1 Services proposés</h3>
        <p>RelancePro Africa propose les services suivants :</p>
        <ul>
          <li>
            <strong>Gestion des créances</strong> : Création, suivi et gestion des dossiers de créances 
            clients, avec tableau de bord personnalisé et indicateurs de performance.
          </li>
          <li>
            <strong>Automatisation des relances</strong> : Envoi automatique de rappels par email, SMS, 
            WhatsApp et autres canaux de communication selon des scénarios paramétrables.
          </li>
          <li>
            <strong>Analyse IA</strong> : Utilisation de l&apos;intelligence artificielle pour analyser 
            les comportements de paiement, prédire les risques de défaut et optimiser les stratégies de recouvrement.
          </li>
          <li>
            <strong>Rapports et statistiques</strong> : Génération de rapports détaillés sur les performances 
            de recouvrement, avec export aux formats Excel et PDF.
          </li>
          <li>
            <strong>Gestion des paiements</strong> : Intégration avec des solutions de paiement pour faciliter 
            le règlement des créances (Paystack, etc.).
          </li>
          <li>
            <strong>Support client</strong> : Assistance technique et fonctionnelle via email, chat et téléphone 
            selon le plan souscrit.
          </li>
        </ul>

        <h3>2.2 Évolutions des services</h3>
        <p>
          RelancePro Africa se réserve le droit de faire évoluer ses services, d&apos;en ajouter de nouveaux 
          ou de modifier les fonctionnalités existantes, sous réserve d&apos;en informer le Client par 
          tout moyen approprié.
        </p>

        <h3>2.3 Disponibilité</h3>
        <p>
          RelancePro Africa s&apos;engage à maintenir un taux de disponibilité du service de 99,5% 
          sur une année glissante, hors opérations de maintenance programmées communiquées au moins 
          48 heures à l&apos;avance.
        </p>
      </section>

      <section id="obligations" className="mb-8">
        <h2>3. Obligations des parties</h2>
        
        <h3>3.1 Obligations de RelancePro Africa</h3>
        <p>RelancePro Africa s&apos;engage à :</p>
        <ul>
          <li>Fournir les services conformément aux présentes CGV et aux caractéristiques annoncées ;</li>
          <li>Maintenir la sécurité et la confidentialité des données du Client ;</li>
          <li>Assurer le support technique selon les modalités du plan souscrit ;</li>
          <li>Informer le Client de toute évolution majeure des services ;</li>
          <li>Respecter les lois et règlements applicables en matière de protection des données personnelles.</li>
        </ul>

        <h3>3.2 Obligations du Client</h3>
        <p>Le Client s&apos;engage à :</p>
        <ul>
          <li>Fournir des informations exactes et complètes lors de l&apos;inscription ;</li>
          <li>Utiliser les services conformément à leur destination et aux présentes CGV ;</li>
          <li>Ne pas utiliser les services à des fins illicites ou frauduleuses ;</li>
          <li>Garantir l&apos;exactitude et la licéité des données de créances importées ;</li>
          <li>Respecter les droits des débiteurs dans le cadre des procédures de recouvrement ;</li>
          <li>Régler les factures dans les délais convenus ;</li>
          <li>Préserver la confidentialité de ses identifiants de connexion.</li>
        </ul>

        <h3>3.3 Utilisation acceptable</h3>
        <p>
          Le Client s&apos;interdit d&apos;utiliser les services de RelancePro Africa pour :
        </p>
        <ul>
          <li>Le recouvrement de créances fictives, contestées ou prescrites ;</li>
          <li>L&apos;exercice de pressions illégales ou de harcèlement sur les débiteurs ;</li>
          <li>La collecte de données personnelles non autorisée ;</li>
          <li>Toute activité contraire à l&apos;ordre public ou aux bonnes mœurs.</li>
        </ul>
      </section>

      <section id="tarifs" className="mb-8">
        <h2>4. Tarifs et paiement</h2>
        
        <h3>4.1 Modalités tarifaires</h3>
        <p>
          Les tarifs des services de RelancePro Africa sont détaillés sur le site internet et varient 
          selon les formules proposées (Starter, Professional, Enterprise). Les tarifs sont exprimés 
          en euros (EUR) ou dans la devise locale selon le pays du Client.
        </p>

        <h3>4.2 Facturation</h3>
        <p>
          La facturation s&apos;effectue selon la périodicité choisie par le Client (mensuelle ou annuelle). 
          Une facture électronique est émise et disponible dans l&apos;espace Client.
        </p>

        <h3>4.3 Conditions de paiement</h3>
        <p>
          Le paiement est exigible à réception de la facture, soit :
        </p>
        <ul>
          <li>Par prélèvement automatique sur carte bancaire ;</li>
          <li>Par virement bancaire dans un délai de 30 jours ;</li>
          <li>Via les partenaires de paiement intégrés (Paystack).</li>
        </ul>

        <h3>4.4 Retard de paiement</h3>
        <p>
          En cas de retard de paiement, RelancePro Africa se réserve le droit de :
        </p>
        <ul>
          <li>Appliquer des pénalités de retard au taux de 1,5% par mois de retard ;</li>
          <li>Suspendre l&apos;accès aux services après mise en demeure restée sans effet pendant 15 jours ;</li>
          <li>Résilier le contrat conformément à l&apos;article 5.</li>
        </ul>

        <h3>4.5 Modification des tarifs</h3>
        <p>
          RelancePro Africa peut modifier ses tarifs à tout moment, sous réserve d&apos;en informer 
          le Client au moins 30 jours avant l&apos;entrée en vigueur. Le Client dispose alors d&apos;un 
          délai de 15 jours pour résilier son abonnement sans frais.
        </p>
      </section>

      <section id="duree" className="mb-8">
        <h2>5. Durée et résiliation</h2>
        
        <h3>5.1 Durée du contrat</h3>
        <p>
          Le contrat est conclu pour une durée déterminée correspondant à la période d&apos;abonnement 
          choisie par le Client (mensuel ou annuel). Il se renouvelle par tacite reconduction pour 
          des périodes équivalentes, sauf dénonciation par l&apos;une des parties.
        </p>

        <h3>5.2 Résiliation par le Client</h3>
        <p>
          Le Client peut résilier son abonnement à tout moment :
        </p>
        <ul>
          <li>
            <strong>En fin de période en cours</strong> : En notifiant RelancePro Africa au moins 
            30 jours avant la date de renouvellement, sans frais ni pénalité.
          </li>
          <li>
            <strong>En cours de période</strong> : La résiliation prend effet immédiatement mais 
            aucun remboursement partiel n&apos;est dû pour la période restante.
          </li>
        </ul>

        <h3>5.3 Résiliation par RelancePro Africa</h3>
        <p>
          RelancePro Africa peut résilier le contrat avec effet immédiat en cas de :
        </p>
        <ul>
          <li>Non-respect des présentes CGV par le Client ;</li>
          <li>Utilisation frauduleuse ou illicite des services ;</li>
          <li>Non-paiement des factures après mise en demeure ;</li>
          <li>Fermeture définitive de l&apos;entreprise du Client.</li>
        </ul>

        <h3>5.4 Conséquences de la résiliation</h3>
        <p>
          En cas de résiliation, le Client dispose d&apos;un délai de 30 jours pour exporter ses données. 
          Passé ce délai, RelancePro Africa procède à la suppression définitive des données du Client, 
          sous réserve des obligations légales de conservation.
        </p>
      </section>

      <section id="responsabilite" className="mb-8">
        <h2>6. Limitation de responsabilité</h2>
        
        <h3>6.1 Limitation générale</h3>
        <p>
          La responsabilité de RelancePro Africa est limitée aux dommages directs et prévisibles. 
          En aucun cas RelancePro Africa ne saurait être tenue responsable des dommages indirects, 
          imprévisibles, ou de toute perte de données, de chiffre d&apos;affaires, de profit ou 
          d&apos;opportunité.
        </p>

        <h3>6.2 Plafond de responsabilité</h3>
        <p>
          La responsabilité totale de RelancePro Africa au titre de l&apos;exécution du contrat est 
          plafonnée au montant des sommes versées par le Client au cours des 12 derniers mois 
          précédant la survenance du fait générateur du préjudice.
        </p>

        <h3>6.3 Exclusions</h3>
        <p>
          RelancePro Africa ne saurait être tenue responsable des dommages résultant de :
        </p>
        <ul>
          <li>Utilisation non conforme des services ;</li>
          <li>Force majeure telle que définie par la jurisprudence ;</li>
          <li>Défaillance des réseaux de télécommunications ou des services tiers ;</li>
          <li>Données inexactes fournies par le Client ;</li>
          <li>Non-respect par le Client de ses obligations contractuelles.</li>
        </ul>

        <h3>6.4 Obligation de moyen</h3>
        <p>
          RelancePro Africa s&apos;engage à fournir ses services avec diligence et selon les règles 
          de l&apos;art, mais ne s&apos;engage que sur une obligation de moyen concernant les résultats 
          de recouvrement obtenus par le Client.
        </p>
      </section>

      <section id="propriete" className="mb-8">
        <h2>7. Propriété intellectuelle</h2>
        
        <h3>7.1 Droits de RelancePro Africa</h3>
        <p>
          RelancePro Africa demeure propriétaire exclusif de tous les droits de propriété intellectuelle 
          afférents à la plateforme, aux logiciels, aux bases de données, aux méthodes, et à toute 
          documentation associée.
        </p>

        <h3>7.2 Licence d&apos;utilisation</h3>
        <p>
          RelancePro Africa concède au Client une licence non exclusive, non transférable, 
          limitée à la durée du contrat, d&apos;utilisation de la plateforme conformément 
          à sa destination.
        </p>

        <h3>7.3 Droits du Client</h3>
        <p>
          Le Client conserve la propriété de ses données et des informations qu&apos;il importe 
          dans la plateforme. RelancePro Africa s&apos;engage à ne pas utiliser ces données 
          à d&apos;autres fins que l&apos;exécution du contrat.
        </p>

        <h3>7.4 Contrefaçon</h3>
        <p>
          Toute reproduction, représentation, modification ou adaptation, totale ou partielle, 
          des éléments de la plateforme est strictement interdite et constitutive de contrefaçon.
        </p>
      </section>

      <section id="donnees" className="mb-8">
        <h2>8. Données personnelles</h2>
        
        <h3>8.1 Responsabilité conjointe</h3>
        <p>
          Le traitement des données personnelles des débiteurs fait l&apos;objet d&apos;une 
          responsabilité conjointe entre RelancePro Africa (en qualité de sous-traitant) 
          et le Client (en qualité de responsable de traitement).
        </p>

        <h3>8.2 Conformité RGPD</h3>
        <p>
          RelancePro Africa s&apos;engage à traiter les données personnelles conformément 
          au Règlement (UE) 2016/679 (RGPD) et aux législations nationales applicables 
          des pays africains concernés.
        </p>

        <h3>8.3 Sécurité des données</h3>
        <p>
          RelancePro Africa met en œuvre des mesures techniques et organisationnelles 
          appropriées pour protéger les données contre la destruction accidentelle ou 
          illicite, la perte, l&apos;altération, la divulgation ou l&apos;accès non autorisé.
        </p>

        <h3>8.4 Politique de confidentialité</h3>
        <p>
          Pour plus d&apos;informations sur le traitement des données personnelles, 
          le Client est invité à consulter la 
          <a href="/confidentialite" className="text-primary hover:underline"> Politique de Confidentialité</a>.
        </p>
      </section>

      <section id="droit" className="mb-8">
        <h2>9. Droit applicable et juridiction</h2>
        
        <h3>9.1 Droit applicable</h3>
        <p>
          Les présentes CGV sont régies par le droit français. Pour les Clients établis 
          hors de France, les dispositions impératives du droit local peuvent s&apos;appliquer 
          conformément aux règles de conflit de lois.
        </p>

        <h3>9.2 Règlement des litiges</h3>
        <p>
          En cas de litige relatif à l&apos;interprétation ou l&apos;exécution des présentes CGV, 
          les parties s&apos;engagent à rechercher une solution amiable avant toute action judiciaire.
        </p>

        <h3>9.3 Juridiction compétente</h3>
        <p>
          À défaut d&apos;accord amiable dans un délai de 30 jours, les tribunaux de Paris 
          seront seuls compétents pour connaître des litiges, sous réserve des dispositions 
          d&apos;ordre public relatives à la protection du consommateur.
        </p>

        <h3>9.4 Clause de sauvegarde</h3>
        <p>
          Si l&apos;une quelconque des dispositions des présentes CGV était déclarée nulle, 
          les autres dispositions continueront à produire leurs effets.
        </p>
      </section>

      <section className="mt-12 p-6 bg-muted/50 rounded-lg not-prose">
        <h2 className="text-lg font-semibold mb-4">Contact</h2>
        <p className="text-muted-foreground mb-4">
          Pour toute question relative aux présentes Conditions Générales de Vente, 
          vous pouvez nous contacter :
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="font-medium">Email :</span>
            <a href="mailto:legal@relancepro.africa" className="text-primary hover:underline">
              legal@relancepro.africa
            </a>
          </li>
          <li className="flex items-center gap-2">
            <span className="font-medium">Adresse :</span>
            <span>RelancePro Africa SAS, 123 Avenue de l&apos;Innovation, 75001 Paris, France</span>
          </li>
        </ul>
      </section>
    </>
  );
}
