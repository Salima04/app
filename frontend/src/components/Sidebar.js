import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, School2, FileText, MessagesSquare, Sparkles, Cpu, BookMarked, LogOut, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard", end: true },
  { to: "/app/colleges", label: "Colleges", icon: School2, testId: "nav-colleges" },
  { to: "/app/documents", label: "Documents", icon: FileText, testId: "nav-documents" },
  { to: "/app/chat", label: "RAG Chat", icon: MessagesSquare, testId: "nav-chat" },
  { to: "/app/qa", label: "Auto QA Agent", icon: Sparkles, testId: "nav-qa" },
  { to: "/app/lab", label: "Model Test Lab", icon: Cpu, testId: "nav-lab" },
  { to: "/app/golden", label: "Golden Dataset", icon: BookMarked, testId: "nav-golden" },
];

export default function Sidebar() {
  const { user, logout, property } = useAuth();
  const navigate = useNavigate();
  return (
    <aside className="w-64 bg-[#0B1120] border-r border-[#1E293B] flex flex-col text-slate-200" data-testid="app-sidebar">
      <div className="h-16 px-5 flex items-center gap-2 border-b border-[#1E293B]">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 grid place-items-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-white tracking-tight" style={{fontFamily:"Cabinet Grotesk, Outfit, sans-serif"}}>VidyaGPT</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400">AI QA Platform</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} data-testid={n.testId}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive ? "bg-[#1E293B] text-cyan-300 font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800/60"}`}>
            <n.icon className="w-4 h-4" />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-[#1E293B]">
        {property && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <div className="text-[10px] uppercase tracking-widest text-indigo-300">Active College</div>
            <div className="text-sm text-white font-medium truncate">{property.name}</div>
            <div className="text-[10px] text-slate-400">{property.property_id}</div>
          </div>
        )}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 grid place-items-center text-xs font-bold text-white">{(user?.name||"U")[0]}</div>
          <div className="min-w-0">
            <div className="text-sm text-white font-medium truncate">{user?.name}</div>
            <div className="text-[10px] text-slate-500 truncate">{user?.email}</div>
          </div>
        </div>
        <button onClick={() => { logout(); navigate("/login"); }} data-testid="sidebar-logout-btn"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/60 transition">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
