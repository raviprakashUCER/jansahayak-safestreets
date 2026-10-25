"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, Plus, FileText, LayoutDashboard } from "lucide-react";

export function MobileBottomNav() {
  const pathname = usePathname();

  // On dedicated form filing screens, hide the generic dock so the form's sticky submit bar takes precedence
  if (pathname === "/reports/new") {
    return null;
  }

  return (
    <nav
      aria-label="Mobile Navigation Dock"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#faf9f5]/95 backdrop-blur-md border-t border-[#cbd5cb] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(14,43,36,0.06)]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors ${
            pathname === "/"
              ? "text-[#0e2b24] font-semibold"
              : "text-[#5c6f66] hover:text-[#0e2b24]"
          }`}
        >
          <Home className={`h-5 w-5 ${pathname === "/" ? "stroke-[2.5]" : "stroke-2"}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
        </Link>

        {/* 2. Public Live Map */}
        <Link
          href="/map"
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors ${
            pathname === "/map"
              ? "text-[#0e2b24] font-semibold"
              : "text-[#5c6f66] hover:text-[#0e2b24]"
          }`}
        >
          <MapPin className={`h-5 w-5 ${pathname === "/map" ? "stroke-[2.5]" : "stroke-2"}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Live Map</span>
        </Link>

        {/* 3. Primary Field Report Action (Thumb-Elevated Center Button) */}
        <Link
          href="/reports/new"
          aria-label="File a road hazard report"
          className="flex flex-col items-center justify-center -mt-3.5 group"
        >
          <div
            className={`flex items-center justify-center w-12 h-12 rounded-full shadow-md transition-transform active:scale-95 ${
              pathname === "/reports/new"
                ? "bg-[#bd7b3b] text-white ring-4 ring-[#faf9f5]"
                : "bg-[#0e2b24] text-[#faf9f5] hover:bg-[#1c4b3e] ring-4 ring-[#faf9f5]"
            }`}
          >
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </div>
          <span
            className={`text-[10px] font-semibold mt-0.5 ${
              pathname === "/reports/new" ? "text-[#bd7b3b]" : "text-[#0e2b24]"
            }`}
          >
            Report
          </span>
        </Link>

        {/* 4. Public Reports & Activity */}
        <Link
          href="/dashboard/reports"
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors ${
            pathname.startsWith("/dashboard/reports")
              ? "text-[#0e2b24] font-semibold"
              : "text-[#5c6f66] hover:text-[#0e2b24]"
          }`}
        >
          <FileText
            className={`h-5 w-5 ${pathname.startsWith("/dashboard/reports") ? "stroke-[2.5]" : "stroke-2"}`}
          />
          <span className="text-[10px] mt-0.5 tracking-tight">Incidents</span>
        </Link>

        {/* 5. Dashboard / Staff Overview */}
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors ${
            pathname === "/dashboard"
              ? "text-[#0e2b24] font-semibold"
              : "text-[#5c6f66] hover:text-[#0e2b24]"
          }`}
        >
          <LayoutDashboard
            className={`h-5 w-5 ${pathname === "/dashboard" ? "stroke-[2.5]" : "stroke-2"}`}
          />
          <span className="text-[10px] mt-0.5 tracking-tight">Ops Hub</span>
        </Link>
      </div>
    </nav>
  );
}
