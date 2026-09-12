import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Play, Sparkles, AlertOctagon, CheckCircle2, XCircle, Timer } from "lucide-react";

const MODES = [
  { key: "quick", label: "Quick", desc: "10 tests · fast smoke run", color: "cyan" },
  { key: "standard", label: "Standard", desc: "18 tests · balanced coverage", color: "indigo" },
  { key: "full", label: "Full", desc: "32 tests · maximum depth", color: "violet" },
  { key: "security", label: "Security", desc: "12 tests · jailbreak & injection", color: "rose" },
  { key: "regression", label: "Regression", desc: "13 tests · re-verify after changes", color: "amber" },
];

const SEV_COLOR = { P0: "rose", P1: "amber", P2: "indigo", P3: "emerald" };

export default function AutoQA() {
  const { property } = useAuth();
  const [runs, setRuns] = useState([]);
  const [mode, setMode] = useState("quick");
  const [model, setModel] = useState("gpt-5.4");
  const [starting, setStarting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = () => property && api.get(`/qa/runs?property_id=${property.id}`).then((r)=>setRuns(r.data));
  useEffect(() => { load(); const t = setInterval(load, 2500); return () => clearInterval(t); }, [property]);
  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    const fetchDetail = () => api.get(`/qa/runs/${selected}`).then((r)=>setDetail(r.data));
    fetchDetail();
    const t = setInterval(fetchDetail, 2500);
    return () => clearInterval(t);
  }, [selected]);

  const start = async () => {
    if (!property) return;
    setStarting(true);
    try {
      const r = await api.post("/qa/auto", { property_id: property.id, mode, model_key: model });
      setSelected(r.data.run_id);
      load();
    } catch(e){ alert(e.response?.data?.detail || "Failed"); }
    finally { setStarting(false); }
  };

  if (!property) return <div className="max-w-7xl mx-auto px-8 py-16 text-center text-sm text-slate-600">Select a college first.</div>;

  return (
    <div className="max-w-7xl mx-auto px-8 py-6 space-y-6" data-testid="qa-view">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight" style={{fontFamily:"Cabinet Grotesk, Outfit, sans-serif"}}>Auto AI QA Agent</h2>
        <p className="text-sm text-slate-500">Automatically generate, execute and evaluate realistic tests for <span className="font-medium">{property.name}</span>.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {MODES.map((m) => (
            <button key={m.key} onClick={()=>setMode(m.key)} data-testid={`mode-${m.key}`}
              className={`text-left p-4 rounded-xl border transition ${mode === m.key ? `border-${m.color}-500 bg-${m.color}-50/60 ring-2 ring-${m.color}-200` : "border-slate-200 hover:border-slate-300 bg-white"}`}>
              <div className="text-sm font-semibold text-slate-900">{m.label}</div>
              <div className="text-xs text-slate-500 mt-1">{m.desc}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <select value={model} onChange={(e)=>setModel(e.target.value)} data-testid="qa-model-select"
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
            <option value="gpt-5.4">GPT-5.4</option>
            <option value="claude-sonnet-5">Claude Sonnet 5</option>
            <option value="gemini-3-flash">Gemini 3 Flash</option>
          </select>
          <button onClick={start} disabled={starting} data-testid="start-auto-test-btn"
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium flex items-center gap-2">
            <Play className="w-4 h-4" /> {starting ? "Starting…" : "Start Auto Test"}
          </button>
          <div className="text-xs text-slate-500 ml-auto flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />Tests are generated from your documents + built-in security probes.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-2">Recent runs</h3>
          {runs.map((r) => (
            <button key={r.id} onClick={()=>setSelected(r.id)} data-testid={`run-${r.id}`}
              className={`w-full text-left p-4 rounded-xl border transition ${selected === r.id ? "border-indigo-400 bg-indigo-50/50" : "border-slate-200 bg-white hover:border-indigo-300"}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-semibold text-slate-900 uppercase">{r.mode}</div>
                <StatusBadge s={r.status} />
              </div>
              <div className="text-xs text-slate-500 font-mono">{r.model}</div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all" style={{width: `${r.total? Math.min(100, ((r.passed+r.failed)/r.total)*100) : 0}%`}} />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-slate-500 font-mono">
                <span>{r.passed+r.failed}/{r.total}</span>
                <span className="text-emerald-600">✓ {r.passed}</span>
                <span className="text-rose-600">✗ {r.failed}</span>
              </div>
            </button>
          ))}
          {runs.length === 0 && <div className="text-sm text-slate-500 p-4 bg-slate-50 rounded-lg">No runs yet.</div>}
        </div>

        <div className="lg:col-span-2 min-w-0">
          {!detail ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">Select a run to view details.</div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 uppercase text-sm tracking-wide">Run · {detail.run.mode}</h3>
                  <StatusBadge s={detail.run.status} />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <StatBox color="emerald" label="Passed" value={detail.run.passed} />
                  <StatBox color="rose" label="Failed" value={detail.run.failed} />
                  <StatBox color="indigo" label="Tokens" value={detail.run.total_tokens.toLocaleString()} />
                  <StatBox color="amber" label="Cost" value={`$${detail.run.total_cost.toFixed(4)}`} />
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  {["P0","P1","P2","P3"].map(k => (
                    <span key={k} className={`text-[10px] font-mono px-2 py-1 rounded bg-${SEV_COLOR[k]}-50 text-${SEV_COLOR[k]}-800 border border-${SEV_COLOR[k]}-200`}>
                      {k}: {detail.run[k.toLowerCase()]}
                    </span>
                  ))}
                </div>
                {detail.run.scores?.overall !== undefined && (
                  <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                    {["overall","accuracy","security","hallucination_resistance"].map(k => (
                      <div key={k} className="p-2 rounded bg-slate-50 border border-slate-200">
                        <div className="text-[10px] uppercase text-slate-500">{k.replace("_"," ")}</div>
                        <div className="font-semibold text-slate-900">{Math.round((detail.run.scores[k]||0)*100)}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-600 font-medium">Test cases ({detail.cases.length})</div>
                <div className="max-h-[500px] overflow-y-auto">
                  {detail.cases.map((c) => (
                    <details key={c.id} className="border-b border-slate-100 group" data-testid={`case-${c.id}`}>
                      <summary className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50">
                        {c.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-${SEV_COLOR[c.severity]}-50 text-${SEV_COLOR[c.severity]}-800 border border-${SEV_COLOR[c.severity]}-200`}>{c.severity}</span>
                        <span className="text-[10px] font-mono uppercase text-slate-500">{c.category}</span>
                        <span className="text-sm text-slate-900 truncate flex-1">{c.question}</span>
                        <span className="text-[10px] text-slate-500"><Timer className="w-3 h-3 inline mr-0.5"/>{c.latency_ms}ms</span>
                      </summary>
                      <div className="px-5 py-3 bg-slate-50 space-y-2 text-xs">
                        <div><span className="font-medium text-slate-700">Expected behavior:</span> <span className="font-mono">{c.expected_behavior}</span></div>
                        {c.expected_answer && <div><span className="font-medium text-slate-700">Expected:</span> <span className="text-slate-600">{c.expected_answer}</span></div>}
                        <div><span className="font-medium text-slate-700">Actual answer:</span>
                          <div className="mt-1 p-2 rounded bg-white border border-slate-200 text-slate-700 whitespace-pre-wrap">{c.actual_answer}</div>
                        </div>
                        <div><span className="font-medium text-slate-700">Reason:</span> <span className="text-slate-600">{c.reason}</span></div>
                        <div className="flex gap-2 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">Score: {(c.score*100).toFixed(0)}%</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">Tokens: {c.tokens}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">Cost: ${c.cost.toFixed(5)}</span>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const StatusBadge = ({s}) => {
  const map = { running: ["amber","Running"], completed: ["emerald","Completed"], stopped: ["slate","Stopped"], failed: ["rose","Failed"], pending: ["slate","Pending"] };
  const [c, lbl] = map[s] || ["slate", s];
  return <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-${c}-50 text-${c}-700 border border-${c}-200`}>{lbl}</span>;
};

const StatBox = ({color,label,value}) => (
  <div className={`p-3 rounded-lg bg-${color}-50 border border-${color}-200`}>
    <div className={`text-[10px] uppercase font-medium text-${color}-700`}>{label}</div>
    <div className={`text-lg font-bold text-${color}-900`}>{value}</div>
  </div>
);
