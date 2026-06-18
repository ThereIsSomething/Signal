"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Upload, 
  FileText, 
  Cpu, 
  BarChart3, 
  ArrowRight,
  Database,
  Building2,
  Workflow
} from "lucide-react";
import { Button } from "./button";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  const [activeStep, setActiveStep] = useState(0);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const steps = [
    {
      id: "upload",
      title: "1. Document Ingestion",
      icon: Upload,
      description: "Users start by uploading financial documents like 10-K filings or quarterly reports. Support is optimized for PDF and HTML formats.",
      details: "The file is processed and stored securely in the Supabase storage bucket."
    },
    {
      id: "parse",
      title: "2. LlamaParse Extraction",
      icon: FileText,
      description: "The uploaded file is sent to LlamaParse, an advanced document parser that reliably extracts text, tables, and structures from complex financial filings.",
      details: "Raw document structure is chunked intelligently by the Section Splitter."
    },
    {
      id: "ai",
      title: "3. NVIDIA NIM Processing",
      icon: Cpu,
      description: "Extracted text is processed by a suite of AI extraction pipelines using NVIDIA NIM APIs. Specialized prompts are used to analyze different aspects of the filing.",
      details: "Extracts financial metrics, risk factors, and performs tone analysis."
    },
    {
      id: "insights",
      title: "4. Storage & Insights",
      icon: Database,
      description: "The structured AI outputs are saved to the Supabase Postgres database, establishing relationships between companies, documents, and derived metrics.",
      details: "Data becomes instantly available for benchmarking and comparison."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-surface-primary border border-border-default shadow-xl rounded-lg w-full max-w-4xl mx-4 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-surface-secondary">
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-accent-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">How Signal Intelligence Works</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row flex-1 overflow-auto">
          {/* Visual Flow diagram */}
          <div className="md:w-1/2 p-6 md:p-8 bg-surface-secondary border-b md:border-b-0 md:border-r border-border-default flex flex-col justify-center">
            <h3 className="text-sm font-medium text-text-secondary mb-6 uppercase tracking-wider">Architecture Flow</h3>
            
            <div className="space-y-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === index;
                
                return (
                  <div key={step.id} className="relative group cursor-pointer" onClick={() => setActiveStep(index)}>
                    {/* Connection Line */}
                    {index !== steps.length - 1 && (
                      <div className="absolute left-6 top-10 bottom-[-16px] w-[2px] bg-border-default group-hover:bg-accent-secondary/50 transition-colors z-0" />
                    )}
                    
                    <div className={`relative z-10 flex border ${isActive ? 'border-accent-secondary bg-surface-primary shadow-sm' : 'border-border-default bg-surface-tertiary hover:border-text-secondary'} rounded-md p-3 transition-all duration-200 items-center gap-4`}>
                      <div className={`p-2 rounded-md ${isActive ? 'bg-accent-secondary/10 text-accent-secondary' : 'bg-surface-primary text-text-secondary'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>{step.title}</h4>
                      </div>
                      {isActive && <ArrowRight className="h-4 w-4 text-accent-secondary animate-pulse" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details Panel */}
          <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center bg-surface-primary">
            <div className={`transition-opacity duration-300 ${activeStep !== null ? 'opacity-100' : 'opacity-0'}`}>
              <div className="inline-flex items-center justify-center p-3 bg-surface-secondary border border-border-default rounded-lg mb-6">
                {React.createElement(steps[activeStep].icon, { className: "h-8 w-8 text-accent-secondary" })}
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3">
                {steps[activeStep].title}
              </h3>
              <p className="text-stone-600 mb-6 text-sm leading-relaxed">
                {steps[activeStep].description}
              </p>
              
              <div className="bg-surface-tertiary p-4 rounded-md border border-border-default border-dashed">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">Technical Detail</h4>
                <p className="text-sm text-text-primary">
                  {steps[activeStep].details}
                </p>
              </div>
              
              {/* Navigation dots */}
              <div className="flex gap-2 mt-8">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveStep(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${idx === activeStep ? 'w-8 bg-accent-secondary' : 'w-2 bg-border-strong hover:bg-text-secondary'}`}
                    aria-label={`Go to step ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-default bg-surface-secondary flex justify-end">
          <Button onClick={onClose} variant="secondary" className="text-sm">
            Close Guide
          </Button>
        </div>
      </div>
    </div>
  );
}
