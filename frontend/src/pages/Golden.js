import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Plus, Trash2, BookMarked } from "lucide-react";

export default function Golden() {
  const { property } = useAuth();
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ question: "", expected_answer: "", expected_behavior: "answer", category: "functional", severity: "P2", tags: "" });

  const load = () => property && api.get(`/golden?property_id=${property.id}`).then((r)=>setItems(r.data));
  useEffect(() => { load(); }, [property]);

  if (!property) return <div className="max-w-7xl mx-auto px-8 py-16 text-center text-sm text-slate-600">Select a college first.</div>;

  const submit = async (e) => {
    e.preventDefault();
    const payload = { ...form, property_id: property.id, tags: form.tags.split(",").map(t=>t.trim()).filter(Boolean) };
    await api.post("/golden", payload);
    setShowForm(false);
    setForm({ question: "", expected_answer: "", expected_behavior: "answer", category: "functional", severity: "P2", tags: "" });
    load();
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-6 space-y-6" data-testid="golden-view">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight" style={{fontFamily:"Cabinet Grotesk, Outfit, sans-serif"}}>Golden Dataset</h2>
          <p className="text-sm text-slate-500">Curated Q&A ground truths for regression and quality benchmarking.</p>
        </div>
        <button onClick={()=>setShowForm(true)} data-testid="add-golden-btn"
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add golden case
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-3" data-testid="golden-form">
          <div>
            <label className="text-xs uppercase font-medium text-slate-700">Question</label>
            <input required value={form.question} onChange={(e)=>setForm({...form, question:e.target.value})} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 text-sm" />
          </div>
          <div>
            <label className="text-xs uppercase font-medium text-slate-700">Expected answer</label>
            <textarea required rows={3} value={form.expected_answer} onChange={(e)=>setForm({...form, expected_answer:e.target.value})} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 text-sm" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Select label="Behavior" value={form.expected_behavior} onChange={(v)=>setForm({...form,expected_behavior:v})} options={["answer","refuse","not_found"]} />
            <Select label="Category" value={form.category} onChange={(v)=>setForm({...form,category:v})} options={["functional","security","hallucination","paraphrase","hinglish"]} />
            <Select label="Severity" value={form.severity} onChange={(v)=>setForm({...form,severity:v})} options={["P0","P1","P2","P3"]} />
            <div>
              <label className="text-xs uppercase font-medium text-slate-700">Tags (,)</label>
              <input value={form.tags} onChange={(e)=>setForm({...form,tags:e.target.value})} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" data-testid="save-golden-btn" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Save</button>
            <button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-600">
            <tr><th className="px-4 py-3 text-left font-medium">Question</th><th className="px-4 py-3 text-left font-medium">Category</th><th className="px-4 py-3 text-left font-medium">Severity</th><th className="px-4 py-3 text-left font-medium">Behavior</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((g) => (
              <tr key={g.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                <td className="px-4 py-3 max-w-md"><div className="font-medium text-slate-900 truncate">{g.question}</div><div className="text-xs text-slate-500 truncate">{g.expected_answer}</div></td>
                <td className="px-4 py-3 text-xs font-mono text-slate-600">{g.category}</td>
                <td className="px-4 py-3"><span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">{g.severity}</span></td>
                <td className="px-4 py-3 text-xs font-mono text-slate-600">{g.expected_behavior}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={async ()=>{ await api.delete(`/golden/${g.id}`); load(); }} data-testid={`del-golden-${g.id}`} className="p-1.5 hover:bg-red-50 rounded text-slate-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">No golden cases yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
const Select = ({label,value,onChange,options}) => (
  <div><label className="text-xs uppercase font-medium text-slate-700">{label}</label>
    <select value={value} onChange={(e)=>onChange(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 text-sm bg-white">
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select></div>
);
