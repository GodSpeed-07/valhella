import { motion } from "framer-motion";
import { ArrowRight, Play, CheckCircle2, Terminal, Sparkles, Lock } from "lucide-react";

export default function Hero() {
  const agentTasks = [
    { text: "Parse active tab DOM structure", status: "done" },
    { text: "Filter navigation and footer noise", status: "done" },
    { text: "Synthesize core thesis & claims", status: "active" },
    { text: "Execute automated cross-check", status: "pending" },
  ];

  return (
    <section className="relative min-h-screen pt-32 pb-24 overflow-hidden flex flex-col justify-center bg-background transition-colors duration-500">
      {/* Premium Dotted Grid Background */}
      <div className="absolute inset-0 grid-mesh opacity-[0.25] dark:opacity-[0.15] pointer-events-none"></div>

      {/* Modern Glowing Mesh Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent-terracotta/8 dark:bg-accent-terracotta/4 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-accent-tan/8 dark:bg-accent-tan/4 blur-[130px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center z-10 w-full">
        {/* Left Column: Headline and Call-to-Actions */}
        <div className="lg:col-span-6 flex flex-col text-left">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-accent-terracotta/15 bg-accent-terracotta/5 w-fit mb-8 shadow-sm backdrop-blur-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent-terracotta animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent-terracotta">
              Now in Public Beta
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-5xl md:text-6xl font-display font-black tracking-tight leading-[1.06] mb-6 text-accent-dark"
          >
            Your Browser, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-terracotta via-accent-terracotta to-accent-tan">
              On Autopilot.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-base md:text-lg text-accent-muted font-normal leading-relaxed mb-10 max-w-xl"
          >
            Briefly AI is an autonomous agent that reads, researches, and executes complex actions directly inside your tabs. 
            Instruct in plain English and watch it control web pages—
            <span className="text-accent-dark font-semibold">no copy-pasting required.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row gap-4 mb-10"
          >
            <motion.a
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              href="https://github.com/codinggita/valhella"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-accent-terracotta to-accent-terracotta/95 text-[#1E1B18] font-bold py-4 px-8 rounded-full shadow-[0_10px_25px_-10px_rgba(205,106,78,0.4)] hover:shadow-[0_15px_30px_-8px_rgba(205,106,78,0.5)] flex items-center justify-center gap-3 transition-all cursor-pointer text-sm"
            >
              <span>Get the App — Free</span>
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ArrowRight className="w-4.5 h-4.5" />
              </motion.span>
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              href="#demo"
              className="bg-transparent border border-accent-terracotta/60 hover:border-accent-terracotta hover:bg-accent-terracotta/5 text-accent-terracotta font-semibold py-4 px-8 rounded-full flex items-center justify-center gap-3 transition-all cursor-pointer text-sm"
            >
              <Play className="w-3.5 h-3.5 fill-accent-terracotta text-accent-terracotta" />
              <span>Watch Demo</span>
            </motion.a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-wrap items-center gap-x-6 gap-y-2.5 text-accent-muted text-xs font-semibold tracking-wide"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent-terracotta" />
              No signup required
            </span>
            <span className="hidden sm:inline w-1 h-1 rounded-full bg-accent-border"></span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent-terracotta" />
              100% Privacy-First
            </span>
          </motion.div>
        </div>

        {/* Right Column: Browser & Extension Mockup */}
        <div className="lg:col-span-6 w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="w-full bg-paper-card rounded-2xl overflow-hidden border border-accent-border/60 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06)] dark:shadow-[0_30px_70px_-20px_rgba(0,0,0,0.7)] relative"
          >
            {/* Browser Header Chrome */}
            <div className="bg-accent-border/20 px-4 py-3 border-b border-accent-border/40 flex items-center justify-between">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/70"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/70"></div>
              </div>
              <div className="flex-1 max-w-sm mx-4 bg-background rounded-lg py-1 px-3.5 flex items-center gap-2 border border-accent-border/40 text-[10px] text-accent-muted">
                <Lock className="w-3 h-3 text-accent-tan shrink-0" />
                <span className="truncate">wikipedia.org/wiki/Artificial_intelligence</span>
              </div>
              <div className="w-6"></div>
            </div>

            {/* Browser Page Body Area */}
            <div className="p-6 relative bg-background/10 min-h-[390px] flex">
              {/* Simulated Wiki Page content */}
              <div className="flex-1 pr-[185px] text-left opacity-[0.2] dark:opacity-[0.15] select-none">
                <div className="w-16 h-3 bg-accent-muted/40 rounded mb-4"></div>
                <div className="w-3/4 h-6 bg-accent-muted/40 rounded mb-6"></div>
                <div className="space-y-2">
                  <div className="w-full h-2.5 bg-accent-muted/30 rounded"></div>
                  <div className="w-11/12 h-2.5 bg-accent-muted/30 rounded"></div>
                  <div className="w-10/12 h-2.5 bg-accent-muted/30 rounded"></div>
                  <div className="w-full h-2.5 bg-accent-muted/30 rounded"></div>
                  <div className="w-9/12 h-2.5 bg-accent-muted/30 rounded"></div>
                </div>
                <div className="w-24 h-3.5 bg-accent-muted/40 rounded mt-8 mb-4"></div>
                <div className="space-y-2">
                  <div className="w-full h-2.5 bg-accent-muted/30 rounded"></div>
                  <div className="w-10/12 h-2.5 bg-accent-muted/30 rounded"></div>
                </div>
              </div>

              {/* Floating Extension Panel (Sidebar style) */}
              <div className="absolute right-4 top-4 bottom-4 w-[170px] md:w-[200px] rounded-xl bg-paper-card/90 border border-accent-border/80 p-4 flex flex-col justify-between shadow-lg backdrop-blur-md">
                {/* Panel Header */}
                <div className="flex items-center justify-between border-b border-accent-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-terracotta opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-terracotta"></span>
                    </span>
                    <span className="text-[9px] font-bold text-accent-dark uppercase tracking-wider">
                      Agent Active
                    </span>
                  </div>
                  <Terminal className="w-3.5 h-3.5 text-accent-tan" />
                </div>

                {/* Simulated Agent Actions List */}
                <div className="my-4 flex-1 flex flex-col gap-2.5 justify-start text-left overflow-hidden">
                  <span className="text-[8px] font-black uppercase text-accent-tan tracking-widest block mb-0.5">Task Log</span>
                  {agentTasks.map((task, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[9px] font-medium leading-tight">
                      {task.status === "done" && (
                        <span className="text-accent-terracotta shrink-0 font-bold">✓</span>
                      )}
                      {task.status === "active" && (
                        <span className="relative flex h-1.5 w-1.5 mt-1 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-terracotta opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-terracotta"></span>
                        </span>
                      )}
                      {task.status === "pending" && (
                        <span className="text-accent-muted/40 shrink-0 font-bold">•</span>
                      )}
                      <span className={task.status === "done" ? "text-accent-muted line-through" : task.status === "active" ? "text-accent-dark font-semibold" : "text-accent-muted/60"}>
                        {task.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtitle simulation */}
                <div className="bg-background/80 rounded-lg p-2.5 border border-accent-border/50 text-[10px] text-accent-dark text-left font-medium leading-relaxed mb-4">
                  <span className="text-accent-terracotta font-bold">Target:</span> Scrape thesis insights...
                </div>

                {/* Floating Action/Command Prompt Button */}
                <div className="relative flex items-center justify-center">
                  <motion.button 
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="relative w-full rounded-lg bg-gradient-to-r from-accent-terracotta to-accent-terracotta/95 py-2 px-3 flex items-center justify-center gap-1.5 shadow-md focus:outline-none cursor-pointer text-white font-display font-bold text-[10px]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Browser Task</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
