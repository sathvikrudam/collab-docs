import { Link } from 'react-router-dom';
import { FileText, Users, Zap, Shield, ArrowRight, Check } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Real-time Sync', desc: 'See every keystroke as it happens. Zero lag collaboration with WebSockets.' },
  { icon: Users, title: 'Multi-user Editing', desc: 'Invite teammates with view or edit permissions. See who\'s online.' },
  { icon: Shield, title: 'Secure by Default', desc: 'JWT authentication, bcrypt passwords, and per-document access control.' },
  { icon: FileText, title: 'Rich Text Editor', desc: 'Headings, bold, italic, lists, links, code blocks and more.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-ink-800/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <FileText size={16} className="text-white" />
          </div>
          <span className="font-display font-semibold text-lg text-white">CollabDocs</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost text-sm px-4 py-2">Sign in</Link>
          <Link to="/register" className="btn-primary text-sm px-4 py-2">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-accent text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
          Now with real-time collaboration
        </div>
        <h1 className="font-display text-5xl sm:text-6xl font-semibold text-white max-w-3xl leading-tight mb-6">
          Write together,<br />
          <span className="text-accent italic">in real time.</span>
        </h1>
        <p className="text-ink-300 text-lg max-w-xl mb-10 leading-relaxed">
          A powerful collaborative editor built on WebSockets. Create, share, and edit documents with your team — changes appear instantly for everyone.
        </p>
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Link to="/register" className="btn-primary px-6 py-3 text-base gap-2">
            Start writing free
            <ArrowRight size={16} />
          </Link>
          <Link to="/login" className="btn-ghost px-6 py-3 text-base">
            Sign in
          </Link>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-20 max-w-5xl w-full">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-5 text-left hover:border-ink-600 transition-colors">
              <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center mb-3">
                <Icon size={18} className="text-accent" />
              </div>
              <h3 className="font-medium text-white mb-1.5 text-sm">{title}</h3>
              <p className="text-ink-400 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Proof points */}
        <div className="flex flex-wrap justify-center gap-6 mt-16 text-ink-400 text-sm">
          {['Free to use', 'No credit card', 'MongoDB Atlas', 'Open source ready'].map(p => (
            <span key={p} className="flex items-center gap-1.5">
              <Check size={13} className="text-success" /> {p}
            </span>
          ))}
        </div>
      </main>

      <footer className="text-center py-6 text-ink-600 text-xs border-t border-ink-800/40">
        CollabDocs — Built with React, Node.js, Socket.io & MongoDB
      </footer>
    </div>
  );
}
