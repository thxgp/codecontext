import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="fixed inset-0 dark:bg-dark-900 bg-light-50 flex flex-col overflow-hidden transition-colors duration-200">
      <Header />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
