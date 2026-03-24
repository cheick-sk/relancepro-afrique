'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, FileText, Shield, Building2, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

const legalPages = [
  {
    href: '/cgv',
    label: 'Conditions Générales de Vente',
    icon: FileText,
  },
  {
    href: '/confidentialite',
    label: 'Politique de Confidentialité',
    icon: Shield,
  },
  {
    href: '/mentions-legales',
    label: 'Mentions Légales',
    icon: Building2,
  },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold text-primary hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">RP</span>
              </div>
              <span className="hidden sm:inline">RelancePro Africa</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Back to main site - Desktop */}
          <Link
            href="/"
            className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour au site principal
          </Link>
        </div>
      </header>

      <div className="container px-4 md:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside
            className={`
              fixed inset-x-0 top-16 z-40 lg:relative lg:top-0 lg:z-0
              bg-background lg:bg-transparent
              border-b lg:border-0
              ${mobileMenuOpen ? 'block' : 'hidden lg:block'}
            `}
          >
            <nav className="p-4 lg:p-0 lg:w-64 lg:shrink-0">
              <div className="lg:sticky lg:top-24">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4 hidden lg:block">
                  Documents Légaux
                </h2>
                <ScrollArea className="lg:h-auto">
                  <ul className="space-y-1">
                    {legalPages.map((page) => {
                      const isActive = pathname === page.href;
                      const Icon = page.icon;
                      return (
                        <li key={page.href}>
                          <Link
                            href={page.href}
                            onClick={handleNavClick}
                            className={`
                              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                              ${isActive
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              }
                            `}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="line-clamp-2">{page.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>

                {/* Back link - Mobile only */}
                <div className="lg:hidden mt-4 pt-4 border-t">
                  <Link
                    href="/"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Retour au site principal
                  </Link>
                </div>
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <article className="prose prose-slate dark:prose-invert max-w-4xl mx-auto">
              {children}
            </article>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} RelancePro Africa. Tous droits réservés.</p>
            <p>
              Dernière mise à jour :{' '}
              <time dateTime="2025-01-15">15 janvier 2025</time>
            </p>
          </div>
        </div>
      </footer>

      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          header, footer, aside {
            display: none !important;
          }
          main {
            width: 100% !important;
            max-width: none !important;
          }
          .prose {
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
}
