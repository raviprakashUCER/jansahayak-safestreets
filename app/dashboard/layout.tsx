"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  MapPin,
  ShieldCheck,
  BarChart3,
  AlertTriangle,
  Plus,
  ExternalLink,
  Menu,
  Workflow,
} from "lucide-react";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    icon: FileText,
  },
  {
    href: "/dashboard/map",
    label: "Live Map",
    icon: MapPin,
  },
  {
    href: "/dashboard/moderation",
    label: "Moderation",
    icon: ShieldCheck,
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    href: "/dashboard/escalations",
    label: "Escalations",
    icon: AlertTriangle,
  },
  {
    href: "/dashboard/pipeline",
    label: "PRD Pipeline",
    icon: Workflow,
    badge: "8-Stage",
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navContent = (
    <div className="flex h-full flex-col justify-between py-5">
      <div className="space-y-6">
        <div className="px-4">
          <Link
            href="/"
            className="flex items-center gap-3 text-inherit no-underline transition-opacity hover:opacity-80"
            aria-label="JanSahayak SafeStreets Home"
          >
            <Brand />
          </Link>
        </div>

        <div className="px-2">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Platform
          </div>
          <nav className="flex flex-col gap-0.5" aria-label="Dashboard navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  size="default"
                  className={`w-full justify-start gap-3 rounded-lg px-3 h-9 text-sm transition-all ${
                    isActive
                      ? "bg-secondary/80 font-medium text-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                  render={<Link href={item.href} />}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className="ml-auto text-[10px] font-medium h-5"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="space-y-3 px-2">
        <Separator className="mx-2" />
        <div className="flex flex-col gap-1 px-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 text-xs text-muted-foreground hover:text-foreground h-8"
            render={<Link href="/" />}
          >
            <ExternalLink className="size-3.5" />
            <span>Public Civic Portal</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            className="w-full justify-start gap-2 rounded-lg text-xs font-medium h-8 shadow-sm"
            render={<Link href="/reports/new" />}
          >
            <Plus className="size-3.5" />
            <span>Report a Hazard</span>
          </Button>
        </div>

        <div className="px-3 pt-1">
          <p className="text-[11px] text-muted-foreground/80">Greater Noida Pilot · v0.9</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border bg-card">
        <div className="sticky top-0 h-screen w-full">{navContent}</div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header with shadcn Sheet */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/95 px-3 backdrop-blur supports-backdrop-filter:bg-card/80 md:hidden">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={<Button variant="ghost" size="icon-sm" aria-label="Open Navigation Menu" />}
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation Menu</SheetTitle>
                </SheetHeader>
                {navContent}
              </SheetContent>
            </Sheet>

            <Link href="/dashboard" className="flex items-center gap-2 text-inherit no-underline">
              <span className="font-heading text-sm font-semibold">JanSahayak</span>
              <Badge variant="outline" className="text-[10px] hidden xs:inline-flex">
                Dashboard
              </Badge>
            </Link>
          </div>

          <Button size="sm" className="gap-1.5 h-8 px-2.5" render={<Link href="/reports/new" />}>
            <Plus className="size-3.5" />
            <span className="text-xs">Report</span>
          </Button>
        </header>

        {/* Main Routed Content */}
        <main
          className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto pb-24 md:pb-8"
          id="main-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
