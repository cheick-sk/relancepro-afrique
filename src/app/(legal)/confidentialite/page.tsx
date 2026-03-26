import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité | RelancePro Africa',
  description: 'Politique de Confidentialité de RelancePro Africa - Comment nous collectons, utilisons et protégeons vos données personnelles.',
};

export default function ConfidentialitePage() {
  return (
    <>
      <header className="mb-8 not-prose">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Politique de Confidentialité
        </h1>
        <p className="mt-2 text-muted-foreground">
          Dernière mise à jour : 15 janvier 2025
        </p>
      </header>

      <nav className="mb-8 p-4 bg-muted/50 rounded-lg not-prose">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
          Sommaire
        </h2>
        <ol className="space-y-1 text-sm">
          <li><a href="#introduction" className="text-primary hover:underline">1. Introduction</a></li>
          <li><a href="#collecte" className="text-primary hover:underline">2. Collecte des données</a></li>
          <li><a href="#utilisation" className="text-primary hover:underline">3. Utilisation des données</a></li>
          <li><a href="#conservation" className="text-primary hover:underline">4. Conservation des données</a></li>
          <li><a href="#droits" className="text-primary hover:underline">5. Droits des utilisateurs</a></li>
          <li><a href="#securite" className="text-primary hover:underline">6. Sécurité</a></li>
          <li><a href="#cookies" className="text-primary hover:underline">7. Cookies</a></li>
          <li><a href="#transfert" className="text-primary hover:underline">8. Transferts de données</a></li>
          <li><a href="#contact" className="text-primary hover:underline">9. Contact DPO</a></li>
        </ol>
      </nav>

      <section id="introduction" className="mb-8">
        <h2>1. Introduction</h2>
        <p>
          <strong>RelancePro Africa SAS</strong> (ci-après &quot;RelancePro Africa&quot;, &quot;nous&quot; ou &quot;notre&quot;) 
          s&apos;engage à protéger la vie privée des utilisateurs de sa plateforme de recouvrement de créances.
        </p>
        <p>
          La présente Politique de Confidentialité explique comment nous collectons, utilisons, stockons 
          et protégeons les données personnelles dans le cadre de nos services, conformément au Règlement 
          (UE) 2016/679 (RGPD) et aux législations nationales applicables dans les pays africains où 
          nous opérons.
        </p>
        <p>
          Cette politique s&apos;applique à :
        </p>
        <ul>
          <li>Les entreprises clientes utilisant notre plateforme (Utilisateurs Clients) ;</li>
          <li>Les personnes dont les données sont traitées dans le cadre des procédures de recouvrement (Débiteurs) ;</li>
          <li>Les visiteurs de notre site internet.</li>
        </ul>
      </section>

      <section id="collecte" className="mb-8">
        <h2>2. Collecte des données</h2>
        
        <h3>2.1 Données collectées auprès des Clients</h3>
        <p>Nous collectons les données suivantes lors de l&apos;inscription et de l&apos;utilisation de nos services :</p>
        <ul>
          <li>
            <strong>Données d&apos;identification</strong> : Nom, prénom, adresse email, numéro de téléphone, 
            fonction dans l&apos;entreprise.
          </li>
          <li>
            <strong>Données d&apos;entreprise</strong> : Raison sociale, SIRET/identifiant fiscal, 
            adresse du siège social, secteur d&apos;activité, taille de l&apos;entreprise.
          </li>
          <li>
            <strong>Données de connexion</strong> : Adresse IP, identifiants de connexion, 
            historique des connexions, préférences de langue.
          </li>
          <li>
            <strong>Données de paiement</strong> : Informations bancaires (cryptées), 
            historique des transactions, factures.
          </li>
        </ul>

        <h3>2.2 Données des débiteurs traitées par les Clients</h3>
        <p>
          Dans le cadre de leurs activités de recouvrement, nos Clients peuvent importer dans notre 
          plateforme des données concernant leurs débiteurs :
        </p>
        <ul>
          <li>
            <strong>Données d&apos;identification</strong> : Nom, prénom, adresse postale, 
            adresse email, numéro de téléphone.
          </li>
          <li>
            <strong>Données financières</strong> : Montant de la créance, date d&apos;échéance, 
            historique des paiements, références de factures.
          </li>
          <li>
            <strong>Données de communication</strong> : Historique des échanges, 
            préférences de contact.
          </li>
        </ul>
        <p>
          <em>
            Note importante : Le Client reste responsable de la licéité de la collecte et du traitement 
            de ces données. Il s&apos;engage à informer ses débiteurs de leurs droits conformément 
            à la réglementation applicable.
          </em>
        </p>

        <h3>2.3 Modes de collecte</h3>
        <p>Les données sont collectées :</p>
        <ul>
          <li>Directement par le biais de nos formulaires d&apos;inscription et de paramétrage ;</li>
          <li>Via les interactions avec notre service client ;</li>
          <li>Automatiquement par le biais de cookies et technologies similaires ;</li>
          <li>Par l&apos;importation de fichiers par les Clients.</li>
        </ul>
      </section>

      <section id="utilisation" className="mb-8">
        <h2>3. Utilisation des données</h2>
        
        <h3>3.1 Finalités du traitement</h3>
        <p>Nous utilisons les données collectées pour les finalités suivantes :</p>
        
        <h4>Pour les Clients :</h4>
        <ul>
          <li>Gestion du compte utilisateur et de l&apos;abonnement ;</li>
          <li>Fourniture des services souscrits (gestion des créances, automatisation des relances) ;</li>
          <li>Facturation et encaissement des paiements ;</li>
          <li>Communication relative aux services (notifications, mises à jour) ;</li>
          <li>Amélioration de nos services et développement de nouvelles fonctionnalités ;</li>
          <li>Support technique et assistance client ;</li>
          <li>Respect de nos obligations légales et réglementaires.</li>
        </ul>

        <h4>Pour les Débiteurs :</h4>
        <ul>
          <li>Exécution des procédures de recouvrement pour le compte de nos Clients ;</li>
          <li>Envoi de rappels et de communications relatives aux créances ;</li>
          <li>Gestion des paiements et des échéances ;</li>
          <li>Analyse des comportements de paiement via notre système IA.</li>
        </ul>

        <h3>3.2 Base légale du traitement</h3>
        <p>Le traitement des données personnelles repose sur les bases légales suivantes :</p>
        <ul>
          <li>
            <strong>L&apos;exécution du contrat</strong> (Art. 6.1.b RGPD) : pour la fourniture des services ;
          </li>
          <li>
            <strong>L&apos;obligation légale</strong> (Art. 6.1.c RGPD) : pour le respect des obligations 
            comptables et fiscales ;
          </li>
          <li>
            <strong>L&apos;intérêt légitime</strong> (Art. 6.1.f RGPD) : pour l&apos;amélioration des services, 
            la sécurité et la prévention de la fraude ;
          </li>
          <li>
            <strong>Le consentement</strong> (Art. 6.1.a RGPD) : pour certains usages spécifiques comme 
            les communications marketing.
          </li>
        </ul>

        <h3>3.3 Profilage et prise de décision automatisée</h3>
        <p>
          Notre système d&apos;intelligence artificielle peut être utilisé pour analyser les comportements 
          de paiement et suggérer des stratégies de recouvrement optimisées. Ces analyses ne donnent 
          pas lieu à des décisions juridiques ou significatives prises uniquement sur cette base, 
          sans intervention humaine.
        </p>
      </section>

      <section id="conservation" className="mb-8">
        <h2>4. Conservation des données</h2>
        
        <h3>4.1 Durées de conservation</h3>
        <p>Les données personnelles sont conservées pour les durées suivantes :</p>
        
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border-collapse border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border px-4 py-2 text-left">Type de données</th>
                <th className="border border-border px-4 py-2 text-left">Durée de conservation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border px-4 py-2">Données de compte Client</td>
                <td className="border border-border px-4 py-2">Durée de la relation contractuelle + 3 ans</td>
              </tr>
              <tr>
                <td className="border border-border px-4 py-2">Données de facturation</td>
                <td className="border border-border px-4 py-2">10 ans (obligation légale)</td>
              </tr>
              <tr>
                <td className="border border-border px-4 py-2">Données des débiteurs</td>
                <td className="border border-border px-4 py-2">Durée du dossier de recouvrement + 5 ans</td>
              </tr>
              <tr>
                <td className="border border-border px-4 py-2">Logs de connexion</td>
                <td className="border border-border px-4 py-2">12 mois</td>
              </tr>
              <tr>
                <td className="border border-border px-4 py-2">Cookies analytiques</td>
                <td className="border border-border px-4 py-2">13 mois maximum</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>4.2 Anonymisation</h3>
        <p>
          À l&apos;issue des durées de conservation, les données sont soit supprimées définitivement, 
          soit anonymisées pour des finalités statistiques.
        </p>

        <h3>4.3 Archivage</h3>
        <p>
          Certaines données peuvent être archivées pour répondre aux obligations légales ou à des 
          fins de preuve, avec un accès restreint et sécurisé.
        </p>
      </section>

      <section id="droits" className="mb-8">
        <h2>5. Droits des utilisateurs</h2>
        
        <h3>5.1 Droits des personnes concernées</h3>
        <p>
          Conformément au RGPD, les personnes concernées disposent des droits suivants :
        </p>
        <ul>
          <li>
            <strong>Droit d&apos;accès</strong> : Obtenir la confirmation que des données sont traitées 
            et en recevoir une copie.
          </li>
          <li>
            <strong>Droit de rectification</strong> : Faire corriger des données inexactes ou incomplètes.
          </li>
          <li>
            <strong>Droit à l&apos;effacement</strong> : Demander la suppression de ses données 
            (sous réserve des obligations légales).
          </li>
          <li>
            <strong>Droit à la limitation</strong> : Demander la suspension temporaire du traitement.
          </li>
          <li>
            <strong>Droit à la portabilité</strong> : Recevoir ses données dans un format structuré 
            et lisible par machine.
          </li>
          <li>
            <strong>Droit d&apos;opposition</strong> : S&apos;opposer au traitement pour des motifs légitimes.
          </li>
          <li>
            <strong>Droit de retirer son consentement</strong> : Pour les traitements basés sur le consentement.
          </li>
        </ul>

        <h3>5.2 Exercice des droits</h3>
        <p>
          Pour exercer vos droits, vous pouvez nous contacter :
        </p>
        <ul>
          <li>Par email : <a href="mailto:privacy@relancepro.africa" className="text-primary hover:underline">privacy@relancepro.africa</a></li>
          <li>Par courrier : RelancePro Africa - DPO, 123 Avenue de l&apos;Innovation, 75001 Paris, France</li>
        </ul>
        <p>
          Nous nous engageons à répondre à votre demande dans un délai d&apos;un mois, prolongeable 
          de deux mois en cas de complexité.
        </p>

        <h3>5.3 Réclamation</h3>
        <p>
          Si vous estimez que le traitement de vos données constitue une violation de la réglementation, 
          vous avez le droit d&apos;introduire une réclamation auprès de la CNIL (Commission Nationale 
          de l&apos;Informatique et des Libertés) ou de l&apos;autorité de protection des données 
          de votre pays de résidence.
        </p>
      </section>

      <section id="securite" className="mb-8">
        <h2>6. Sécurité</h2>
        
        <h3>6.1 Mesures techniques</h3>
        <p>
          RelancePro Africa met en œuvre les mesures de sécurité suivantes pour protéger vos données :
        </p>
        <ul>
          <li>
            <strong>Chiffrement</strong> : Toutes les communications sont chiffrées en TLS 1.3. 
            Les données sensibles sont chiffrées au repos (AES-256).
          </li>
          <li>
            <strong>Contrôle d&apos;accès</strong> : Accès aux données restreint aux personnes 
            habilitées, avec authentification forte.
          </li>
          <li>
            <strong>Surveillance</strong> : Monitoring continu des systèmes et détection des anomalies.
          </li>
          <li>
            <strong>Sauvegardes</strong> : Sauvegardes régulières et chiffrées avec tests de restauration.
          </li>
          <li>
            <strong>Audits</strong> : Audits de sécurité réguliers et tests de pénétration annuels.
          </li>
        </ul>

        <h3>6.2 Mesures organisationnelles</h3>
        <ul>
          <li>Formation régulière du personnel à la protection des données ;</li>
          <li>Politique de confidentialité interne et clauses de confidentialité dans les contrats ;</li>
          <li>Procédure de gestion des incidents de sécurité ;</li>
          <li>Documentation des traitements et tenue d&apos;un registre des activités de traitement.</li>
        </ul>

        <h3>6.3 Notification des violations</h3>
        <p>
          En cas de violation de données personnelles susceptible d&apos;engendrer un risque élevé 
          pour vos droits et libertés, nous nous engageons à vous en informer dans les meilleurs délais, 
          conformément à l&apos;article 34 du RGPD.
        </p>
      </section>

      <section id="cookies" className="mb-8">
        <h2>7. Cookies</h2>
        
        <h3>7.1 Qu&apos;est-ce qu&apos;un cookie ?</h3>
        <p>
          Un cookie est un petit fichier texte stocké sur votre terminal (ordinateur, smartphone, tablette) 
          lors de votre visite sur notre site. Il permet de vous reconnaître et d&apos;améliorer 
          votre expérience de navigation.
        </p>

        <h3>7.2 Types de cookies utilisés</h3>
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border-collapse border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border px-4 py-2 text-left">Type</th>
                <th className="border border-border px-4 py-2 text-left">Finalité</th>
                <th className="border border-border px-4 py-2 text-left">Durée</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border px-4 py-2">Essentiels</td>
                <td className="border border-border px-4 py-2">Authentification, sécurité, préférences de session</td>
                <td className="border border-border px-4 py-2">Session</td>
              </tr>
              <tr>
                <td className="border border-border px-4 py-2">Fonctionnels</td>
                <td className="border border-border px-4 py-2">Mémorisation des préférences (langue, thème)</td>
                <td className="border border-border px-4 py-2">1 an</td>
              </tr>
              <tr>
                <td className="border border-border px-4 py-2">Analytiques</td>
                <td className="border border-border px-4 py-2">Mesure d&apos;audience et d&apos;utilisation</td>
                <td className="border border-border px-4 py-2">13 mois</td>
              </tr>
              <tr>
                <td className="border border-border px-4 py-2">Marketing</td>
                <td className="border border-border px-4 py-2">Publicités ciblées (avec consentement)</td>
                <td className="border border-border px-4 py-2">6 mois</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>7.3 Gestion des cookies</h3>
        <p>
          Lors de votre première visite, une bannière vous permet d&apos;accepter ou de refuser 
          les cookies non essentiels. Vous pouvez également modifier vos préférences à tout moment 
          via les paramètres de votre navigateur.
        </p>
      </section>

      <section id="transfert" className="mb-8">
        <h2>8. Transferts de données hors UE</h2>
        
        <h3>8.1 Contexte des transferts</h3>
        <p>
          Dans le cadre de nos services, certaines données peuvent être transférées vers des pays 
          africains où nos Clients sont établis ou vers nos sous-traitants techniques.
        </p>

        <h3>8.2 Garanties</h3>
        <p>
          Lorsque le pays de destination n&apos;offre pas un niveau de protection adéquat, 
          nous mettons en place les garanties appropriées :
        </p>
        <ul>
          <li>Clauses contractuelles types de la Commission européenne ;</li>
          <li>Certifications appropriées (EU-US Data Privacy Framework, etc.) ;</li>
          <li>Règles d&apos;entreprise contraignantes (Binding Corporate Rules) ;</li>
          <li>Décisions d&apos;adéquation de la Commission européenne.</li>
        </ul>

        <h3>8.3 Localisation des données</h3>
        <p>
          Par défaut, les données de nos Clients sont hébergées au sein de l&apos;Union européenne. 
          Des options de localisation spécifiques peuvent être proposées pour répondre aux exigences 
          réglementaires locales.
        </p>
      </section>

      <section id="contact" className="mb-8">
        <h2>9. Contact du Délégué à la Protection des Données (DPO)</h2>
        
        <p>
          Notre Délégué à la Protection des Données est votre point de contact pour toute question 
          relative au traitement de vos données personnelles.
        </p>

        <div className="mt-4 p-6 bg-muted/50 rounded-lg not-prose">
          <h3 className="font-semibold text-lg mb-4">Délégué à la Protection des Données</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[100px]">Nom :</span>
              <span>Service Protection des Données</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[100px]">Email :</span>
              <a href="mailto:dpo@relancepro.africa" className="text-primary hover:underline">
                dpo@relancepro.africa
              </a>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[100px]">Téléphone :</span>
              <span>+33 1 23 45 67 89</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[100px]">Adresse :</span>
              <span>RelancePro Africa SAS - DPO<br />123 Avenue de l&apos;Innovation<br />75001 Paris, France</span>
            </li>
          </ul>
        </div>

        <p className="mt-6">
          Pour toute question concernant cette politique ou pour exercer vos droits, n&apos;hésitez pas 
          à contacter notre DPO.
        </p>
      </section>

      <section className="mt-12 p-6 bg-muted/50 rounded-lg not-prose">
        <h2 className="text-lg font-semibold mb-4">Modifications de la politique</h2>
        <p className="text-muted-foreground">
          Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. 
          Les modifications seront publiées sur cette page avec une date de mise à jour. 
          En continuant à utiliser nos services après la publication des modifications, 
          vous acceptez la politique révisée.
        </p>
      </section>
    </>
  );
}
