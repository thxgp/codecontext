import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { useNavigate } from 'react-router-dom';
import { Button, AnimatedGridPattern, CursorGlow } from '../components/ui';
import { GitBranch, MessageSquare, Folder, ArrowRight, Github, Moon, Sun, Code, Bot, X, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Landing() {
  const { login, isAuthenticated } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [showArchie, setShowArchie] = useState(false);

  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen dark:bg-dark-900 bg-white">
      <CursorGlow opacity={0.2} size={45} />
      {/* Hero */}
      <div className="relative pt-12 pb-16 sm:pt-20 sm:pb-32 overflow-hidden">
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.15}
          duration={3}
          repeatDelay={1}
          className="z-0 [mask-image:radial-gradient(700px_circle_at_center,white,transparent)] dark:fill-orange-500/30 dark:stroke-orange-500/30 fill-orange-500/[0.08] stroke-orange-500/[0.08]"
        />
        <nav className="relative z-10 flex items-center justify-between mb-10 sm:mb-20 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Code className="w-7 h-7 dark:text-neon-cyan text-orange-500" />
            <span className="text-2xl font-bold gradient-text">CodeContext</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleTheme}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg dark:bg-dark-700 bg-stone-100 dark:hover:bg-dark-600 hover:bg-stone-200 dark:text-neon-cyan text-gray-600 transition-all"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Button onClick={login} size="lg" className="hidden sm:flex">
              <Github className="w-5 h-5 mr-2" />
              Sign in with GitHub
            </Button>
            <Button onClick={login} size="lg" className="flex sm:hidden min-w-[44px] min-h-[44px] !px-3">
              <Github className="w-5 h-5" />
            </Button>
          </div>
        </nav>

        <div className="relative z-10 text-center max-w-5xl mx-auto px-4 sm:px-6">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-6 dark:text-white text-gray-900 tracking-tight">
            Understand any codebase<br className="hidden md:block" />
            <span className="gradient-text">in hours, not weeks</span>
          </h1>
          <p className="text-base sm:text-xl dark:text-dark-400 text-gray-500 mb-8 sm:mb-10 max-w-2xl mx-auto">
            AI-powered codebase exploration. Ask questions in plain English, 
            get answers with file references. Stop drowning in unfamiliar code.
          </p>
          <Button onClick={login} size="lg" className="text-base sm:text-lg px-6 py-3 sm:px-8 sm:py-4">
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="relative z-20 dark:bg-dark-800 bg-stone-50 py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-16 dark:text-white text-gray-900">
            Everything you need to onboard fast
          </h2>
          
          <div className="grid md:grid-cols-3 gap-4 sm:gap-8">
            <FeatureCard
              icon={<MessageSquare className="w-8 h-8 dark:text-neon-cyan text-neon-cyan" />}
              title="AI Q&A"
              description="Ask 'Where is auth handled?' and get instant answers with exact file paths."
            />
            <FeatureCard
              icon={<Folder className="w-8 h-8 dark:text-neon-cyan text-neon-cyan" />}
              title="Visual File Tree"
              description="Interactive codebase explorer with AI-generated summaries for each file."
            />
            <FeatureCard
              icon={<GitBranch className="w-8 h-8 dark:text-neon-cyan text-neon-cyan" />}
              title="Architecture Detection"
              description="Auto-detect frameworks, patterns, and codebase structure at a glance."
            />
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="relative z-20 py-12 sm:py-24 dark:bg-dark-900 bg-white overflow-hidden">
        <AnimatedGridPattern
          numSquares={25}
          maxOpacity={0.12}
          duration={4}
          repeatDelay={1}
          className="z-0 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)] dark:fill-orange-500/30 dark:stroke-orange-500/30 fill-orange-500/[0.08] stroke-orange-500/[0.08]"
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-16 dark:text-white text-gray-900">
            How it works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 sm:gap-12">
            <Step number={1} title="Connect GitHub" description="Sign in with GitHub and import any repository you have access to." />
            <Step number={2} title="AI Analysis" description="We analyze your codebase, generate summaries, and build a semantic index." />
            <Step number={3} title="Start Exploring" description="Ask questions, browse files, and understand the architecture instantly." />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-20 py-12 sm:py-24 dark:bg-dark-800 bg-stone-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold mb-6 dark:text-white text-gray-900">
            Ready to understand code faster?
          </h2>
          <p className="text-base sm:text-xl dark:text-dark-400 text-gray-500 mb-8">
            Free to use. No credit card required.
          </p>
          <Button onClick={login} size="lg" className="text-base sm:text-lg px-6 py-3 sm:px-8 sm:py-4">
            <Github className="w-5 h-5 mr-2" />
            Sign in with GitHub
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-20 py-8 border-t dark:border-dark-700 border-stone-200 dark:bg-dark-900 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center dark:text-dark-500 text-gray-400 text-sm">
          CodeContext &copy; {new Date().getFullYear()}
        </div>
      </footer>

      {/* Archie Popup */}
      <AnimatePresence>
        {showArchie && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-24 right-3 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-80 max-w-80 rounded-2xl dark:bg-dark-800 bg-white border dark:border-dark-600 border-stone-200 shadow-2xl dark:shadow-orange-500/10 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 dark:border-dark-800 border-white" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold dark:text-white text-gray-900">Archie</span>
                    <span className="text-xs dark:text-dark-500 text-gray-400 italic">/ahr-chee/</span>
                  </div>
                  <p className="text-[11px] dark:text-dark-400 text-gray-400 leading-tight">
                    From <span className="italic">Archibald</span> &middot; <span className="dark:text-orange-400 text-orange-500 font-medium">"genuinely bold"</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowArchie(false)}
                className="p-1.5 rounded-lg dark:hover:bg-dark-700 hover:bg-stone-100 dark:text-dark-400 text-gray-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 pb-5">
              <div className="dark:bg-dark-700/50 bg-stone-50 rounded-xl p-4">
                <p className="dark:text-dark-300 text-gray-600 text-sm leading-relaxed">
                  Hey! I'm <span className="font-semibold dark:text-neon-cyan text-orange-500">Archie</span>, your AI code companion. Import any GitHub repo and I'll help you navigate it. Ask me about architecture, find specific code, trace execution flows, or get file explanations. I speak plain English, not just code.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs px-2.5 py-1 rounded-full dark:bg-dark-600 bg-stone-100 dark:text-dark-300 text-gray-500">/summarize</span>
                <span className="text-xs px-2.5 py-1 rounded-full dark:bg-dark-600 bg-stone-100 dark:text-dark-300 text-gray-500">/structure</span>
                <span className="text-xs px-2.5 py-1 rounded-full dark:bg-dark-600 bg-stone-100 dark:text-dark-300 text-gray-500">/search</span>
                <span className="text-xs px-2.5 py-1 rounded-full dark:bg-dark-600 bg-stone-100 dark:text-dark-300 text-gray-500">/trace</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Archie FAB */}
      <motion.button
        onClick={() => setShowArchie(prev => !prev)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 flex items-center justify-center transition-shadow"
      >
        <AnimatePresence mode="wait">
          {showArchie ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }} className="relative">
              <Bot className="w-6 h-6" />
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-amber-200" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="dark:bg-dark-700 bg-white rounded-xl p-4 sm:p-6 border dark:border-dark-600 border-stone-200 dark:hover:border-neon-cyan/30 hover:border-orange-300 transition-colors shadow-sm hover:shadow-md">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 dark:text-white text-gray-900">{title}</h3>
      <p className="dark:text-dark-400 text-gray-500">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-neon-cyan text-white text-xl font-bold flex items-center justify-center mx-auto mb-4 dark:shadow-neon shadow-lg shadow-orange-500/25">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2 dark:text-white text-gray-900">{title}</h3>
      <p className="dark:text-dark-400 text-gray-500">{description}</p>
    </div>
  );
}
