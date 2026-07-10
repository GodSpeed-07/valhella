import { motion } from "framer-motion";
import { Star, MessageSquareQuote } from "lucide-react";

export default function Testimonials() {
  const reviews = [
    {
      name: "Sarah Lin",
      role: "Senior Frontend Engineer",
      company: "Vercel User Group",
      quote: "As someone who extracts technical details from API tables all day, this extension has completely changed my routine. I can task the agent with scraping pricing metrics while I keep coding in my IDE.",
      rating: 5,
      avatarInitials: "SL",
    },
    {
      name: "David K.",
      role: "CS Graduate Student",
      company: "Stanford University",
      quote: "I use this to digest complex academic PDFs and research tables. Being able to tap Option+S and say 'extract study methodology' and have the agent compile a clean markdown summary right in the page is incredible.",
      rating: 5,
      avatarInitials: "DK",
    },
    {
      name: "Marcus Chen",
      role: "Principal Product Designer",
      company: "Linear Enthusiasts",
      quote: "The interface feels like native browser tech. The agent autonomous reasoning console is incredibly fast, and the fact that I can guide it in real-time mid-operation is amazing. It has completely eliminated my copy-paste tasks.",
      rating: 5,
      avatarInitials: "MC",
    },
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section className="py-24 px-6 relative overflow-hidden bg-background transition-colors duration-500 border-t border-accent-border/50">
      <div className="max-w-7xl mx-auto z-10 relative">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-xs font-bold uppercase tracking-widest text-accent-terracotta mb-3">
            User Feedback
          </h2>
          <p className="text-3xl md:text-4xl font-display font-extrabold tracking-tight text-accent-dark mb-4">
            Loved by Developers and Researchers
          </p>
          <p className="text-accent-muted text-base">
            See how early adopters are automating their browser tasks.
          </p>
        </div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {reviews.map((review, idx) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              whileHover={{ y: -6, borderColor: "var(--accent-terracotta)" }}
              className="p-8 md:p-10 rounded-2xl bg-paper-card border border-accent-border/60 flex flex-col justify-between items-start text-left relative shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_25px_45px_-12px_rgba(0,0,0,0.5)] transition-all duration-500 group"
            >
              {/* Quote Mark Icon */}
              <div className="absolute right-6 top-6 opacity-[0.03] dark:opacity-[0.05] text-accent-dark transition-all">
                <MessageSquareQuote className="w-14 h-14" />
              </div>

              <div className="w-full">
                {/* Stars */}
                <div className="flex gap-1.5 mb-6">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent-terracotta text-accent-terracotta stroke-none" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-accent-dark font-serif text-[15px] leading-relaxed mb-8 italic">
                  "{review.quote}"
                </p>
              </div>

              {/* User Bio */}
              <div className="flex items-center gap-4 mt-auto">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent-terracotta/10 to-accent-tan/10 border border-accent-terracotta/20 flex items-center justify-center font-display font-bold text-xs text-accent-terracotta">
                  {review.avatarInitials}
                </div>
                <div>
                  <h4 className="text-sm font-display font-bold text-accent-dark leading-none mb-1.5">
                    {review.name}
                  </h4>
                  <span className="text-[10px] text-accent-muted font-bold tracking-wider uppercase block">
                    {review.role} &bull; {review.company}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
