"use client";

import React, { useState } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className = "" }: TabsProps) {
  return (
    <div
      className={`flex items-center gap-0 border-b border-border-default ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium
            transition-colors cursor-pointer select-none whitespace-nowrap
            ${
              activeTab === tab.id
                ? "text-text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            }
          `}
        >
          {tab.icon && (
            <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{tab.icon}</span>
          )}
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-accent-primary" />
          )}
        </button>
      ))}
    </div>
  );
}

interface TabPanelProps {
  children: React.ReactNode;
  active: boolean;
  className?: string;
}

export function TabPanel({ children, active, className = "" }: TabPanelProps) {
  if (!active) return null;
  return (
    <div role="tabpanel" className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
}

export function useTabState(defaultTab: string) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return { activeTab, setActiveTab };
}
