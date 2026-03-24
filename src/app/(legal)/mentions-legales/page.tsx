import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions Légales | RelancePro Africa',
  description: 'Mentions légales de RelancePro Africa - Informations sur l\'éditeur, l\'hébergeur et les conditions d\'utilisation.',
};

export default function MentionsLegalesPage() {
  return (
    <>
      <header className="mb-8 not-prose">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Mentions Légales
        </h1>
        <p className="mt-2 text-muted-foreground">
          Informations légales relatives au site relancepro.africa
        </p>
      </header>

      <nav className="mb-8 p-4 bg-muted/50 rounded-lg not-prose">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
          Sommaire
        </h2>
        <ol className="space-y-1 text-sm">
          <li><a href="#editeur" className="text-primary hover:underline">1. Éditeur du site</a></li>
          <li><a href="#directeur" className="text-primary hover:underline">2. Directeur de la publication</a></li>
          <li><a href="#hebergeur" className="text-primary hover:underline">3. Hébergeur</a></li>
          <li><a href="#propriete" className="text-primary hover:underline">4. Propriété intellectuelle</a></li>
          <li><a href="#credits" className="text-primary hover:underline">5. Crédits</a></li>
          <li><a href="#juridiction" className="text-primary hover:underline">6. Juridiction et droit applicable</a></li>
        </ol>
      </nav>

      <section id="editeur" className="mb-8">
        <h2>1. Éditeur du site</h2>
        <p>
          Le site <strong>relancepro.africa</strong> est édité par :
        </p>
        
        <div className="mt-4 p-6 bg-muted/50 rounded-lg not-prose">
          <h3 className="font-semibold text-lg mb-4">RelancePro Africa SAS</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Dénomination sociale :</span>
              <span>RelancePro Africa SAS</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Forme juridique :</span>
              <span>Société par Actions Simplifiée (SAS)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Capital social :</span>
              <span>50 000 euros</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Siège social :</span>
              <span>123 Avenue de l&apos;Innovation<br />75001 Paris, France</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">SIRET :</span>
              <span>123 456 789 00012</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">SIREN :</span>
              <span>123 456 789</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Numéro TVA intracommunautaire :</span>
              <span>FR 12 345678901</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">RCS :</span>
              <span>Paris B 123 456 789</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Téléphone :</span>
              <span>+33 1 23 45 67 89</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Email :</span>
              <a href="mailto:contact@relancepro.africa" className="text-primary hover:underline">
                contact@relancepro.africa
              </a>
            </li>
          </ul>
        </div>
      </section>

      <section id="directeur" className="mb-8">
        <h2>2. Directeur de la publication</h2>
        <p>
          Le directeur de la publication du site <strong>relancepro.africa</strong> est :
        </p>
        
        <div className="mt-4 p-6 bg-muted/50 rounded-lg not-prose">
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Nom :</span>
              <span>[Nom du Directeur Général]</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Qualité :</span>
              <span>Président Directeur Général</span>
            </li>
          </ul>
        </div>
      </section>

      <section id="hebergeur" className="mb-8">
        <h2>3. Hébergeur du site</h2>
        <p>
          Le site <strong>relancepro.africa</strong> est hébergé par :
        </p>
        
        <div className="mt-4 p-6 bg-muted/50 rounded-lg not-prose">
          <h3 className="font-semibold text-lg mb-4">Vercel Inc.</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Dénomination :</span>
              <span>Vercel Inc.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Adresse :</span>
              <span>340 S Lemon Ave #4133<br />Walnut, CA 91789, États-Unis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Téléphone :</span>
              <span>+1 855 446 2242</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Site web :</span>
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                vercel.com
              </a>
            </li>
          </ul>
        </div>

        <h3>3.1 Données personnelles et hébergement</h3>
        <p>
          Les données personnelles collectées sur le site sont stockées sur des serveurs sécurisés 
          situés au sein de l&apos;Union européenne (Irlande et Allemagne), conformément aux exigences 
          du RGPD.
        </p>

        <h3>3.2 Hébergeur de données de santé</h3>
        <p>
          Le cas échéant, les données de santé sensibles sont hébergées par un hébergeur certifié 
          HDS (Hébergeur de Données de Santé) conformément aux dispositions de l&apos;article L.1111-8 
          du Code de la santé publique.
        </p>
      </section>

      <section id="propriete" className="mb-8">
        <h2>4. Propriété intellectuelle</h2>
        
        <h3>4.1 Droits d&apos;auteur</h3>
        <p>
          L&apos;ensemble du contenu du site <strong>relancepro.africa</strong> (textes, images, vidéos, 
          logos, icônes, sons, logiciels, etc.) est la propriété exclusive de RelancePro Africa SAS 
          ou de ses partenaires et est protégé par les lois françaises et internationales relatives 
          à la propriété intellectuelle.
        </p>

        <h3>4.2 Marques</h3>
        <p>
          La marque <strong>RelancePro Africa</strong> ainsi que le logo associé sont des marques 
          déposées. Toute reproduction, représentation ou utilisation non autorisée est strictement 
          interdite.
        </p>

        <h3>4.3 Utilisation autorisée</h3>
        <p>
          L&apos;utilisateur est autorisé à :
        </p>
        <ul>
          <li>Accéder au site pour un usage personnel et non commercial ;</li>
          <li>Imprimer des pages du site pour un usage strictement personnel ;</li>
          <li>Citer le site avec mention de la source.</li>
        </ul>

        <h3>4.4 Utilisations interdites</h3>
        <p>
          Toute reproduction, représentation, modification, publication, adaptation de tout ou partie 
          des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, 
          sauf autorisation écrite préalable de RelancePro Africa SAS.
        </p>

        <h3>4.5 Sanctions</h3>
        <p>
          Toute exploitation non autorisée du site ou de l&apos;un quelconque des éléments qu&apos;il 
          contient sera considérée comme constitutive d&apos;une contrefaçon et poursuivie conformément 
          aux dispositions des articles L.335-2 et suivants du Code de Propriété Intellectuelle.
        </p>
      </section>

      <section id="credits" className="mb-8">
        <h2>5. Crédits</h2>
        
        <h3>5.1 Conception et développement</h3>
        <p>
          Le site <strong>relancepro.africa</strong> a été conçu et développé par les équipes 
          internes de RelancePro Africa SAS.
        </p>

        <h3>5.2 Technologies utilisées</h3>
        <ul>
          <li>Framework : Next.js</li>
          <li>Design System : Tailwind CSS, shadcn/ui</li>
          <li>Base de données : PostgreSQL</li>
          <li>Hébergement : Vercel</li>
        </ul>

        <h3>5.3 Éléments graphiques</h3>
        <p>
          Les icônes utilisées sur le site proviennent de la bibliothèque Lucide Icons 
          (licence ISC). Certaines images proviennent de banques d&apos;images libres de droits.
        </p>

        <h3>5.4 Polices de caractères</h3>
        <p>
          Les polices de caractères utilisées sont fournies par Google Fonts 
          (licences Open Font License).
        </p>
      </section>

      <section id="juridiction" className="mb-8">
        <h2>6. Juridiction et droit applicable</h2>
        
        <h3>6.1 Droit applicable</h3>
        <p>
          Les présentes mentions légales sont régies par le droit français. 
          En cas de litige et à défaut d&apos;accord amiable, le litige sera porté devant 
          les tribunaux français conformément aux règles de compétence en vigueur.
        </p>

        <h3>6.2 Médiation</h3>
        <p>
          Conformément à l&apos;article L.612-1 du Code de la consommation, nous informons les 
          consommateurs qu&apos;ils ont la possibilité de recourir gratuitement au service de 
          médiation suivant :
        </p>
        <div className="mt-4 p-6 bg-muted/50 rounded-lg not-prose">
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Médiateur :</span>
              <span>Centre de Médiation et d&apos;Arbitrage de Paris (CMAP)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Adresse :</span>
              <span>39 avenue Hoche, 75008 Paris</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">Site web :</span>
              <a href="https://www.cmap.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                www.cmap.fr
              </a>
            </li>
          </ul>
        </div>

        <h3>6.3 CNIL</h3>
        <p>
          Pour toute question relative au traitement de vos données personnelles, vous pouvez 
          contacter la CNIL (Commission Nationale de l&apos;Informatique et des Libertés) :
        </p>
        <ul>
          <li>Site web : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cnil.fr</a></li>
          <li>Téléphone : 01 53 73 22 22</li>
        </ul>
      </section>

      <section className="mt-12 p-6 bg-muted/50 rounded-lg not-prose">
        <h2 className="text-lg font-semibold mb-4">Accessibilité</h2>
        <p className="text-muted-foreground mb-4">
          Le site relancepro.africa s&apos;efforce de respecter les normes d&apos;accessibilité 
          numérique (RGAA - Référentiel Général d&apos;Amélioration de l&apos;Accessibilité) 
          pour permettre l&apos;accès à tous les utilisateurs, y compris les personnes en situation de handicap.
        </p>
        <p className="text-muted-foreground">
          Pour signaler un problème d&apos;accessibilité ou nous faire part de vos suggestions 
          d&apos;amélioration, vous pouvez nous contacter à l&apos;adresse : 
          <a href="mailto:accessibilite@relancepro.africa" className="text-primary hover:underline ml-1">
            accessibilite@relancepro.africa
          </a>
        </p>
      </section>

      <section className="mt-8 p-6 bg-muted/50 rounded-lg not-prose">
        <h2 className="text-lg font-semibold mb-4">Contact</h2>
        <p className="text-muted-foreground mb-4">
          Pour toute question concernant les présentes mentions légales, vous pouvez nous contacter :
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="font-medium">Email :</span>
            <a href="mailto:legal@relancepro.africa" className="text-primary hover:underline">
              legal@relancepro.africa
            </a>
          </li>
          <li className="flex items-center gap-2">
            <span className="font-medium">Courrier :</span>
            <span>RelancePro Africa SAS - Service Juridique, 123 Avenue de l&apos;Innovation, 75001 Paris, France</span>
          </li>
        </ul>
      </section>
    </>
  );
}
