import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Cpu, Trophy, Timer, DollarSign } from "lucide-react";

const ALL_MODELS = [
  { key: "gpt-5.4", label: "GPT-5.4" },
  { key: "claude-sonnet-5", label: "Claude Sonnet 5" },
  { key: "gemini-3-flash", label: "Gemini 3 Flash" },
];

export default function ModelLab() {
  const { property } = useAuth();
  const [q, setQ] = useState("What are the admission requirements?");
  const [selected, setSelected] = useState(ALL_MODELS.map(m => m.key));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  if (!property) return <div className="max-w-7xl mx-auto px-8 py-16 text-center text-sm text-slate-600">Select a college first.</div>;

  const toggle = (k) => setSelected(s => s.includes(k) ? s.filter(x=>x!==k) : [...s,k]);

  const run = async () => {
    if (!q.trim() || selected.length === 0) return;
    setBusy(true); setResult(null);
    try {
      const r = await api.post("/lab/compare", { property_id: property.id, question: q, models: selected });
      setResult(r.data);
    } catch(e){ alert(e.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-6 space-y-6" data-testid="lab-view">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight" style={{fontFamily:"Cabinet Grotesk, Outfit, sans-serif"}}>Model Test Lab</h2>
        <p className="text-sm text-slate-500">Run the same question through multiple LLMs on your <span className="font-medium">{property.name}</span> docs to compare grounding, latency, and cost.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <label className="text-xs uppercase font-medium text-slate-700 tracking-wide">Test question</label>
          <textarea value={q} onChange={(e)=>setQ(e.target.value)} rows={2} data-testid="lab-question"
            className="mt-1 w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 outline-none text-slate-900" />
        </div>
        <div>
          <label className="text-xs uppercase font-medium text-slate-700 tracking-wide">Models</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALL_MODELS.map((m) => (
              <button key={m.key} onClick={()=>toggle(m.key)} data-testid={`lab-model-${m.key}`}
                className={`px-3 py-1.5 rounded-lg text-sm border transition ${selected.includes(m.key) ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-medium" : "border-slate-300 hover:border-slate-400 text-slate-600"}`}>
                <Cpu className="w-3.5 h-3.5 inline mr-1.5" />{m.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={run} disabled={busy || selected.length === 0} data-testid="lab-compare-btn"
          className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium">
          {busy ? "Running comparison…" : `Compare ${selected.length} model${selected.length!==1?"s":""}`}
        </button>
      </div>

      {result && (
        <>
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center gap-3" data-testid="lab-recommendation">
            <Trophy className="w-6 h-6" />
            <div>
              <div className="text-xs uppercase tracking-wider opacity-80">Recommended</div>
              <div className="text-lg font-bold">{ALL_MODELS.find(m=>m.key===result.recommended)?.label || result.recommended}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {result.results.map((r) => (
              <div key={r.model_key} className={`bg-white rounded-xl border p-5 ${r.model_key === result.recommended ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200"}`} data-testid={`lab-result-${r.model_key}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-slate-900">{r.label}</div>
                  <div className="text-xs font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">Score {(r.overall_score*100).toFixed(0)}%</div>
                </div>
                <div className="prose prose-sm prose-slate max-w-none max-h-64 overflow-y-auto border border-slate-200 rounded p-3 bg-slate-50 text-xs">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{r.answer}</ReactMarkdown>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px]">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200"><div className="text-slate-500">Grounded</div><div className="font-bold text-slate-900">{(r.grounded_score*100).toFixed(0)}%</div></div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200"><div className="text-slate-500 flex items-center gap-1"><Timer className="w-3 h-3"/>Latency</div><div className="font-bold text-slate-900">{r.latency_ms}ms</div></div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200"><div className="text-slate-500 flex items-center gap-1"><DollarSign className="w-3 h-3"/>Cost</div><div className="font-bold text-slate-900">${r.cost.toFixed(5)}</div></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
