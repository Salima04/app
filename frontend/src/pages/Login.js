import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Zap, Sparkles, ShieldCheck } from "lucide-react";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // login|register|forgot-request|forgot-confirm
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setInfo(""); setBusy(true);
    try {
      if (mode === "login") { await login(email, password); navigate("/app"); }
      else if (mode === "register") { await register(name, email, password); navigate("/app"); }
      else if (mode === "forgot-request") {
        const { data } = await (await import("@/lib/api")).default.post("/auth/forgot-request", { email });
        setInfo(data.reset_token
          ? `Reset token issued. (Dev env: token shown below — in production this would be emailed.)\nToken: ${data.reset_token}`
          : "If the account exists, a reset token has been issued.");
        if (data.reset_token) { setResetToken(data.reset_token); setMode("forgot-confirm"); }
      }
      else if (mode === "forgot-confirm") {
        await (await import("@/lib/api")).default.post("/auth/forgot-confirm", { token: resetToken, new_password: newPassword });
        setInfo("Password reset successfully. You can now sign in.");
        setMode("login"); setPassword(newPassword); setNewPassword(""); setResetToken("");
      }
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
              {mode === "login" ? "Welcome back" : mode === "register" ? "Create account" : mode === "forgot-request" ? "Reset password" : "Set new password"}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {mode === "login" ? "Sign in to your workspace" :
               mode === "register" ? "New accounts are created with student access" :
               mode === "forgot-request" ? "We'll issue a one-time reset token" :
               "Enter the reset token and your new password"}
            </div>
          </div>
          {mode === "register" && (
            <div>
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Full Name</label>
              <input required value={name} onChange={(e)=>setName(e.target.value)} data-testid="auth-name-input"
                className="mt-1 w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900" />
            </div>
          )}
          {mode !== "forgot-confirm" && (
            <div>
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Email</label>
              <input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} data-testid="auth-email-input"
                className="mt-1 w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900" />
            </div>
          )}
          {(mode === "login" || mode === "register") && (
            <div>
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Password</label>
              <input required minLength={mode==="register"?8:6} type="password" value={password} onChange={(e)=>setPassword(e.target.value)} data-testid="auth-password-input"
                className="mt-1 w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900" />
            </div>
          )}
          {mode === "forgot-confirm" && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Reset Token</label>
                <input required value={resetToken} onChange={(e)=>setResetToken(e.target.value)} data-testid="auth-token-input"
                  className="mt-1 w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 font-mono text-xs text-slate-900" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">New Password (min 8 chars)</label>
                <input required minLength={8} type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} data-testid="auth-newpassword-input"
                  className="mt-1 w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 text-slate-900" />
              </div>
            </>
          )}
          {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" data-testid="auth-error">{err}</div>}
          {info && <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 whitespace-pre-wrap break-all" data-testid="auth-info">{info}</div>}
          <button disabled={busy} type="submit" data-testid="auth-submit-btn"
            className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold transition">
            {busy ? "Please wait..." :
             mode === "login" ? "Sign in" :
             mode === "register" ? "Create account" :
             mode === "forgot-request" ? "Send reset token" :
             "Reset password"}
          </button>
          <div className="text-center text-sm text-slate-500 space-x-3">
            {mode === "login" && <>
              <button type="button" onClick={()=>{setMode("register");setErr("");setInfo("");}} className="text-indigo-600 font-medium hover:underline" data-testid="auth-switch-register">Create account</button>
              <span>·</span>
              <button type="button" onClick={()=>{setMode("forgot-request");setErr("");setInfo("");}} className="text-slate-500 hover:underline" data-testid="auth-switch-forgot">Forgot password?</button>
            </>}
            {mode !== "login" && (
              <button type="button" onClick={()=>{setMode("login");setErr("");setInfo("");}} className="text-indigo-600 font-medium hover:underline" data-testid="auth-switch-login">Back to sign in</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
