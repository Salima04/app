import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Play, TrendingUp, TrendingDown, Minus, Sparkles, CheckCircle2, XCircle, Info } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";

const SEV = { P0: "rose", P1: "amber", P2: "indigo", P3: "emerald" };

const DeltaBadge = ({ delta, status }) => {
  if (status === "new") return <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"><Sparkles className="w-3 h-3" />NEW</span>;
  if (status === "improved") return <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><TrendingUp className="w-3 h-3" />+{(delta*100).toFixed(1)}%</span>;
  if (status === "regressed") return <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200"><TrendingDown className="w-3 h-3" />{(delta*100).toFixed(1)}%</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"><Minus className="w-3 h-3" />0.0%</span>;
};

export default function Regression() {
  const { property } = useAuth();
  const [runs, setRuns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [starting, setStarting] = useState(false);
  const [model, setModel] = useState("gpt-5.4");
  const [goldenCount, setGoldenCount] = useState(0);

  const load = () => {
    if (!property) return;
    api.get(`/regression/runs?property_id=${property.id}`).then((r) => setRuns(r.data));
    api.get(`/golden?property_id=${property.id}`).then((r) => setGoldenCount(r.data.length));
  };
  useEffect(() => { load(); const t = setInterval(load, 2500); return () => clearInterval(t); }, [property]);
  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    const f = () => api.get(`/regression/runs/${selected}`).then((r)=>setDetail(r.data)).catch(()=>{});
    f(); const t = setInterval(f, 2500); return () => clearInterval(t);
  }, [selected]);

  if (!property) return <div className="max-w-7xl mx-auto px-8 py-16 text-center text-sm text-slate-600">Select a college first.</div>;

  const start = async () => {
    setStarting(true);
    try {
      const r = await api.post("/regression/run", { property_id: property.id, model_key: model });
      setSelected(r.data.run_id); load();
    } catch(e){ alert(e.response?.data?.detail || "Failed"); }
    finally { setStarting(false); }
  };

  const trend = [...runs].reverse().map((r, i) => ({
    run: i+1,
    overall: (r.scores?.overall)||0,
    previous: (r.scores?.previous_overall)||0,
  }));

  return (
    <div className="max-w-7xl mx-auto px-8 py-6 space-y-6" data-testid="regression-view">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight" style={{fontFamily:"Cabinet Grotesk, Outfit, sans-serif"}}>Regression Runs</h2>
          <p className="text-sm text-slate-500">Automatically re-runs your <span className="font-medium">{goldenCount}</span> Golden case{goldenCount!==1?"s":""} and highlights per-case deltas.
          <span className="ml-2 text-xs inline-flex items-center gap-1 text-indigo-600"><Info className="w-3 h-3" />Auto-triggers on every document upload & reprocess.</span></p>
        </div>
        <div className="flex items-center gap-2">
          <select value={model} onChange={(e)=>setModel(e.target.value)} data-testid="regression-model-select" className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
            <option value="gpt-5.4">GPT-5.4</option>
            <option value="claude-sonnet-5">Claude Sonnet 5</option>
            <option value="gemini-3-flash">Gemini 3 Flash</option>
          </select>
          <button onClick={start} disabled={starting || goldenCount === 0} data-testid="start-regression-btn"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2">
            <Play className="w-4 h-4" />{starting?"Starting…":"Run Regression"}
          </button>
        </div>
      </div>

      {goldenCount === 0 && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          No golden cases yet — add some in the Golden Dataset page first to enable regression.
        </div>
      )}

      {trend.length >= 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Overall score trend</h3>
          <p className="text-xs text-slate-500 mb-3">Regression runs plotted chronologically</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="run" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} domain={[0,1]} />
              <Tooltip contentStyle={{borderRadius:8, border:"1px solid #E2E8F0", boxShadow:"0 4px 12px rgba(0,0,0,0.08)"}} />
              <Line type="monotone" dataKey="overall" stroke="#4F46E5" strokeWidth={2} dot={{r:4}} name="Current" />
              <ReferenceLine y={0.5} stroke="#F59E0B" strokeDasharray="4 4" label={{value: "50% target", fill: "#F59E0B", fontSize: 10}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 font-medium">Runs</h3>
          {runs.map((r) => {
            const trigger = r.scores?.trigger;
            return (
              <button key={r.id} onClick={()=>setSelected(r.id)} data-testid={`regression-run-${r.id}`}
                className={`w-full text-left p-4 rounded-xl border transition ${selected === r.id ? "border-indigo-400 bg-indigo-50/50" : "border-slate-200 bg-white hover:border-indigo-300"}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-semibold text-slate-900">Regression #{runs.indexOf(r)+1 === 1 ? "(latest)" : ""}</div>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${r.status==='completed'?"bg-emerald-50 text-emerald-700 border border-emerald-200":r.status==='running'?"bg-amber-50 text-amber-700 border border-amber-200":"bg-slate-100 text-slate-600 border-slate-200"}`}>{r.status}</span>
                </div>
                <div className="text-xs text-slate-500 font-mono">{r.model}</div>
                {trigger && <div className="text-[10px] text-indigo-600 mt-1">↳ triggered by {trigger}</div>}
                <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all" style={{width: `${r.total? Math.min(100,((r.passed+r.failed)/r.total)*100):0}%`}} />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>{r.passed+r.failed}/{r.total}</span>
                  <span>Overall {Math.round((r.scores?.overall||0)*100)}%</span>
                  {r.scores?.overall_delta !== undefined && r.scores.overall_delta !== 0 && (
                    <span className={r.scores.overall_delta>0?"text-emerald-600":"text-rose-600"}>
                      {r.scores.overall_delta>0?"+":""}{(r.scores.overall_delta*100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {runs.length === 0 && <div className="text-sm text-slate-500 p-4 bg-slate-50 rounded-lg">No regression runs yet.</div>}
        </div>

        <div className="lg:col-span-2 min-w-0">
          {!detail ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">Select a run to see per-case deltas.</div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="grid grid-cols-4 gap-2">
                  <MiniStat color="emerald" label="Improved" value={detail.run.scores?.improved || 0} icon={TrendingUp} />
                  <MiniStat color="rose" label="Regressed" value={detail.run.scores?.regressed || 0} icon={TrendingDown} />
                  <MiniStat color="slate" label="Same" value={detail.run.scores?.same || 0} icon={Minus} />
                  <MiniStat color="indigo" label="New" value={detail.run.scores?.new || 0} icon={Sparkles} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200"><div className="text-[10px] uppercase text-slate-500">Overall</div><div className="font-bold text-slate-900">{Math.round((detail.run.scores?.overall||0)*100)}%</div></div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200"><div className="text-[10px] uppercase text-slate-500">Previous</div><div className="font-bold text-slate-900">{Math.round((detail.run.scores?.previous_overall||0)*100)}%</div></div>
                  <div className={`p-2 rounded border ${(detail.run.scores?.overall_delta||0)>0?"bg-emerald-50 border-emerald-200":(detail.run.scores?.overall_delta||0)<0?"bg-rose-50 border-rose-200":"bg-slate-50 border-slate-200"}`}>
                    <div className="text-[10px] uppercase text-slate-500">Δ Delta</div>
                    <div className={`font-bold ${(detail.run.scores?.overall_delta||0)>0?"text-emerald-700":(detail.run.scores?.overall_delta||0)<0?"text-rose-700":"text-slate-700"}`}>
                      {(detail.run.scores?.overall_delta||0)>0?"+":""}{Math.round((detail.run.scores?.overall_delta||0)*100)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-600 font-medium">
                  Per-case deltas ({detail.cases.length})
                </div>
                <div className="max-h-[520px] overflow-y-auto">
                  {detail.cases.map((c) => (
                    <details key={c.id} className="border-b border-slate-100" data-testid={`regcase-${c.id}`}>
                      <summary className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50">
                        {c.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-${SEV[c.severity]}-50 text-${SEV[c.severity]}-800 border border-${SEV[c.severity]}-200`}>{c.severity}</span>
                        <span className="text-sm text-slate-900 truncate flex-1">{c.question}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {c.regression_status !== "new" && <>prev {Math.round(c.previous_score*100)}% →</>} <span className="text-slate-900">{Math.round(c.score*100)}%</span>
                        </span>
                        <DeltaBadge delta={c.delta} status={c.regression_status} />
                      </summary>
                      <div className="px-5 py-3 bg-slate-50 space-y-2 text-xs">
                        {c.expected_answer && <div><span className="font-medium text-slate-700">Expected:</span> <span className="text-slate-600">{c.expected_answer}</span></div>}
                        <div><span className="font-medium text-slate-700">Actual:</span>
                          <div className="mt-1 p-2 rounded bg-white border border-slate-200 text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">{c.actual_answer}</div>
                        </div>
                        <div><span className="font-medium text-slate-700">Evaluation:</span> <span className="text-slate-600">{c.reason}</span></div>
                        {c.regression_status !== "new" && (
                          <div className="flex gap-2 flex-wrap items-center">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">Prev pass: {c.previous_passed ? "✓" : "✗"}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">New pass: {c.passed ? "✓" : "✗"}</span>
                            {c.previous_passed && !c.passed && <span className="text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-medium">⚠ Broke a previously passing case</span>}
                            {!c.previous_passed && c.passed && <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">✨ Fixed a previously failing case</span>}
                          </div>
                        )}
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

const MiniStat = ({ color, label, value, icon: Icon }) => (
  <div className={`p-3 rounded-lg bg-${color}-50 border border-${color}-200`}>
    <div className={`text-[10px] uppercase text-${color}-700 flex items-center gap-1`}><Icon className="w-3 h-3" />{label}</div>
    <div className={`text-2xl font-bold text-${color}-900`}>{value}</div>
  </div>
);
