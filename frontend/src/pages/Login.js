import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Zap, Sparkles, ShieldCheck } from "lucide-react";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // login|register
  const [email, setEmail] = useState("admin@vidyagpt.com");
  const [password, setPassword] = useState("Admin@12345");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
      navigate("/app");
    } catch (e) { setErr(e.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F8FAFC]">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[#0B1120] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{backgroundImage:"radial-gradient(circle at 20% 20%, rgba(99,102,241,0.4), transparent 50%), radial-gradient(circle at 80% 60%, rgba(6,182,212,0.3), transparent 50%)"}}/>
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 grid place-items-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold" style={{fontFamily:"Cabinet Grotesk, Outfit, sans-serif"}}>VidyaGPT</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">AI QA & RAG Platform</div>
            </div>
          </div>
        </div>
        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold tracking-tight leading-tight" style={{fontFamily:"Cabinet Grotesk, Outfit, sans-serif"}}>
            Every answer, grounded.<br/>Every model, tested.
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed">
            Upload college documents. Let students chat with strict-RAG answers. Let the AI QA Agent auto-generate,
            execute and evaluate thousands of tests — including jailbreak, injection and hallucination probes.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <Sparkles className="w-5 h-5 text-cyan-400 mb-2" />
              <div className="font-semibold text-white text-sm">Auto QA Agent</div>
              <div className="text-xs text-slate-400 mt-1">Quick, Standard, Full, Security & Regression modes</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="font-semibold text-white text-sm">Zero data mixing</div>
              <div className="text-xs text-slate-400 mt-1">Strict property isolation & citation-first answers</div>
            </div>
          </div>
        </div>
        <div className="relative text-xs text-slate-500">© 2026 VidyaGPT — powered by GPT-5.4, Claude Sonnet 5 & Gemini 3</div>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-md space-y-6" data-testid="auth-form">
          <div>
            <div className="text-3xl font-bold text-slate-900 tracking-tight" style={{fontFamily:"Cabinet Grotesk, Outfit, sans-serif"}}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {mode === "login" ? "Sign in to your workspace" : "Set up your VidyaGPT workspace"}
            </div>
          </div>
          {mode === "register" && (
            <div>
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Full Name</label>
              <input required value={name} onChange={(e)=>setName(e.target.value)} data-testid="auth-name-input"
                className="mt-1 w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900" />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Email</label>
            <input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} data-testid="auth-email-input"
              className="mt-1 w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Password</label>
            <input required type="password" value={password} onChange={(e)=>setPassword(e.target.value)} data-testid="auth-password-input"
              className="mt-1 w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900" />
          </div>
          {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" data-testid="auth-error">{err}</div>}
          <button disabled={busy} type="submit" data-testid="auth-submit-btn"
            className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold transition">
            {busy ? "Please wait..." : (mode === "login" ? "Sign in" : "Create account")}
          </button>
          <div className="text-center text-sm text-slate-500">
            {mode === "login" ? "New here?" : "Have an account?"}{" "}
            <button type="button" onClick={()=>setMode(mode==="login"?"register":"login")} data-testid="auth-switch-mode"
              className="text-indigo-600 font-medium hover:underline">
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </div>
          <div className="text-center text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg py-2">
            Demo: <span className="font-mono">admin@vidyagpt.com</span> / <span className="font-mono">Admin@12345</span>
          </div>
        </form>
      </div>
    </div>
  );
}
