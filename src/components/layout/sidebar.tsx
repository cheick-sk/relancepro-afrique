"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Settings,
  CreditCard,
  Bell,
  LogOut,
  Menu,
  X,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector } from "@/components/shared/language-selector";
import { useLanguage } from "@/lib/i18n/context";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = [
    {
      name: t("nav.dashboard"),
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: t("nav.clients"),
      href: "/clients",
      icon: Users,
    },
    {
      name: t("nav.debts"),
      href: "/debts",
      icon: Receipt,
    },
    {
      name: t("nav.reminders"),
      href: "/reminders",
      icon: Bell,
    },
    {
      name: t("nav.reports"),
      href: "/reports",
      icon: BarChart3,
    },
    {
      name: t("nav.subscription"),
      href: "/subscription",
      icon: CreditCard,
    },
    {
      name: t("nav.settings"),
      href: "/settings",
      icon: Settings,
    },
  ];

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 z-50 p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="bg-white dark:bg-gray-900 shadow-md"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200 dark:border-gray-800">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900 dark:text-white">
                RelancePro
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Africa</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Language selector */}
          <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800">
            <LanguageSelector />
          </div>

          {/* Quick actions */}
          <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-800">
            <div className="flex gap-2 mb-3">
              <Button variant="outline" size="sm" className="flex-1 gap-1">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z" />
                </svg>
                Email
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-1">
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>
          </div>

          {/* User profile */}
          <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src={session?.user?.image || ""} />
                <AvatarFallback className="bg-orange-100 text-orange-700">
                  {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {session?.user?.name || "Utilisateur"}
                </p>
                <div className="flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      session?.user?.subscriptionStatus === "active"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-600 border-gray-200"
                    )}
                  >
                    {session?.user?.subscriptionStatus === "active" ? "Premium" : "Gratuit"}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="text-gray-500 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
