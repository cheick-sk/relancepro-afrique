import { Sidebar } from "@/components/layout/sidebar";
import { DemoBannerWrapper } from "@/components/demo/demo-banner-wrapper";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        {/* Demo banner - shows at top when in demo mode */}
        <DemoBannerWrapper />
        
        <div className="p-4 lg:p-6 pt-16 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
