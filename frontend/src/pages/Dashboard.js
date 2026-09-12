import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { FileText, MessagesSquare, Zap, Timer, DollarSign, Activity, CheckCircle2, AlertOctagon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, BarChart, Bar, Legend } from "recharts";

const Stat = ({ icon: Icon, label, value, hint, color = "indigo" }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-sm transition">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-9 h-9 rounded-lg grid place-items-center bg-${color}-50 text-${color}-600`}><Icon className="w-5 h-5" /></div>
      {hint && <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">{hint}</span>}
    </div>
    <div className="text-2xl font-bold text-slate-900" style={{fontFamily:"Cabinet Grotesk, Outfit, sans-serif"}}>{value}</div>
    <div className="text-xs text-slate-500 mt-1">{label}</div>
  </div>
);

export default function Dashboard() {
  const { property } = useAuth();
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!property) return;
    api.get(`/dashboard?property_id=${property.id}`).then((r) => setData(r.data));
  }, [property]);

  if (!property) return <Empty msg="Select a college from the top-right to see analytics." />;
  if (!data) return <Empty msg="Loading dashboard…" />;

  return (
    <div className="max-w-7xl mx-auto px-8 py-6 space-y-6" data-testid="dashboard-view">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Stat icon={FileText} label="Documents indexed" value={data.documents} color="indigo" />
        <Stat icon={MessagesSquare} label="Conversations" value={data.conversations} color="cyan" />
        <Stat icon={Zap} label="Cache hit rate" value={`${Math.round(data.cache_hit_rate*100)}%`} hint={`${data.cache_hits} hits`} color="emerald" />
        <Stat icon={Timer} label="Avg latency" value={`${data.avg_latency_ms}ms`} color="amber" />
        <Stat icon={DollarSign} label="Total spend" value={`$${data.total_cost}`} color="rose" />
        <Stat icon={Activity} label="Total tokens" value={data.total_tokens.toLocaleString()} color="violet" />
        <Stat icon={CheckCircle2} label="Test runs" value={data.test_runs} color="emerald" />
        <Stat icon={AlertOctagon} label="Overall quality" value={`${Math.round(((data.latest_run?.scores?.overall)||0)*100)}%`} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Quality trend</h3>
              <p className="text-xs text-slate-500">Overall, accuracy, security across recent runs</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.quality_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="run" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} domain={[0,1]} />
              <Tooltip contentStyle={{borderRadius:8, border:"1px solid #E2E8F0", boxShadow:"0 4px 12px rgba(0,0,0,0.08)"}} />
              <Legend />
              <Line type="monotone" dataKey="overall" stroke="#4F46E5" strokeWidth={2} dot={{r:3}} />
              <Line type="monotone" dataKey="accuracy" stroke="#059669" strokeWidth={2} dot={{r:3}} />
              <Line type="monotone" dataKey="security" stroke="#D97706" strokeWidth={2} dot={{r:3}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Latest run</h3>
          {data.latest_run ? (
            <div className="space-y-3 mt-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide">{data.latest_run.mode} · {data.latest_run.model}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                  <div className="text-emerald-700 text-xs font-medium">Passed</div>
                  <div className="text-2xl font-bold text-emerald-900">{data.latest_run.passed}</div>
                </div>
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3">
                  <div className="text-rose-700 text-xs font-medium">Failed</div>
                  <div className="text-2xl font-bold text-rose-900">{data.latest_run.failed}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["p0","p1","p2","p3"].map(k => (
                  <span key={k} className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {k.toUpperCase()}: {data.latest_run[k]}
                  </span>
                ))}
              </div>
            </div>
          ) : <div className="text-sm text-slate-500 mt-4">No runs yet. Trigger an Auto QA test.</div>}
        </div>
      </div>
    </div>
  );
}

const Empty = ({ msg }) => (
  <div className="max-w-7xl mx-auto px-8 py-16 text-center">
    <div className="inline-block px-5 py-3 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm">{msg}</div>
  </div>
);
