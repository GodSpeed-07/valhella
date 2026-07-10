import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Demo", href: "#demo" },
    { name: "Use Cases", href: "#use-cases" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
          scrolled
            ? "glass-panel py-3.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] dark:shadow-[0_15px_35px_-12px_rgba(0,0,0,0.4)] border-b border-accent-border/40"
            : "bg-transparent py-5 border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <motion.div 
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.05 }}
              transition={{ duration: 0.5 }}
              className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-terracotta to-accent-tan p-2 shadow-sm"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="15" y="20" width="70" height="60" rx="14" />
                <line x1="15" y1="45" x2="85" y2="45" strokeWidth="7" />
                <circle cx="30" cy="32" r="4.5" fill="currentColor" />
                <circle cx="44" cy="32" r="4.5" fill="currentColor" opacity="0.6" />
                <circle cx="58" cy="32" r="4.5" fill="currentColor" opacity="0.3" />
                <path d="M50 50 C50 55 52 57 58 57 C52 57 50 59 50 64 C50 59 48 57 42 57 C48 57 50 55 50 50 Z" fill="currentColor" stroke="none" />
              </svg>
            </motion.div>
            <span className="font-display font-black text-xl tracking-tight text-accent-dark transition-colors duration-300">
              Briefly<span className="text-accent-terracotta">AI</span>
            </span>
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-xs font-semibold uppercase tracking-wider text-accent-muted hover:text-accent-dark transition-colors duration-300 relative group py-1.5"
              >
                {link.name}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-accent-terracotta transition-all duration-300 ease-out group-hover:w-full"></span>
              </a>
            ))}
          </div>

          {/* Desktop CTA & Theme Toggle */}
          <div className="hidden md:flex items-center gap-5">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-accent-border bg-paper-card text-accent-muted hover:text-accent-dark hover:border-accent-terracotta/40 transition-all shadow-sm focus:outline-none flex items-center justify-center cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === "paper" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4 text-accent-terracotta" />
              )}
            </motion.button>

            <motion.a
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              href="https://github.com/codinggita/valhella"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-accent-terracotta to-accent-terracotta/90 text-[#1E1B18] font-bold py-2.5 px-6 rounded-full text-xs tracking-wider uppercase flex items-center gap-2 transition-all shadow-sm hover:shadow-[0_10px_20px_-10px_rgba(205,106,78,0.4)] cursor-pointer"
            >
              <span>Get the App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.a>
          </div>

          {/* Mobile Theme Toggle & Menu Hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-accent-border bg-paper-card text-accent-muted hover:text-accent-dark focus:outline-none flex items-center justify-center"
              aria-label="Toggle theme"
            >
              {theme === "paper" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4 text-accent-terracotta" />
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-accent-muted hover:text-accent-dark transition-colors focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed top-[69px] left-0 w-full z-45 glass-panel border-b border-accent-border/50 py-8 px-6 flex flex-col gap-4 md:hidden shadow-lg"
          >
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-bold uppercase tracking-wider text-accent-muted hover:text-accent-dark py-2.5 transition-colors duration-200 border-b border-accent-border/20 last:border-b-0"
              >
                {link.name}
              </a>
            ))}
            <a
              href="https://github.com/codinggita/valhella"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center mt-4 bg-gradient-to-r from-accent-terracotta to-accent-terracotta/90 text-[#1E1B18] font-bold py-3.5 px-6 rounded-full text-xs uppercase tracking-widest transition-all duration-300 shadow-sm block"
            >
              Get the App — Free
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
