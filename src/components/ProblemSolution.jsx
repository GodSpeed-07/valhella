import { motion } from "framer-motion";
import { Copy, ExternalLink, RefreshCw, Bot, HelpCircle, X, Check, Eye } from "lucide-react";

export default function ProblemSolution() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <section id="paradigm-shift" className="relative py-24 px-6 overflow-hidden bg-background border-t border-accent-border/50 transition-colors duration-500">
      <div className="max-w-7xl mx-auto z-10 relative">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-xs font-bold uppercase tracking-widest text-accent-terracotta mb-3">
            The Paradigm Shift
          </h2>
          <p className="text-3xl md:text-4xl font-display font-extrabold tracking-tight text-accent-dark mb-4">
            Stop Copy-Pasting to Chatbots
          </p>
          <p className="text-accent-muted text-base">
            Stop breaking your flow by copying text, switching tabs, and context-switching. 
            Let the AI agent control the page directly.
          </p>
        </div>

        {/* Comparison Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
        >
          {/* Left Side: The Old Way */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -3 }}
            className="lg:col-span-6 rounded-2xl bg-paper-card border border-accent-border/70 p-8 md:p-10 flex flex-col justify-between shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_-6px_rgba(0,0,0,0.05)] transition-all duration-500"
          >
            <div>
              <div className="flex items-center gap-3.5 mb-8">
                <div className="w-10 h-10 rounded-xl bg-accent-muted/5 border border-accent-muted/15 flex items-center justify-center text-accent-muted">
                  <X className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-display font-bold text-accent-dark">The Old Manual Way</h3>
              </div>
              
              <p className="text-accent-muted text-sm mb-8 leading-relaxed">
                Need to summarize a complex doc, query a table, or verify details across a webpage?
                The manual route ruins your productivity.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-background/40 border border-accent-border/50 hover:bg-background/80 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-accent-tan/5 border border-accent-tan/20 flex items-center justify-center text-accent-tan shrink-0 mt-0.5">
                    <Copy className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-accent-dark">Select & Copy Page Data</h4>
                    <p className="text-xs text-accent-muted mt-1 leading-relaxed">Struggle with messy formatting, scroll blocks, and copying long pages manually.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 rounded-xl bg-background/40 border border-accent-border/50 hover:bg-background/80 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-accent-tan/5 border border-accent-tan/20 flex items-center justify-center text-accent-tan shrink-0 mt-0.5">
                    <ExternalLink className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-accent-dark">Switch to External Chat Window</h4>
                    <p className="text-xs text-accent-muted mt-1 leading-relaxed">Open a separate tab or application window, losing your view of the original article.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-background/40 border border-accent-border/50 hover:bg-background/80 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-accent-tan/5 border border-accent-tan/20 flex items-center justify-center text-accent-tan shrink-0 mt-0.5">
                    <RefreshCw className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-accent-dark">Paste and Wait for Response</h4>
                    <p className="text-xs text-accent-muted mt-1 leading-relaxed">Explain the page context manually, wait, read, and switch back to find your original place.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-accent-border/60 flex items-center justify-between text-accent-muted text-xs font-semibold tracking-wide uppercase">
              <span>Total steps: 6+ actions</span>
              <span className="text-red-500/80">Focus State: Lost</span>
            </div>
          </motion.div>

          {/* Right Side: The Agentic Way */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -3 }}
            className="lg:col-span-6 rounded-2xl bg-paper-card border-2 border-accent-terracotta/90 p-8 md:p-10 flex flex-col justify-between shadow-[0_10px_35px_-12px_rgba(205,106,78,0.15)] hover:shadow-[0_20px_45px_-15px_rgba(205,106,78,0.25)] transition-all duration-500 relative overflow-hidden"
          >
            {/* Ambient Background Gradient for Premium card */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent-terracotta/5 to-transparent pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-10 h-10 rounded-xl bg-accent-terracotta/10 border border-accent-terracotta/20 flex items-center justify-center text-accent-terracotta">
                  <Check className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-display font-bold text-accent-dark">The Agentic AI Way</h3>
              </div>
              
              <p className="text-accent-muted text-sm mb-8 leading-relaxed">
                Stay focused on the web page. Trigger the AI browser companion directly in-context, input your command, and watch it automate the rest.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-background border border-accent-border/50 hover:border-accent-terracotta/30 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-accent-terracotta/5 border border-accent-terracotta/20 flex items-center justify-center text-accent-terracotta shrink-0 mt-0.5">
                    <Eye className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-accent-dark">Direct HTML & DOM Extraction</h4>
                    <p className="text-xs text-accent-muted mt-1 leading-relaxed">The agent instantly maps elements, article paragraphs, and data structures locally.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-background border border-accent-border/50 hover:border-accent-terracotta/30 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-accent-terracotta/5 border border-accent-terracotta/20 flex items-center justify-center text-accent-terracotta shrink-0 mt-0.5">
                    <HelpCircle className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-accent-dark">Execute Automated In-Page Tasks</h4>
                    <p className="text-xs text-accent-muted mt-1 leading-relaxed">Ask the agent to "verify claims against this table" or "extract all repo links" in-place.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-background border border-accent-border/50 hover:border-accent-terracotta/30 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-accent-terracotta/5 border border-accent-terracotta/20 flex items-center justify-center text-accent-terracotta shrink-0 mt-0.5">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-accent-dark">Seamless UI Side Panel</h4>
                    <p className="text-xs text-accent-muted mt-1 leading-relaxed">Watch execution logs stream in a floating command console that overlays without clutter.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-accent-border relative z-10 flex items-center justify-between text-accent-muted text-xs font-semibold tracking-wide uppercase">
              <span>Total steps: 1 hotkey / command</span>
              <span className="text-accent-terracotta font-bold">Focus State: Preserved</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
