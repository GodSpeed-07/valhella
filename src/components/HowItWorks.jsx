import { motion } from "framer-motion";
import { Keyboard, Terminal, Play } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: <Keyboard className="w-5 h-5 text-accent-terracotta" />,
      title: "Trigger Command Mode",
      description: "Activate the agent interface in one click or with the keyboard shortcut (Option + S) to open the side console.",
    },
    {
      number: "02",
      icon: <Terminal className="w-5 h-5 text-accent-tan" />,
      title: "Input Page Intent",
      description: "Describe what you want the agent to do: 'Summarize table metrics', 'Scrape pricing', or 'Auto-fill form details.'",
    },
    {
      number: "03",
      icon: <Play className="w-5 h-5 text-accent-terracotta" />,
      title: "Autopilot Execution",
      description: "Watch the agent reason, navigate DOM elements, click targets, and compile clean data records live.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 relative overflow-hidden bg-background border-t border-accent-border/50 transition-colors duration-500">
      {/* Decorative vertical lines */}
      <div className="absolute top-0 bottom-0 left-1/4 w-[1px] bg-dashed border-r border-accent-border/15 pointer-events-none"></div>
      <div className="absolute top-0 bottom-0 left-2/4 w-[1px] bg-dashed border-r border-accent-border/15 pointer-events-none"></div>
      <div className="absolute top-0 bottom-0 left-3/4 w-[1px] bg-dashed border-r border-accent-border/15 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto z-10 relative">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-xs font-bold uppercase tracking-widest text-accent-terracotta mb-3">
            Simple Workflow
          </h2>
          <p className="text-3xl md:text-4xl font-display font-extrabold tracking-tight text-accent-dark mb-4">
            How It Works in 3 Steps
          </p>
          <p className="text-accent-muted text-base">
            No onboarding guides or complex setup. Install the extension, and you are ready to automate your browser.
          </p>
        </div>

        {/* Timeline Grid */}
        <div className="relative">
          {/* Horizontal line for desktop */}
          <div className="hidden lg:block absolute top-[32px] left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-accent-terracotta/30 via-accent-tan/30 to-accent-terracotta/30"></div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center text-center px-4 group"
              >
                {/* Step Circle & Icon */}
                <div className="relative mb-8">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="w-16 h-16 rounded-full bg-paper-card border border-accent-border/80 flex items-center justify-center relative z-10 shadow-[0_4px_15px_-4px_rgba(0,0,0,0.02)] hover:border-accent-terracotta/50 hover:shadow-[0_10px_25px_-5px_rgba(205,106,78,0.15)] transition-all duration-300"
                  >
                    {step.icon}
                  </motion.div>
                  {/* Glowing number indicator */}
                  <span className="absolute -top-2 -right-2 text-[10px] font-display font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-accent-terracotta to-accent-terracotta/95 text-[#1E1B18] border border-accent-border/10 shadow-sm">
                    {step.number}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-xl font-display font-bold text-accent-dark mb-3 group-hover:text-accent-terracotta transition-colors duration-300">{step.title}</h3>
                <p className="text-sm text-accent-muted leading-relaxed max-w-sm">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
