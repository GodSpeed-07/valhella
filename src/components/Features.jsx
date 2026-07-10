import { motion } from "framer-motion";
import { FileText, Cpu, Sparkles, ShieldCheck, Globe, Zap } from "lucide-react";

export default function Features() {
  const featuresList = [
    {
      icon: <FileText className="w-5 h-5 text-accent-terracotta" />,
      title: "Intelligent DOM Parsing",
      description: "Maps layout nodes, forms, buttons, and structured data tables instantly while ignoring sidebar ads.",
    },
    {
      icon: <Cpu className="w-5 h-5 text-accent-tan" />,
      title: "Autonomous Web Tasks",
      description: "Instruct the agent to scrape, fill forms, or navigate complex pages step-by-step automatically.",
    },
    {
      icon: <Zap className="w-5 h-5 text-accent-terracotta" />,
      title: "Real-Time Interaction",
      description: "Guide or interrupt the agent in mid-task to adjust parameters, select targets, or supply input values.",
    },
    {
      icon: <Globe className="w-5 h-5 text-accent-tan" />,
      title: "Multi-Tab Research",
      description: "Coordinate summaries and verify claims by letting the agent query information across multiple open tabs.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-accent-terracotta" />,
      title: "Privacy-Locked Mode",
      description: "Operates exclusively in your local tab. We never store, cache, or scrap your browsing history.",
    },
    {
      icon: <Sparkles className="w-5 h-5 text-accent-tan" />,
      title: "Structured Output Logs",
      description: "Generate spreadsheets, structured JSON data, or clean summaries directly inside your sidebar console.",
    },
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section id="features" className="py-24 px-6 relative bg-background transition-colors duration-500 border-t border-accent-border/50">
      <div className="max-w-7xl mx-auto z-10 relative">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-xs font-bold uppercase tracking-widest text-accent-terracotta mb-3">
            Core Capabilities
          </h2>
          <p className="text-3xl md:text-5xl font-display font-extrabold tracking-tight text-accent-dark mb-6">
            An Autonomous Assistant in Your Tabs
          </p>
          <p className="text-accent-muted text-base">
            Say goodbye to copy-pasting code blocks or text streams. Let Briefly AI extract,
            reason, and automate tasks right on top of your current page.
          </p>
        </div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {featuresList.map((feature, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ y: -6, borderColor: "var(--accent-terracotta)" }}
              className="p-8 rounded-2xl bg-paper-card border border-accent-border/60 flex flex-col items-start text-left transition-all duration-500 relative group overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_25px_45px_-12px_rgba(0,0,0,0.5)]"
            >
              {/* Subtle background glow on hover */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-accent-terracotta/5 to-accent-tan/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

              {/* Icon Container */}
              <div className="relative w-11 h-11 rounded-xl bg-background border border-accent-border/60 flex items-center justify-center mb-6 shadow-sm group-hover:border-accent-terracotta group-hover:scale-105 transition-all duration-300">
                {feature.icon}
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-display font-bold text-accent-dark mb-3">
                {feature.title}
              </h3>
              <p className="text-sm text-accent-muted leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
