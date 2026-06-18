"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Space_Grotesk } from "next/font/google";
import {
  Activity,
  Terminal,
  Cpu,
  Layers,
  Database,
  BrainCircuit,
  Sparkles,
  ArrowUpRight,
  Lock,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Building2,
  FileText,
  ShieldCheck,
  Zap
} from "lucide-react";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

// Types for Ingestion Logs
interface LogEntry {
  text: string;
  type: "system" | "success" | "process" | "warning";
  timestamp: string;
}

const RAW_LOGS = [
  { text: "ESTABLISHING UPLINK SEC-EDGAR DATABASE PROTOCOLS...", type: "system" },
  { text: "CONNECTION SUCCESSFUL // HOST ADDR: 104.18.29.117:443", type: "success" },
  { text: "INITIALIZING DEEP-EXTRACTION PARSING ENGINE...", type: "system" },
  { text: "DOWNLOADING COMPILATION FOR ACME CORP [CIK: 0001065280]...", type: "process" },
  { text: "INGESTING 10-K FILING // SIZE: 18.42 MB // ENCODING: UTF-8", type: "success" },
  { text: "SECTION SPLITTER ACTIVATED // RUNNING DETERMINISTIC REGEX HEADERS...", type: "system" },
  { text: "IDENTIFIED 26 STANDARDIZED SECTIONS (ITEM 1, 1A, 3, 7, 8...)", type: "success" },
  { text: "EXTRACTING RAW FINANCIAL METRIC VECTORS (LLAMA 3.3 70B NIM)...", type: "process" },
  { text: "EXTRACTED: FY2025 REVENUE $14.28B (+12.4% YoY) // EBITDA $3.12B", type: "success" },
  { text: "EXTRACTED: OPERATING CASH FLOW $2.84B // FREE CASH FLOW $2.10B", type: "success" },
  { text: "WARNING: HEDGING LANGUAGE DETECTED IN ITEM 7 MANAGEMENT DEBATE", type: "warning" },
  { text: "DECODING MANAGEMENT TONE PER SECTION // CALCULATING SENTIMENT...", type: "process" },
  { text: "TONE METRICS EST: SENTIMENT 0.72 // CONFIDENCE 0.81 // PRAGMATIC", type: "success" },
  { text: "PARSING ITEM 1A RISK FACTORS // EXTRACTING 42 CRITICAL NODES...", type: "process" },
  { text: "MAPPING VECTOR SPACE EMBEDDINGS (1024-DIM HNSW COSINE SIM)...", type: "system" },
  { text: "RISK COMPARISON COMPARATIVE DIFF COMPLETED AGAINST FY2024...", type: "success" },
  { text: "FOUND: 4 NEW RISKS ESCALATED // 2 REMOVED // 36 UNCHANGED", type: "warning" },
  { text: "GENERATING SYNDICATED INVESTMENT MEMO IN ANTHROPIC READING CANVAS...", type: "process" },
  { text: "DOCUMENT ANALYSIS PIPELINE COMPLETE // DUMPING TO DB AUDIT TRAIL.", type: "success" },
  { text: "SYSTEM STATUS: STANDBY // AWAITING NEW INPUT COMMAND.", type: "system" },
];

export default function LandingPage() {
  const [stats, setStats] = useState({
    totalDocs: 18,
    analyzedDocs: 15,
    totalCompanies: 6,
    metricsPoints: 312
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activePipelineNode, setActivePipelineNode] = useState<number>(0);
  const [activeToneWord, setActiveToneWord] = useState<string | null>(null);
  const [similarityScore, setSimilarityScore] = useState<number>(0);
  const [isComparing, setIsComparing] = useState(false);

  // Initial loader states
  const [loadingScreen, setLoadingScreen] = useState(true);
  const [loadPercentage, setLoadPercentage] = useState(0);
  const [loadingText, setLoadingText] = useState("DECRYPTING SEC DATA CORPS...");
  const [fadeExit, setFadeExit] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const terminalContainerRef = useRef<HTMLDivElement | null>(null);
  const logIndexRef = useRef(0);
  const supabase = createClient();

  // 1. Fetch Real Database Stats
  useEffect(() => {
    async function fetchDbStats() {
      try {
        const [docsResult, companiesResult] = await Promise.all([
          supabase.from("documents").select("status", { count: "exact" }),
          supabase.from("companies").select("id", { count: "exact" }),
        ]);

        const totalDocs = docsResult.count || 0;
        const totalCompanies = companiesResult.count || 0;
        
        // If there's real database content, populate it with dynamic stats
        if (totalDocs > 0 || totalCompanies > 0) {
          setStats({
            totalDocs,
            analyzedDocs: docsResult.data?.filter((d: any) => d.status === "completed").length || 0,
            totalCompanies,
            metricsPoints: (docsResult.count || 0) * 18 + 120 // simulated count based on documents
          });
        }
      } catch (e) {
        console.warn("Could not query DB stats, falling back to simulated values.", e);
      }
    }
    fetchDbStats();
  }, [supabase]);

  // 2. Starfield Animation (Canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particles Setup
    const particleCount = 120;
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speed: number;
      alpha: number;
      glowColor: string;
    }> = [];

    const glowColors = ["rgba(0, 240, 255,", "rgba(189, 0, 255,", "rgba(255, 69, 0,"];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.4 + 0.1,
        alpha: Math.random() * 0.5 + 0.2,
        glowColor: glowColors[Math.floor(Math.random() * glowColors.length)]
      });
    }

    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - width / 2) * 0.05;
      mouseY = (e.clientY - height / 2) * 0.05;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Animation Loop
    const draw = () => {
      ctx.fillStyle = "#030307";
      ctx.fillRect(0, 0, width, height);

      // Cyber Grid Base Perspective Line (Futuristic horizon vibe)
      ctx.strokeStyle = "rgba(0, 240, 255, 0.02)";
      ctx.lineWidth = 1;
      const horizonY = height * 0.75;
      
      // Draw grid perspective lines radiating from horizon
      for (let i = -width; i < width * 2; i += 80) {
        ctx.beginPath();
        ctx.moveTo(width / 2 + mouseX * 2, horizonY);
        ctx.lineTo(i + mouseX * 5, height);
        ctx.stroke();
      }

      // Draw horizon line
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(width, horizonY);
      ctx.stroke();

      // Render Particles
      particles.forEach((p) => {
        // Apply parallax drift based on mouse
        const currentX = p.x + mouseX * p.speed * 0.5;
        const currentY = p.y + mouseY * p.speed * 0.5;

        ctx.fillStyle = `${p.glowColor}${p.alpha})`;
        ctx.shadowBlur = p.size * 3;
        ctx.shadowColor = p.glowColor.replace(",", ")") as string;
        
        ctx.beginPath();
        ctx.arc(currentX, currentY, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset glow

        // Move particle upward
        p.y -= p.speed;
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Loading Screen Timer
  useEffect(() => {
    const loadingTexts = [
      { threshold: 25, text: "DECRYPTING SEC DATA CORPS..." },
      { threshold: 50, text: "MAPPING NEURAL PARSING PIPELINE..." },
      { threshold: 75, text: "ESTABLISHING SECURE SUPABASE ROUTING..." },
      { threshold: 95, text: "STABILIZING NVIDIA NIM INTEGRATION..." },
      { threshold: 100, text: "LINK ESTABLISHED. ACCESS GRANTED." }
    ];

    const interval = setInterval(() => {
      setLoadPercentage((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setFadeExit(true);
          setTimeout(() => {
            setLoadingScreen(false);
          }, 600); // matches fadeOut transition duration
          return 100;
        }
        
        // Random incremental step to make the loading feel realistic
        const step = Math.floor(Math.random() * 8) + 4;
        const next = Math.min(prev + step, 100);
        
        const currentText = loadingTexts.find(t => next <= t.threshold)?.text || "DECRYPTING DATA CORE...";
        setLoadingText(currentText);
        
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // 3. Simulated Live Console Ingest Log
  useEffect(() => {
    // Add first 3 logs immediately
    const initialLogs: LogEntry[] = RAW_LOGS.slice(0, 4).map((l) => ({
      text: l.text,
      type: l.type as any,
      timestamp: new Date().toLocaleTimeString().split(" ")[0]
    }));
    setLogs(initialLogs);
    logIndexRef.current = 4;

    const interval = setInterval(() => {
      if (logIndexRef.current >= RAW_LOGS.length) {
        // Reset logs to loop infinitely
        setLogs([]);
        logIndexRef.current = 0;
        return;
      }

      const nextLog = RAW_LOGS[logIndexRef.current];
      setLogs((prev) => [
        ...prev.slice(-12), // keep only last 13 lines
        {
          text: nextLog.text,
          type: nextLog.type as any,
          timestamp: new Date().toLocaleTimeString().split(" ")[0]
        }
      ]);
      logIndexRef.current += 1;

      // Auto scroll terminal container
      if (terminalContainerRef.current) {
        terminalContainerRef.current.scrollTo({
          top: terminalContainerRef.current.scrollHeight,
          behavior: "smooth"
        });
      }
    }, 2400);

    return () => clearInterval(interval);
  }, []);

  // 4. Ingest Pipeline Node Loop
  useEffect(() => {
    const pipelineTimer = setInterval(() => {
      setActivePipelineNode((prev) => (prev + 1) % 6);
    }, 4000);
    return () => clearInterval(pipelineTimer);
  }, []);

  // 5. Cosine Diff Simulation Function
  const triggerComparison = () => {
    if (isComparing) return;
    setIsComparing(true);
    setSimilarityScore(0);
    
    let current = 0;
    const target = 94.2;
    const steps = 30;
    const stepValue = target / steps;
    let count = 0;

    const interval = setInterval(() => {
      count++;
      current += stepValue;
      if (count >= steps) {
        setSimilarityScore(target);
        clearInterval(interval);
        setIsComparing(false);
      } else {
        setSimilarityScore(Number(current.toFixed(1)));
      }
    }, 40);
  };

  // Pipeline stages metadata
  const pipelineNodes = [
    {
      title: "Document Ingest",
      desc: "LlamaParse engine reads complex tables & layouts, outputting structured Markdown representation.",
      icon: Cpu,
      color: "text-cyber-cyan",
      borderColor: "border-cyber-cyan/30"
    },
    {
      title: "SEC Sectioning",
      desc: "Deterministic structural splitter classifies 26 standardized 10-K/10-Q subsections.",
      icon: Layers,
      color: "text-cyber-purple",
      borderColor: "border-cyber-purple/30"
    },
    {
      title: "Metric Extraction",
      desc: "LLM extracts detailed financials (EBITDA, Net Debt, Cashflow) with direct citations.",
      icon: Database,
      color: "text-cyber-vermilion",
      borderColor: "border-cyber-vermilion/30"
    },
    {
      title: "Tone Analysis",
      desc: "Measures sentiment, confidence level, and tags management hedging text in real-time.",
      icon: BrainCircuit,
      color: "text-cyber-cyan",
      borderColor: "border-cyber-cyan/30"
    },
    {
      title: "Risk Mapping",
      desc: "1024-dimensional vector embeddings map Item 1A risks via HNSW cosine similarity.",
      icon: Sparkles,
      color: "text-cyber-purple",
      borderColor: "border-cyber-purple/30"
    },
    {
      title: "Memo Generation",
      desc: "Constructs institutional investment reports containing bull, bear, and critical risk logs.",
      icon: FileText,
      color: "text-cyber-vermilion",
      borderColor: "border-cyber-vermilion/30"
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#030307] text-[#fafaf9] overflow-x-hidden font-sans selection:bg-[#00f0ff] selection:text-[#030307] cyber-theme">
      {/* Cyber Bootup Loader Overlay */}
      {loadingScreen && (
        <div 
          className={`fixed inset-0 bg-[#030307] z-50 flex flex-col items-center justify-center font-mono select-none transition-opacity duration-500 ease-out ${
            fadeExit ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Cyber grid pattern overlay */}
          <div className="absolute inset-0 cyber-grid pointer-events-none opacity-20" />
          
          <div className="relative flex flex-col items-center space-y-8 max-w-md w-full px-6">
            {/* Spinning Rings HUD */}
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#00f0ff]/20 animate-spin" style={{ animationDuration: "12s" }} />
              <div className="absolute inset-2 rounded-full border border-double border-[#bd00ff]/30 animate-spin" style={{ animationDuration: "6s", animationDirection: "reverse" }} />
              <div className="absolute inset-6 rounded-full bg-gradient-to-tr from-[#00f0ff] to-[#bd00ff] opacity-80 blur-[2px] animate-pulse flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.6)]">
                <Activity className="h-5 w-5 text-[#030307]" strokeWidth={3} />
              </div>
            </div>

            {/* Status texts */}
            <div className="w-full text-center space-y-3">
              <span className="cyber-badge text-[9px] px-2 py-0.5">UPLINK ATTEMPT // SIGNAL_CORE</span>
              <h2 className="text-xs font-bold tracking-widest text-[#00f0ff] uppercase cyber-glow-cyan min-h-[1.5rem] mt-2">
                {loadingText}
              </h2>
            </div>

            {/* Progress Bar */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                <span>INITIALIZING SYSTEM DRIVERS</span>
                <span className="text-[#00f0ff] tabular-nums font-bold">{loadPercentage}%</span>
              </div>
              <div className="w-full h-2.5 bg-zinc-950/80 border border-white/5 rounded-full p-[2px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
                <div 
                  className="h-full bg-gradient-to-r from-[#bd00ff] via-[#00f0ff] to-[#00ff66] rounded-full transition-all duration-150 ease-out shadow-[0_0_10px_rgba(0,240,255,0.4)]"
                  style={{ width: `${loadPercentage}%` }}
                />
              </div>
            </div>

            {/* Network details */}
            <div className="w-full grid grid-cols-2 gap-4 border-t border-white/5 pt-6 text-[9px] text-zinc-500 font-mono">
              <div className="space-y-1 text-left">
                <div>HOST: <span className="text-zinc-400">SIGNAL_INTELLIGENCE</span></div>
                <div>ADDR: <span className="text-zinc-400">127.0.0.1:3000</span></div>
              </div>
              <div className="space-y-1 text-right">
                <div>STATUS: <span className="text-[#00ff66]">ESTABLISHED</span></div>
                <div>SECURE: <span className="text-[#00f0ff]">SSL // HNSW_VEC</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 1. Background Canvas Starfield */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full pointer-events-none z-0" />
      
      {/* 2. Ambient Color Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00f0ff]/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#bd00ff]/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute top-[40%] right-[15%] w-[40%] h-[40%] bg-[#ff4500]/3 blur-[140px] rounded-full pointer-events-none z-0" />

      {/* Cyber Grid Texture overlay */}
      <div className="absolute inset-0 cyber-grid pointer-events-none z-0" />
      <div className="absolute inset-0 cyber-grid-radial pointer-events-none z-0" />

      {/* Header Bar */}
      <header className="relative w-full z-30 border-b border-white/5 bg-[#030307]/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded bg-[#00f0ff] text-[#030307] shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <Activity className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className={`text-lg font-bold tracking-tight text-white ${spaceGrotesk.className}`}>
              SIGNAL INTELLIGENCE
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-[13px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 text-[#00ff66]">
              <span className="h-2 w-2 rounded-full bg-[#00ff66] animate-pulse" />
              SYSTEM SECURE // ACTIVE UPLINK
            </span>
            <span className="text-zinc-600">|</span>
            <span>EDGAR PARSER v4.8</span>
          </div>

          <div>
            <Link href="/dashboard">
              <button className="cyber-btn px-4 py-1.5 text-xs rounded uppercase tracking-wider flex items-center gap-1.5">
                Terminal Login <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-32">
        {/* HERO SECTION */}
        <section className="flex flex-col items-center justify-center text-center space-y-8 py-8 md:py-16 max-w-4xl mx-auto">
          {/* Active Uplink Status HUD */}
          <div className="cyber-badge flex items-center gap-2 px-3 py-1 font-mono text-[10px] tracking-widest text-[#00f0ff]">
            <Zap className="h-3 w-3 animate-pulse text-[#00f0ff]" />
            AI SEC PARSER // NEURAL FINANCIAL SYSTEM INSTALLED
          </div>

          <div className="space-y-4">
            <h1 className={`text-4xl md:text-7xl font-extrabold tracking-tight text-white ${spaceGrotesk.className}`}>
              Deep Document Analysis <br />
              <span className="cyber-text-gradient-cyan cyber-glow-cyan">With Zero Delusion.</span>
            </h1>
            <p className="text-sm md:text-lg text-zinc-400 max-w-2xl font-light leading-relaxed">
              Ingest quarterly SEC filings (10-K, 10-Q) & earnings transcripts. Auto-extract metrics, verify tone, categorize risk factors, and compile memos in standard-compliancy.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full justify-center">
            <Link href="/dashboard" className="sm:w-auto">
              <button className="cyber-btn cyber-btn-solid w-full sm:w-64 py-3 text-sm rounded uppercase tracking-wider flex items-center justify-center gap-2 group">
                Enter Platform Console 
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>
            <a href="#pipeline" className="sm:w-auto">
              <button className="cyber-btn w-full sm:w-64 py-3 text-sm rounded uppercase tracking-wider text-zinc-300 border-zinc-700 hover:border-[#00f0ff] hover:text-[#00f0ff]">
                Diagnostics Map
              </button>
            </a>
          </div>

          {/* Micro HUD Stat Panels */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full pt-12">
            {[
              { label: "Pipeline Filings Ingested", value: stats.totalDocs, icon: FileText, color: "text-[#00f0ff]" },
              { label: "Automated Memo Diffs", value: stats.analyzedDocs, icon: TrendingUp, color: "text-[#00ff66]" },
              { label: "Covered Financial Tickers", value: stats.totalCompanies, icon: Building2, color: "text-[#bd00ff]" },
              { label: "Metric Data Anchors", value: stats.metricsPoints, icon: Database, color: "text-[#ff4500]" }
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="cyber-card p-4 rounded-lg flex flex-col justify-between text-left group">
                  <div className="flex items-center justify-between text-zinc-500 mb-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider">{stat.label}</span>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <span className="text-2xl md:text-3xl font-bold tracking-tight text-white tabular-nums group-hover:scale-105 transition-transform duration-200">
                    {stat.value}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* INTERACTIVE DIAGNOSTICS & LOG CONSOLE */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-16 items-start">
          
          {/* Simulated Ingest Terminal logs - 7 Columns */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#00ff66]" />
                <span className="font-mono text-xs text-[#00ff66] uppercase tracking-wider">Neural Ingestion Stream Logs</span>
              </div>
              <span className="font-mono text-[9px] text-zinc-500">PING: 24ms // DB_REALTIME_STREAM</span>
            </div>

            <div className="cyber-terminal-container">
              <div className="cyber-scanline-bar" />
              <div className="cyber-terminal rounded-lg overflow-hidden h-[420px] flex flex-col relative">
                {/* Header bar */}
                <div className="cyber-terminal-header flex items-center justify-between px-4 py-2 border-b border-white/5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00ff66]/70" />
                  </div>
                  <span className="font-mono text-[10px] text-zinc-500">sec_analyst@signal-intelligence:~</span>
                  <div className="w-12" />
                </div>

                {/* Console Log Area */}
                <div 
                  ref={terminalContainerRef}
                  className="flex-1 p-4 overflow-y-auto space-y-2.5 scrollbar-thin select-text text-left"
                >
                  {logs.map((log, index) => {
                    const textColors = {
                      system: "text-zinc-400",
                      success: "text-[#00ff66]",
                      process: "text-[#00f0ff]",
                      warning: "text-[#ff4500]"
                    };
                    const prefixes = {
                      system: "[SYS]",
                      success: "[OK ]",
                      process: "[RUN]",
                      warning: "[WRN]"
                    };

                    return (
                      <div key={index} className="flex gap-3 text-xs font-mono items-start animate-fade-in">
                        <span className="text-zinc-600 select-none">{log.timestamp}</span>
                        <span className={`${textColors[log.type]}`}>
                          {prefixes[log.type]}
                        </span>
                        <span className="flex-1 whitespace-pre-wrap tracking-wide cyber-terminal-text">
                          {log.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Feature: Tone & Hedging Decoder - 5 Columns */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Tone Panel */}
            <div className="cyber-card p-6 rounded-xl border border-white/5 space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-[#bd00ff]" />
                  <span className="font-mono text-xs uppercase tracking-wider">Interactive Tone Decoder</span>
                </div>
                <span className="cyber-badge cyber-badge-purple">NIM Rate limit: OK</span>
              </div>
              <p className="text-xs text-zinc-400">
                Hover over the highlighted segments below to inspect the AI tone classification and hedging warnings extracted from filings:
              </p>

              {/* Sample Text Ingest */}
              <div className="bg-[#05050a] border border-white/5 p-4 rounded-lg font-mono text-xs leading-relaxed text-zinc-300">
                <span>&quot;Our Q4 performance was strong. </span>
                <span 
                  className={`cursor-pointer transition-colors duration-200 border-b border-dotted ${
                    activeToneWord === "optimistic" 
                      ? "bg-[#bd00ff]/20 text-[#bd00ff] border-[#bd00ff]" 
                      : "text-[#bd00ff] border-[#bd00ff]/50 hover:bg-[#bd00ff]/10"
                  }`}
                  onMouseEnter={() => setActiveToneWord("optimistic")}
                  onMouseLeave={() => setActiveToneWord(null)}
                >
                  We are highly confident in our technological lead and expect sustained double-digit EBITDA margin expansions
                </span>
                <span> into the next fiscal period. </span>
                <span 
                  className={`cursor-pointer transition-colors duration-200 border-b border-dotted ${
                    activeToneWord === "hedging" 
                      ? "bg-[#ff4500]/20 text-[#ff4500] border-[#ff4500]" 
                      : "text-[#ff4500] border-[#ff4500]/50 hover:bg-[#ff4500]/10"
                  }`}
                  onMouseEnter={() => setActiveToneWord("hedging")}
                  onMouseLeave={() => setActiveToneWord(null)}
                >
                  However, we anticipate potential regulatory bottlenecks and material cost volatility in global supply chains
                </span>
                <span> which could impact timing.&quot;</span>
              </div>

              {/* Decoder Output HUD */}
              <div className="h-32 bg-[#05050a]/50 border border-white/5 p-4 rounded-lg flex flex-col justify-center">
                {activeToneWord === "optimistic" && (
                  <div className="space-y-2 animate-fade-in text-left">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#bd00ff] font-bold">CLASSIFICATION: CONFIDENT / OPTIMISTIC</span>
                      <span className="text-zinc-500">Score: 0.94</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Positive language highlighting strong performance and market leadership. High level of corporate assertion, showing low use of defensive framing.
                    </p>
                  </div>
                )}
                {activeToneWord === "hedging" && (
                  <div className="space-y-2 animate-fade-in text-left">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#ff4500] font-bold">WARNING: HEDGING DETECTED</span>
                      <span className="text-zinc-500">Severity: High</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Standard defensive phrasing (&quot;bottlenecks&quot;, &quot;volatility&quot;, &quot;could impact&quot;) used to mitigate downside risk. Flagged for comparison against previous 10-K declarations.
                    </p>
                  </div>
                )}
                {!activeToneWord && (
                  <div className="text-center text-zinc-500 text-xs font-mono py-4">
                    [AWAITING CURSOR INPUT SIGNAL...]
                  </div>
                )}
              </div>
            </div>

            {/* Vector Cosine Similarity Panel */}
            <div className="cyber-card p-6 rounded-xl border border-white/5 space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#00f0ff]" />
                  <span className="font-mono text-xs uppercase tracking-wider">Risk Comparative Diff</span>
                </div>
                <span className="cyber-badge cyber-badge-emerald">pgvector // 1024d</span>
              </div>
              <p className="text-xs text-zinc-400">
                Test the cosine vector similarity matcher on two SEC risk factor statements:
              </p>

              <div className="space-y-2 font-mono text-[10px]">
                <div className="bg-[#05050a] border border-white/5 p-2.5 rounded text-zinc-300">
                  <span className="text-zinc-500">FY2024 (Item 1A):</span> We face significant competition from tech innovators which could reduce our market share and margins.
                </div>
                <div className="bg-[#05050a] border border-white/5 p-2.5 rounded text-zinc-300">
                  <span className="text-zinc-500">FY2025 (Item 1A):</span> Competitive pressures from AI-driven alternatives present severe threats to our market dominance and pricing strategies.
                </div>
              </div>

              {/* Compare Trigger HUD */}
              <div className="flex items-center justify-between gap-4 bg-[#05050a] p-3 rounded-lg border border-white/5">
                <button 
                  onClick={triggerComparison}
                  disabled={isComparing}
                  className="cyber-btn px-4 py-2 text-xs rounded font-mono uppercase bg-[#00f0ff] text-[#030307]"
                >
                  {isComparing ? "CALCULATING..." : "RUN COSINE DIFF"}
                </button>

                <div className="flex flex-col text-right font-mono">
                  <span className="text-[10px] text-zinc-500 uppercase">Cosine Similarity:</span>
                  <span className={`text-xl font-bold ${similarityScore > 90 ? "text-[#00ff66]" : "text-[#00f0ff]"}`}>
                    {similarityScore > 0 ? `${similarityScore}%` : "0.0%"}
                  </span>
                </div>
              </div>

              {similarityScore > 0 && (
                <div className="p-3 bg-[#00ff66]/10 border border-[#00ff66]/30 rounded text-[11px] font-mono text-zinc-300 animate-fade-in text-left">
                  <span className="text-[#00ff66] font-bold">MATCH DETECTED:</span> This risk is classified as <span className="underline">ESCALATED</span> due to semantic shift focusing on &quot;AI alternatives&quot; vs generic competitor framing.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* PIPELINE DETAILED MAP FEATURE */}
        <section id="pipeline" className="relative mt-24 py-16 border-y border-white/5 text-center">
          <div className="max-w-3xl mx-auto space-y-4 mb-16">
            <div className="cyber-badge mx-auto w-max text-xs">PIPELINE FLOW DIAGNOSTIC</div>
            <h2 className={`text-3xl md:text-5xl font-extrabold tracking-tight text-white ${spaceGrotesk.className}`}>
              Sequential Processing Flow
            </h2>
            <p className="text-zinc-400 text-sm font-light">
              Unlike unstable RAG frameworks, Signal Intelligence runs filings sequentially through a secure, structured audit pipeline to deliver fully auditable memos.
            </p>
          </div>

          {/* Interactive Node Pipeline HUD Graphic */}
          <div className="relative p-6 bg-[#05050a]/40 rounded-2xl border border-white/5 max-w-5xl mx-auto overflow-hidden">
            <div className="cyber-scanline-bar" />
            <div className="cyber-dots-pattern absolute inset-0 pointer-events-none" />

            {/* Horizontal Line SVG displaying nodes */}
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 py-8 px-4">
              
              {/* Connective SVG line (behind nodes on desktop) */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-800 -translate-y-1/2 hidden md:block z-0">
                <svg className="w-full h-full overflow-visible">
                  <line 
                    x1="0" y1="0" x2="100%" y2="0" 
                    stroke="rgba(0, 240, 255, 0.4)" 
                    strokeWidth="2" 
                    className="cyber-line-animation"
                  />
                </svg>
              </div>

              {pipelineNodes.map((node, index) => {
                const Icon = node.icon;
                const isActive = activePipelineNode === index;
                
                return (
                  <div 
                    key={index} 
                    onClick={() => setActivePipelineNode(index)}
                    className="relative z-10 flex flex-col items-center cursor-pointer group w-full md:w-32"
                  >
                    {/* Node Circle */}
                    <div 
                      className={`h-12 w-12 rounded-full flex items-center justify-center border transition-all duration-300 ${
                        isActive 
                          ? `bg-[#030307] border-[#00f0ff] text-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.6)] scale-110` 
                          : `bg-[#05050a] border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300`
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Node Label */}
                    <span 
                      className={`mt-3 font-mono text-[10px] uppercase tracking-wider text-center transition-colors ${
                        isActive ? "text-[#00f0ff] font-bold" : "text-zinc-400 group-hover:text-zinc-200"
                      }`}
                    >
                      {node.title}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Display Active Node details */}
            <div className="relative z-10 mt-8 bg-[#030307]/80 border border-white/5 p-6 rounded-lg text-left animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <span className="h-2 w-2 rounded-full bg-[#00f0ff] animate-pulse" />
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                  STAGE {activePipelineNode + 1}: {pipelineNodes[activePipelineNode].title}
                </h3>
              </div>
              <p className="text-xs text-zinc-300 font-light leading-relaxed max-w-4xl">
                {pipelineNodes[activePipelineNode].desc}
              </p>
            </div>
          </div>
        </section>

        {/* SECURITY & TRUST BANNER */}
        <section className="mt-24 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "No RAG Delusions", text: "Structured, sequential segment analysis guarantees that documents are completely processed without missing footnotes or generating hallucinations.", icon: ShieldCheck },
              { title: "Supabase Integrity", text: "State variables, document parsed nodes, and metadata are safely written to structured schemas with direct audit trails.", icon: Lock },
              { title: "Sequential Rate-Limit", text: "Embedded RPM limiters control OpenAI/NIM client connections, preventing API key failure and timeout disruptions.", icon: Cpu }
            ].map((card, index) => {
              const Icon = card.icon;
              return (
                <div key={index} className="cyber-card p-6 rounded-xl text-left border border-white/5 space-y-3">
                  <div className="h-10 w-10 bg-white/5 rounded-lg flex items-center justify-center text-[#00f0ff]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                    {card.title}
                  </h4>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">
                    {card.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full border-t border-white/5 bg-[#030307] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-zinc-500 font-mono text-[11px]">
          <div>
            &copy; 2026 Signal Intelligence. MIT License.
          </div>
          <div className="flex items-center gap-6">
            <span>UPLINK STATUS: ESTABLISHED</span>
            <span className="text-zinc-700">|</span>
            <Link href="/dashboard" className="text-[#00f0ff] hover:underline">
              ENTER PLATFORM CONSOLE
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
