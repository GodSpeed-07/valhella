import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, RotateCcw, SkipForward, Terminal, Sparkles, AlertCircle, Lock } from "lucide-react";

export default function Demo() {
  const [activePreset, setActivePreset] = useState("summarize");
  const [isRunning, setIsRunning] = useState(false);
  const [agentSpeed, setAgentSpeed] = useState("1x");
  const [currentStep, setCurrentStep] = useState(0);
  const [customPrompt, setCustomPrompt] = useState("");
  const [terminalLogs, setTerminalLogs] = useState([]);
  const timerRef = useRef(null);

  const articleParagraphs = [
    {
      text: "The integration of voice-first web assistants represents a major milestone in human-computer interaction.",
      highlightIdx: 2,
    },
    {
      text: "Instead of forcing users to scroll, squint, and filter out banner ads, natural language synthesis models deliver high-fidelity summaries direct to your headphones. This keeps the user in their context without breaking focus.",
      highlightIdx: 4,
    },
    {
      text: "By utilizing client-side DOM parsing, the assistant extracts core article content and ignores surrounding navigation menus, footer templates, and marketing links.",
      highlightIdx: 5,
    },
  ];

  const presets = {
    summarize: {
      name: "Summarize Core Thesis",
      steps: [
        {
          log: "[System] Booting Browser Agent v1.2...",
          highlightPara: -1,
          sidebarContent: "Initializing agent runtime...",
        },
        {
          log: "[Thought] Scanning DOM structure. Excluded 24 navigation nodes and 3 advertisements.",
          highlightPara: -1,
          sidebarContent: "Filtering layout structure...",
        },
        {
          log: "[Action] Analyzing paragraph 1: 'The integration of voice-first...'",
          highlightPara: 0,
          sidebarContent: "Parsing text node #1...",
        },
        {
          log: "[Thought] Extracted thesis: AI integrations represent a major shift in human-computer interaction models.",
          highlightPara: 0,
          sidebarContent: "Insight #1: Shift in HCI models",
        },
        {
          log: "[Action] Analyzing paragraph 2: 'Instead of forcing users to scroll...'",
          highlightPara: 1,
          sidebarContent: "Parsing text node #2...",
        },
        {
          log: "[Action] Analyzing paragraph 3: 'By utilizing client-side DOM parsing...'",
          highlightPara: 2,
          sidebarContent: "Parsing text node #3...",
        },
        {
          log: "[Thought] Compiling finalized article outline summary.",
          highlightPara: -1,
          sidebarContent: "Formatting markdown output...",
        },
        {
          log: "[System] Task completed successfully. Results ready in sidebar.",
          highlightPara: -1,
          sidebarContent: "### Summary\n- **HCI Shift:** Voice/agent models improve web usability.\n- **Focus Preservation:** Delivers summaries direct to output.\n- **Cleaner DOM:** Automatically filters ads and headers.",
        },
      ],
    },
    claims: {
      name: "Extract Key Claims",
      steps: [
        {
          log: "[System] Booting Browser Agent v1.2...",
          highlightPara: -1,
          sidebarContent: "Initializing agent runtime...",
        },
        {
          log: "[Thought] Querying text nodes for argumentative patterns.",
          highlightPara: -1,
          sidebarContent: "Scanning page context...",
        },
        {
          log: "[Action] Inspecting paragraph 1 claim: 'Voice-first represents a major milestone.'",
          highlightPara: 0,
          sidebarContent: "Verifying Claim 1...",
        },
        {
          log: "[Action] Inspecting paragraph 2 claim: 'Delivering summaries keeps user focus.'",
          highlightPara: 1,
          sidebarContent: "Verifying Claim 2...",
        },
        {
          log: "[Thought] Formatting extracted verified claims.",
          highlightPara: -1,
          sidebarContent: "Compiling verified claims...",
        },
        {
          log: "[System] Extraction complete. Outputs formatted below.",
          highlightPara: -1,
          sidebarContent: "### Extracted Claims\n1. **Milestone HCI:** Interface voice/agent integration represents historical milestone.\n2. **Focus State:** Inline summaries prevent manual copy-pasting loss.",
        },
      ],
    },
  };

  const currentPresetData = presets[activePreset];

  const getDelay = useCallback(() => {
    if (agentSpeed === "2x") return 900;
    if (agentSpeed === "4x") return 450;
    return 1800; // 1x
  }, [agentSpeed]);

  const handleStartAgent = () => {
    setIsRunning(true);
    setCurrentStep(0);
    setTerminalLogs([currentPresetData.steps[0].log]);
  };

  const handleNextStep = useCallback(() => {
    if (currentStep < currentPresetData.steps.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setTerminalLogs((prev) => [...prev, currentPresetData.steps[next].log]);
    } else {
      setIsRunning(false);
    }
  }, [currentStep, currentPresetData.steps]);

  useEffect(() => {
    if (isRunning) {
      if (currentStep < currentPresetData.steps.length - 1) {
        timerRef.current = setTimeout(() => {
          handleNextStep();
        }, getDelay());
      } else {
        setIsRunning(false);
      }
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isRunning, currentStep, currentPresetData.steps.length, handleNextStep, getDelay]);

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    setActivePreset("summarize");
    setIsRunning(true);
    setCurrentStep(0);
    setTerminalLogs([`[System] Launching custom task: "${customPrompt}"`, `[Thought] Analyzing viewport...`]);
    setCustomPrompt("");
  };

  const handleRestart = () => {
    setIsRunning(false);
    setCurrentStep(0);
    setTerminalLogs([]);
  };

  const renderLog = (log, index) => {
    let colorClass = "text-zinc-300";
    if (log.startsWith("[System]")) {
      colorClass = "text-[#64C9C7] font-semibold";
    } else if (log.startsWith("[Thought]")) {
      colorClass = "text-[#BB9AF7] dark:text-[#A78BFA] font-medium italic";
    } else if (log.startsWith("[Action]")) {
      colorClass = "text-accent-terracotta font-semibold";
    }
    return (
      <div key={index} className={`whitespace-pre-wrap ${colorClass}`}>
        {log}
      </div>
    );
  };

  return (
    <section id="demo" className="py-24 px-6 relative bg-background transition-colors duration-500 border-t border-accent-border/50">
      <div className="max-w-7xl mx-auto z-10 relative">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-accent-terracotta mb-3">
            Interactive Demo
          </h2>
          <p className="text-3xl md:text-4xl font-display font-extrabold tracking-tight text-accent-dark mb-4">
            Watch the Browser Agent Execute
          </p>
          <p className="text-accent-muted text-base">
            Select a preset capability, run the simulation, and witness the browser agent interact with page details live.
          </p>
        </div>

        {/* Demo Controller Tabs */}
        <div className="flex flex-wrap justify-center gap-3.5 mb-12">
          <button
            onClick={() => {
              setActivePreset("summarize");
              handleRestart();
            }}
            className={`px-6 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activePreset === "summarize"
                ? "bg-accent-terracotta text-[#1E1B18] border-accent-terracotta shadow-[0_4px_15px_-5px_rgba(205,106,78,0.4)]"
                : "bg-paper-card text-accent-muted border-accent-border/60 hover:text-accent-dark hover:border-accent-terracotta/40 shadow-sm"
            }`}
          >
            Preset: Summarize Page
          </button>
          <button
            onClick={() => {
              setActivePreset("claims");
              handleRestart();
            }}
            className={`px-6 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activePreset === "claims"
                ? "bg-accent-terracotta text-[#1E1B18] border-accent-terracotta shadow-[0_4px_15px_-5px_rgba(205,106,78,0.4)]"
                : "bg-paper-card text-accent-muted border-accent-border/60 hover:text-accent-dark hover:border-accent-terracotta/40 shadow-sm"
            }`}
          >
            Preset: Extract Key Claims
          </button>
        </div>

        {/* Demo Window grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Main Browser Window Simulation */}
          <div className="lg:col-span-8 w-full bg-paper-card rounded-2xl overflow-hidden border border-accent-border/60 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.04)] dark:shadow-[0_25px_60px_-20px_rgba(0,0,0,0.6)] flex flex-col justify-between">
            {/* Browser chrome header */}
            <div>
              <div className="bg-accent-border/20 px-4 py-3 border-b border-accent-border/40 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/70"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/70"></div>
                </div>
                <div className="flex-1 max-w-sm mx-4 bg-background rounded-lg py-1 px-4 flex items-center gap-2 border border-accent-border/40 text-[10px] text-accent-muted">
                  <Lock className="w-3 h-3 text-accent-tan shrink-0" />
                  <span className="truncate">techcrunch.com/future-of-voice-synthesis-ai</span>
                </div>
                <div className="w-6"></div>
              </div>

              {/* Browser Webpage content */}
              <div className="p-8 md:p-12 text-left bg-background/5 relative min-h-[320px]">
                <span className="text-[10px] font-bold text-accent-terracotta uppercase tracking-widest">
                  Technology Trends
                </span>
                <h3 className="text-2xl md:text-3xl font-display font-extrabold text-accent-dark mt-2 mb-6 tracking-tight">
                  The Audio Web: Why Screens Are Shrinking
                </h3>

                <div className="space-y-4">
                  {articleParagraphs.map((para, idx) => {
                    const stepData = currentPresetData.steps[currentStep];
                    const isHighlighted = isRunning && stepData && stepData.highlightPara === idx;

                    return (
                      <p
                        key={idx}
                        className={`text-sm md:text-base leading-relaxed transition-all duration-500 rounded px-4 py-3 border-l-2 ${
                          isHighlighted
                            ? "text-accent-dark font-medium bg-accent-terracotta/8 border-accent-terracotta shadow-[0_2px_10px_-4px_rgba(205,106,78,0.1)] scale-[1.005]"
                            : "text-accent-muted border-transparent"
                        }`}
                      >
                        {para.text}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Simulated Action Controller Panel */}
            <div className="m-6 md:m-8 mt-4 flex flex-col md:flex-row items-center justify-between gap-6 p-4 rounded-xl bg-background border border-accent-border/50 shadow-sm">
              {/* Left side: Controls */}
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStartAgent}
                  disabled={isRunning}
                  className={`h-11 px-6 rounded-xl flex items-center justify-center gap-2 font-display font-bold text-xs tracking-wider uppercase shadow-sm cursor-pointer transition-all ${
                    isRunning
                      ? "bg-accent-border text-accent-muted cursor-not-allowed"
                      : "bg-accent-terracotta text-[#1E1B18] hover:bg-accent-terracotta/95 shadow-[0_4px_12px_-4px_rgba(205,106,78,0.35)]"
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Browser Agent</span>
                </motion.button>

                <button
                  onClick={handleRestart}
                  className="p-2.5 rounded-lg text-accent-muted hover:text-accent-dark hover:bg-accent-border/30 transition-all cursor-pointer"
                  title="Reset Simulation"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={handleNextStep}
                  disabled={!isRunning || currentStep === currentPresetData.steps.length - 1}
                  className="p-2.5 rounded-lg text-accent-muted hover:text-accent-dark hover:bg-accent-border/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Skip Next Step"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Center: Command Input Text box */}
              <form onSubmit={handleCustomSubmit} className="flex-1 flex gap-2 w-full max-w-sm">
                <input
                  type="text"
                  placeholder="Describe a custom browser task..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full bg-paper-card border border-accent-border rounded-lg px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-accent-terracotta focus:ring-1 focus:ring-accent-terracotta text-accent-dark shadow-inner"
                />
                <button
                  type="submit"
                  className="bg-accent-tan hover:bg-accent-tan/95 text-[#1E1B18] font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  Execute
                </button>
              </form>

              {/* Right side: Speed configuration */}
              <div className="flex items-center gap-2">
                <select
                  value={agentSpeed}
                  onChange={(e) => setAgentSpeed(e.target.value)}
                  className="bg-paper-card border border-accent-border rounded-lg px-3 py-2 text-xs text-accent-dark font-semibold focus:outline-none focus:border-accent-terracotta focus:ring-1 focus:ring-accent-terracotta cursor-pointer"
                >
                  <option value="1x">1.0x Speed</option>
                  <option value="2x">2.0x Speed</option>
                  <option value="4x">4.0x Speed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Column: AI Assistant Status & Live Captions */}
          <div className="lg:col-span-4 h-full flex flex-col justify-between gap-6">
            {/* Terminal Live Output Console */}
            <div className="bg-[#0B0908] border border-accent-border/60 rounded-2xl p-6 text-left shadow-[0_15px_35px_-12px_rgba(0,0,0,0.15)] flex flex-col justify-between h-[230px]">
              <div>
                <div className="flex items-center gap-2 border-b border-accent-border/10 pb-2.5 mb-3">
                  <Terminal className="w-4 h-4 text-accent-tan" />
                  <span className="text-[10px] font-bold text-accent-tan uppercase tracking-widest">
                    Agent Action Log
                  </span>
                </div>

                {/* Console list */}
                <div className="font-mono text-[10px] text-zinc-300 space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar leading-relaxed">
                  {terminalLogs.length === 0 ? (
                    <span className="text-zinc-500 italic block">Console idle. Click "Run Browser Agent" to execute...</span>
                  ) : (
                    terminalLogs.map((log, index) => renderLog(log, index))
                  )}
                  {isRunning && (
                    <span className="inline-block w-1.5 h-3 bg-accent-terracotta animate-pulse ml-0.5"></span>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar formatted response card */}
            <div className="bg-paper-card border border-accent-border/60 rounded-2xl p-6 text-left shadow-[0_15px_35px_-12px_rgba(0,0,0,0.03)] flex flex-col justify-between flex-1 min-h-[220px]">
              <div>
                <span className="text-[10px] font-bold text-accent-terracotta uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Workspace Output
                </span>
                <h4 className="text-base font-display font-bold text-accent-dark mt-2 mb-4 tracking-tight">Compiled Page Summary</h4>

                {/* Markdown text results box */}
                <div className="bg-background/40 rounded-xl p-4 border border-accent-border text-xs text-accent-dark font-medium leading-relaxed min-h-[140px] max-h-[240px] overflow-y-auto whitespace-pre-wrap select-text custom-scrollbar">
                  {terminalLogs.length > 0 ? (
                    currentPresetData.steps[currentStep].sidebarContent
                  ) : (
                    <div className="flex items-start gap-2.5 text-accent-muted/80 italic">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-accent-tan" />
                      <span>Ready to extract. Run tasks from the controller bar.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
