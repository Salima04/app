import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Plus, Trash2, Power } from "lucide-react";

export default function Colleges() {
  const { selectProperty } = useAuth();
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", alias: "", property_id: "" });
  const [err, setErr] = useState("");

  const load = () => api.get("/properties").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault(); setErr("");
    try {
      const r = await api.post("/properties", form);
      selectProperty(r.data);
      setShowForm(false);
      setForm({ name: "", alias: "", property_id: "" });
      load();
    } catch (e) { setErr(e.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-6" data-testid="colleges-view">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight" style={{fontFamily:"Cabinet Grotesk, Outfit, sans-serif"}}>Colleges</h2>
          <p className="text-sm text-slate-500">Manage your property workspaces with strict data isolation.</p>
        </div>
        <button onClick={() => setShowForm(true)} data-testid="add-college-btn"
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center gap-2 transition">
          <Plus className="w-4 h-4" /> Add College
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-6 mb-6 space-y-4" data-testid="add-college-form">
          <h3 className="font-semibold text-slate-900">New College</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Name" value={form.name} onChange={(v)=>setForm({...form,name:v})} testId="college-name" />
            <Input label="Alias" value={form.alias} onChange={(v)=>setForm({...form,alias:v})} testId="college-alias" />
            <Input label="Property ID" value={form.property_id} onChange={(v)=>setForm({...form,property_id:v})} testId="college-propid" />
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <div className="flex gap-2">
            <button type="submit" data-testid="save-college-btn" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium">Save</button>
            <button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-sm transition group" data-testid={`college-card-${p.property_id}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 truncate" style={{fontFamily:"Cabinet Grotesk, Outfit, sans-serif"}}>{p.name}</h3>
                <p className="text-xs text-slate-500 truncate">{p.alias}</p>
              </div>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${p.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                {p.active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="text-xs text-slate-500 font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1 mb-3">{p.property_id}</div>
            <div className="flex gap-2">
              <button onClick={() => selectProperty(p)} data-testid={`select-college-${p.property_id}`}
                className="flex-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium">
                Select
              </button>
              <button onClick={async ()=>{ await api.patch(`/properties/${p.id}/toggle`); load(); }} title="Toggle active"
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600">
                <Power className="w-3.5 h-3.5" />
              </button>
              <button onClick={async ()=>{ if(confirm("Delete college and all its data?")){ await api.delete(`/properties/${p.id}`); load(); } }} title="Delete"
                data-testid={`delete-college-${p.property_id}`}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-red-50 hover:border-red-300 text-slate-600 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-[10px] text-slate-400 mt-3">Created {new Date(p.created_at).toLocaleString()}</div>
          </div>
        ))}
        {items.length === 0 && <div className="col-span-full text-center py-12 text-slate-500 text-sm">No colleges yet. Add your first one.</div>}
      </div>
    </div>
  );
}

const Input = ({label,value,onChange,testId}) => (
  <div>
    <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">{label}</label>
    <input required value={value} onChange={(e)=>onChange(e.target.value)} data-testid={`${testId}-input`}
      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900 text-sm" />
  </div>
);
