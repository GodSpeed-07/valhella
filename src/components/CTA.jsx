import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function CTA() {
  return (
    <section id="cta" className="py-32 px-6 relative overflow-hidden bg-background text-center border-t border-accent-border/50 transition-colors duration-500">
      {/* Premium Dotted Grid Background */}
      <div className="absolute inset-0 grid-mesh opacity-[0.2] dark:opacity-[0.1] pointer-events-none"></div>

      {/* Decorative Blur Blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent-terracotta/8 dark:bg-accent-terracotta/4 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto z-10 relative flex flex-col items-center">
        {/* Animated Floating Browser Logo */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent-terracotta to-accent-tan p-4 flex items-center justify-center text-white mb-8 shadow-md border border-accent-border/10"
        >
          <svg className="w-8 h-8 text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="15" y="20" width="70" height="60" rx="14" />
            <line x1="15" y1="45" x2="85" y2="45" strokeWidth="6" />
            <circle cx="30" cy="32" r="4.5" fill="currentColor" />
            <circle cx="44" cy="32" r="4.5" fill="currentColor" opacity="0.6" />
            <circle cx="58" cy="32" r="4.5" fill="currentColor" opacity="0.3" />
            <path d="M50 50 C50 55 52 57 58 57 C52 57 50 59 50 64 C50 59 48 57 42 57 C48 57 50 55 50 50 Z" fill="currentColor" stroke="none" />
          </svg>
        </motion.div>

        {/* Heading */}
        <h2 className="text-4xl md:text-6xl font-display font-black tracking-tight text-accent-dark mb-6 leading-[1.12]">
          Stop Copy-Pasting. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-terracotta to-accent-tan">Activate Your Browser Agent.</span>
        </h2>

        {/* Description */}
        <p className="text-accent-muted text-base md:text-lg max-w-xl mb-10 leading-relaxed">
          Get the autonomous AI browser companion today. Scrape pricing schemas, extract dense page tables, search sources across tabs, and execute tasks in half the time.
        </p>

        {/* Button */}
        <motion.div
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
        >
          <a
            href="https://github.com/codinggita/valhella"
            target="_blank"
            rel="noopener noreferrer"
            className="px-10 py-4.5 rounded-full bg-gradient-to-r from-accent-terracotta to-accent-terracotta/95 text-[#1E1B18] font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-3 shadow-[0_10px_25px_-10px_rgba(205,106,78,0.4)] hover:shadow-[0_15px_30px_-8px_rgba(205,106,78,0.5)] transition-all cursor-pointer"
          >
            <span>Get the App — Free</span>
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowRight className="w-4.5 h-4.5" />
            </motion.span>
          </a>
        </motion.div>

        {/* Browser compatibility info */}
        <span className="text-accent-muted text-[10px] font-bold tracking-widest uppercase mt-8 block">
          Currently available as a standalone app &bull; Web extension coming soon
        </span>
      </div>
    </section>
  );
}
