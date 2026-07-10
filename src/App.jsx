import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ProblemSolution from "./components/ProblemSolution";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import Demo from "./components/Demo";
import UseCases from "./components/UseCases";
import Testimonials from "./components/Testimonials";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

function App() {
  return (
    <div className="min-h-screen bg-background text-accent-dark flex flex-col transition-colors duration-300">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ProblemSolution />
        <Features />
        <HowItWorks />
        <Demo />
        <UseCases />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export default App;
