import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen dark:bg-dark-900 bg-light-50 flex flex-col transition-colors duration-200">
      <Header />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
