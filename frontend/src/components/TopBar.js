import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { ChevronDown, School2 } from "lucide-react";

export default function TopBar({ title, subtitle, right }) {
  const { property, selectProperty } = useAuth();
  const [props, setProps] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => { api.get("/properties").then((r) => setProps(r.data)); }, []);
  return (
    <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md flex items-center px-8 gap-6 sticky top-0 z-20">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-slate-900 tracking-tight" style={{fontFamily:"Cabinet Grotesk, Outfit, sans-serif"}}>{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
      </div>
      <div className="relative">
        <button data-testid="college-selector-btn" onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 transition">
          <School2 className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-medium text-slate-900 truncate max-w-[180px]">{property?.name || "Select College"}</span>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-lg border border-slate-200 shadow-lg py-2 z-30" data-testid="college-selector-menu">
            {props.length === 0 && <div className="px-4 py-3 text-xs text-slate-500">No colleges yet. Add one first.</div>}
            {props.map((p) => (
              <button key={p.id} onClick={() => { selectProperty(p); setOpen(false); }}
                data-testid={`college-option-${p.property_id}`}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 transition">
                <div className="text-sm font-medium text-slate-900">{p.name}</div>
                <div className="text-xs text-slate-500">{p.alias} · {p.property_id}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      {right}
    </header>
  );
}
