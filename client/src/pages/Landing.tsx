import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { useNavigate } from 'react-router-dom';
import { Button, AnimatedGridPattern } from '../components/ui';
import { GitBranch, MessageSquare, Folder, ArrowRight, Github, Moon, Sun, Code } from 'lucide-react';

export default function Landing() {
  const { login, isAuthenticated } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen dark:bg-dark-900 bg-white">
      {/* Hero */}
      <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-32 overflow-hidden">
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.15}
          duration={3}
          repeatDelay={1}
          className="z-0 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)] dark:fill-orange-500/30 dark:stroke-orange-500/30 fill-orange-400/20 stroke-orange-400/20"
        />
        <nav className="relative z-10 flex items-center justify-between mb-20">
          <div className="flex items-center gap-2">
            <Code className="w-7 h-7 dark:text-neon-cyan text-orange-500" />
            <span className="text-2xl font-bold gradient-text">CodeContext</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-lg dark:bg-dark-700 bg-light-200 dark:hover:bg-dark-600 hover:bg-light-300 dark:text-neon-cyan text-light-600 transition-all"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Button onClick={login} size="lg">
              <Github className="w-5 h-5 mr-2" />
              Sign in with GitHub
            </Button>
          </div>
        </nav>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 dark:text-white text-light-800">
            Understand any codebase in hours, not weeks
          </h1>
          <p className="text-xl dark:text-dark-400 text-light-500 mb-10 max-w-2xl mx-auto">
            AI-powered codebase exploration. Ask questions in plain English, 
            get answers with file references. Stop drowning in unfamiliar code.
          </p>
          <Button onClick={login} size="lg" className="text-lg px-8 py-4">
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="relative z-20 dark:bg-dark-800 bg-light-100 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16 dark:text-white text-light-800">
            Everything you need to onboard fast
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
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
      <div className="relative z-20 py-24 dark:bg-dark-900 bg-white overflow-hidden">
        <AnimatedGridPattern
          numSquares={25}
          maxOpacity={0.12}
          duration={4}
          repeatDelay={1}
          className="z-0 [mask-image:radial-gradient(500px_circle_at_center,white,transparent)] dark:fill-orange-500/30 dark:stroke-orange-500/30 fill-orange-400/20 stroke-orange-400/20"
        />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16 dark:text-white text-light-800">
            How it works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            <Step number={1} title="Connect GitHub" description="Sign in with GitHub and import any repository you have access to." />
            <Step number={2} title="AI Analysis" description="We analyze your codebase, generate summaries, and build a semantic index." />
            <Step number={3} title="Start Exploring" description="Ask questions, browse files, and understand the architecture instantly." />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-20 py-24 dark:bg-dark-800 bg-light-100">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6 dark:text-white text-light-800">
            Ready to understand code faster?
          </h2>
          <p className="text-xl dark:text-dark-400 text-light-500 mb-8">
            Free to use. No credit card required.
          </p>
          <Button onClick={login} size="lg" className="text-lg px-8 py-4">
            <Github className="w-5 h-5 mr-2" />
            Sign in with GitHub
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-20 py-8 border-t dark:border-dark-700 border-light-200 dark:bg-dark-900 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center dark:text-dark-500 text-light-500 text-sm">
          CodeContext &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="dark:bg-dark-700 bg-white rounded-xl p-6 border dark:border-dark-600 border-light-200 dark:hover:border-neon-cyan/30 hover:border-neon-cyan/50 transition-colors shadow-sm">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 dark:text-white text-light-800">{title}</h3>
      <p className="dark:text-dark-400 text-light-500">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-neon-cyan text-white text-xl font-bold flex items-center justify-center mx-auto mb-4 shadow-neon">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2 dark:text-white text-light-800">{title}</h3>
      <p className="dark:text-dark-400 text-light-500">{description}</p>
    </div>
  );
}
