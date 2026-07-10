import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-accent-border/50 bg-background py-16 px-6 transition-colors duration-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Branding */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <a href="#" className="flex items-center gap-3 group mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-terracotta to-accent-tan p-1.5 shadow-sm">
              <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="15" y="20" width="70" height="60" rx="14" />
                <line x1="15" y1="45" x2="85" y2="45" strokeWidth="7" />
                <circle cx="30" cy="32" r="4.5" fill="currentColor" />
                <circle cx="44" cy="32" r="4.5" fill="currentColor" opacity="0.6" />
                <circle cx="58" cy="32" r="4.5" fill="currentColor" opacity="0.3" />
                <path d="M50 50 C50 55 52 57 58 57 C52 57 50 59 50 64 C50 59 48 57 42 57 C48 57 50 55 50 50 Z" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <span className="font-display font-extrabold text-lg text-accent-dark tracking-tight">
              Briefly<span className="text-accent-terracotta">AI</span>
            </span>
          </a>
          <p className="text-accent-muted text-xs max-w-xs leading-relaxed">
            An autonomous AI browser assistant built to help you scrape, automate, and research any webpage. Built for the modern web.
          </p>
        </div>

        {/* Footer Nav Links */}
        <div className="flex flex-wrap justify-center gap-8 text-xs font-semibold uppercase tracking-wider text-accent-muted">
          <a href="#features" className="hover:text-accent-dark transition-colors duration-300">Features</a>
          <a href="https://github.com/codinggita/valhella" target="_blank" rel="noopener noreferrer" className="hover:text-accent-dark transition-colors duration-300">GitHub</a>
          <a href="#" className="hover:text-accent-dark transition-colors duration-300">Privacy Policy</a>
          <a href="mailto:support@aicompanion.com" className="hover:text-accent-dark transition-colors duration-300">Contact</a>
        </div>

        {/* Socials & Copyright */}
        <div className="flex flex-col items-center md:items-end gap-3.5">
          <div className="flex gap-3">
            <motion.a
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              href="https://github.com/codinggita/valhella"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-paper-card border border-accent-border text-accent-muted hover:text-accent-dark hover:border-accent-terracotta/40 transition-all flex items-center justify-center cursor-pointer shadow-sm"
              aria-label="GitHub"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-paper-card border border-accent-border text-accent-muted hover:text-accent-dark hover:border-accent-terracotta/40 transition-all flex items-center justify-center cursor-pointer shadow-sm"
              aria-label="Twitter/X"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
                <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
              </svg>
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              href="#"
              className="p-2.5 rounded-xl bg-paper-card border border-accent-border text-accent-muted hover:text-accent-dark hover:border-accent-terracotta/40 transition-all flex items-center justify-center cursor-pointer shadow-sm"
              aria-label="Discord"
            >
              <MessageCircle className="w-4 h-4" />
            </motion.a>
          </div>
          <span className="text-[10px] text-accent-muted/70 font-semibold tracking-wider uppercase">
            &copy; {currentYear} Briefly AI. All rights reserved.
          </span>
        </div>

      </div>
    </footer>
  );
}
