"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

import {
  FileText,
  BarChart3,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Building2,
  Activity,
  Info
} from "lucide-react";

import { HowItWorksModal } from "@/components/ui/how-it-works-modal";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Benchmarks", href: "/benchmarks", icon: BarChart3 },
  { label: "Tests", href: "/tests", icon: FlaskConical },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [isHowItWorksOpen, setIsHowItWorksOpen] = React.useState(false);

  return (
    <>
      <HowItWorksModal isOpen={isHowItWorksOpen} onClose={() => setIsHowItWorksOpen(false)} />
      <aside
      className={`
        flex flex-col border-r border-border-default bg-surface-secondary
        transition-all duration-200 ease-out shrink-0
        ${collapsed ? "w-[52px]" : "w-[220px]"}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 h-12 border-b border-border-default">
        <div className="flex items-center justify-center h-6 w-6 rounded-sm bg-accent-secondary text-white shrink-0">
          <Activity className="h-4 w-4" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <span className={`text-sm font-bold text-text-primary truncate tracking-tight ${spaceGrotesk.className}`}>
            Signal Intelligence
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-2.5 rounded-sm px-2.5 py-1.5
                text-[13px] font-medium transition-colors
                ${
                  isActive
                    ? "bg-surface-hover text-stone-900"
                    : "text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
                }
              `}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Info / How it Works Button */}
      <div className="px-2 py-2">
        <button
          onClick={() => setIsHowItWorksOpen(true)}
          className={`
            flex w-full items-center gap-2.5 rounded-sm px-2.5 py-1.5
            text-[13px] font-medium transition-colors text-text-secondary 
            hover:bg-surface-tertiary hover:text-text-primary
            ${collapsed ? "justify-center" : ""}
          `}
          title={collapsed ? "How it Works" : undefined}
        >
          <Info className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">How it Works</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <div className="border-t border-border-default p-2">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full h-7 rounded-sm
            text-text-secondary hover:text-text-primary hover:bg-surface-tertiary
            transition-colors cursor-pointer"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
    </>
  );
}
