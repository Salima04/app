import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Colleges from "@/pages/Colleges";
import Documents from "@/pages/Documents";
import Chat from "@/pages/Chat";
import AutoQA from "@/pages/AutoQA";
import ModelLab from "@/pages/ModelLab";
import Golden from "@/pages/Golden";
import Regression from "@/pages/Regression";
import "@/App.css";

const TITLES = {
  "/app": ["Dashboard", "Real-time RAG quality, QA runs & cost analytics"],
  "/app/colleges": ["Colleges", "Manage properties with strict data isolation"],
  "/app/documents": ["Documents", "Knowledge base for the RAG chatbot"],
  "/app/chat": ["RAG Chat", "Strict-grounded student chatbot with citations"],
  "/app/qa": ["Auto QA Agent", "Auto-generate, execute & evaluate LLM tests"],
  "/app/lab": ["Model Test Lab", "Compare LLMs side-by-side on your docs"],
  "/app/golden": ["Golden Dataset", "Ground-truth Q&A for regression"],
  "/app/regression": ["Regression Runs", "Auto-rerun Golden Dataset & spot deltas"],
};

function AppLayout() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  const [title, subtitle] = TITLES[loc.pathname] || ["VidyaGPT", ""];
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} subtitle={subtitle} />
        <main className="flex-1 min-w-0"><Outlet /></main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="colleges" element={<Colleges />} />
            <Route path="documents" element={<Documents />} />
            <Route path="chat" element={<Chat />} />
            <Route path="qa" element={<AutoQA />} />
            <Route path="lab" element={<ModelLab />} />
            <Route path="golden" element={<Golden />} />
            <Route path="regression" element={<Regression />} />
          </Route>
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
