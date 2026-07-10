import { motion } from "framer-motion";
import { GraduationCap, Code, BookOpen, Briefcase } from "lucide-react";

export default function UseCases() {
  const useCasesList = [
    {
      icon: <GraduationCap className="w-5 h-5 text-accent-terracotta" />,
      title: "Students",
      subtitle: "Academic Research & Citations",
      description: "Extract study methodologies, sample sizes, and citations from dense academic journals instantly. Let the agent build cross-reference lists.",
    },
    {
      icon: <Code className="w-5 h-5 text-accent-tan" />,
      title: "Developers",
      subtitle: "API Documentation & Schema Extraction",
      description: "Auto-fill test registration forms, parse nested tables into JSON schemas, or compile code snippets directly into your workspace notes.",
    },
    {
      icon: <BookOpen className="w-5 h-5 text-accent-terracotta" />,
      title: "Avid Readers",
      subtitle: "Newsletter & News Compilations",
      description: "Let the agent scrape daily articles, summarize core insights, compile news dossiers, and build personalized outlines to save reading hours.",
    },
    {
      icon: <Briefcase className="w-5 h-5 text-accent-tan" />,
      title: "Professionals",
      subtitle: "Market Analysis & Pricing Tables",
      description: "Scrape pricing structures from competitive websites, extract financial metrics, and format key data into clean spreadsheets automatically.",
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
    hidden: { opacity: 0, scale: 0.96, y: 15 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section id="use-cases" className="py-24 px-6 relative bg-background border-t border-accent-border/50 transition-colors duration-500">
      <div className="max-w-7xl mx-auto z-10 relative">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-xs font-bold uppercase tracking-widest text-accent-terracotta mb-3">
            Versatile Use Cases
          </h2>
          <p className="text-3xl md:text-4xl font-display font-extrabold tracking-tight text-accent-dark mb-4">
            Designed for Active Web Users
          </p>
          <p className="text-accent-muted text-base">
            No matter how you extract details on the web, Briefly AI adapts to automate your flows.
          </p>
        </div>

        {/* Use Cases Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {useCasesList.map((useCase, idx) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              whileHover={{ y: -6, borderColor: "var(--accent-terracotta)" }}
              className="p-6 md:p-8 rounded-2xl bg-paper-card border border-accent-border/60 flex flex-col justify-between items-start text-left transition-all duration-500 relative overflow-hidden group shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_25px_45px_-12px_rgba(0,0,0,0.5)]"
            >
              {/* Card top border stripe */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-terracotta/40 to-accent-tan/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div>
                {/* Icon box */}
                <div className="w-11 h-11 rounded-xl bg-background border border-accent-border/60 flex items-center justify-center mb-6 group-hover:border-accent-terracotta group-hover:scale-105 transition-all duration-300">
                  {useCase.icon}
                </div>

                <h3 className="text-lg font-display font-bold text-accent-dark mb-1 group-hover:text-accent-terracotta transition-colors duration-300">
                  {useCase.title}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent-muted block mb-4">
                  {useCase.subtitle}
                </span>

                <p className="text-xs md:text-sm text-accent-muted leading-relaxed">
                  {useCase.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
