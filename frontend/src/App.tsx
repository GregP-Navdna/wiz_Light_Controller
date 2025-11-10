import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Home, Scan, Calendar, Settings, Users } from 'lucide-react';
import DevicesPage from './pages/DevicesPage';
import ScanPage from './pages/ScanPage';
import SchedulerPage from './pages/SchedulerPage';
import GroupsPage from './pages/GroupsPage';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const { connected, scanProgress } = useWebSocket();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background relative">
        {/* Header */}
        <header className="border-b-2 border-primary/30 bg-card relative overflow-hidden">
          <div className="absolute inset-0 bg-retro-grid opacity-20"></div>
          <div className="container mx-auto px-4 py-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-neon-cyan tracking-wider">
                  WIZ CONTROLLER
                </h1>
                <p className="text-xs text-neon-magenta mt-1 tracking-widest">// LIGHTWAVE COMMAND SYSTEM v1.0</p>
              </div>
              <div className="flex items-center gap-6">
                {scanProgress && scanProgress.scanning && (
                  <div className="flex items-center gap-2 text-sm font-mono">
                    <div className="h-2 w-2 rounded-full bg-neon-cyan animate-glow-pulse shadow-neon-cyan" />
                    <span className="text-neon-cyan">SCANNING {scanProgress.progress.toFixed(0)}%</span>
                  </div>
                )}
                <div
                  className={`flex items-center gap-2 text-sm font-mono ${
                    connected ? 'text-neon-green' : 'text-neon-orange'
                  }`}
                >
                  <div
                    className={`h-2 w-2 rounded-full ${
                      connected ? 'bg-neon-green shadow-neon-cyan animate-glow-pulse' : 'bg-neon-orange'
                    }`}
                  />
                  {connected ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="border-b-2 border-primary/20 bg-urban-subway relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex gap-2">
              <NavLink to="/" icon={<Home size={18} />}>
                Devices
              </NavLink>
              <NavLink to="/scan" icon={<Scan size={18} />}>
                Scan
              </NavLink>
              <NavLink to="/groups" icon={<Users size={18} />}>
                Groups
              </NavLink>
              <NavLink to="/scheduler" icon={<Calendar size={18} />}>
                Scheduler
              </NavLink>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<DevicesPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/scheduler" element={<SchedulerPage />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t-2 border-primary/30 bg-urban-asphalt mt-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-retro-grid opacity-10"></div>
          <div className="container mx-auto px-4 py-6 text-center relative z-10">
            <p className="text-xs text-neon-cyan font-mono tracking-wider">⚠️ AUTHORIZED NETWORKS ONLY // 2025</p>
            <p className="text-xs text-primary/50 mt-1 font-mono">[ LIGHTWAVE SYSTEMS ]</p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

function NavLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 px-6 py-3 text-sm font-bold tracking-wide text-muted-foreground hover:text-neon-cyan hover:bg-primary/10 transition-all duration-300 border-l-2 border-transparent hover:border-primary hover:shadow-neon-cyan relative group"
    >
      <span className="group-hover:text-neon-cyan transition-colors">{icon}</span>
      <span className="font-mono uppercase">{children}</span>
    </Link>
  );
}

export default App;
