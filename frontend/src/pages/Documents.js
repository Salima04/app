import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Upload, RefreshCw, Trash2, FileText, CheckCircle2, Clock, XCircle } from "lucide-react";

export default function Documents() {
  const { property } = useAuth();
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = () => property && api.get(`/documents?property_id=${property.id}`).then((r)=>setItems(r.data));
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [property]);

  const upload = async (e) => {
    const f = e.target.files?.[0]; if (!f || !property) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("property_id", property.id);
      fd.append("file", f);
      await api.post("/documents/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      load();
    } catch (e) { alert(e.response?.data?.detail || "Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  if (!property) return <Empty msg="Select a college first." />;

  return (
    <div className="max-w-7xl mx-auto px-8 py-6" data-testid="documents-view">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight" style={{fontFamily:"Cabinet Grotesk, Outfit, sans-serif"}}>Documents</h2>
          <p className="text-sm text-slate-500">Upload college docs to power the RAG knowledge base for <span className="font-medium">{property.name}</span>.</p>
        </div>
        <label data-testid="upload-document-btn"
          className={`px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2 cursor-pointer transition ${uploading ? "bg-slate-400" : "bg-indigo-600 hover:bg-indigo-700"}`}>
          <Upload className="w-4 h-4" />
          {uploading ? "Uploading…" : "Upload document"}
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.xlsx,.csv" onChange={upload} disabled={uploading} data-testid="doc-file-input" />
        </label>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-600">
              <th className="px-5 py-3 font-medium">Document</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Chunks</th>
              <th className="px-5 py-3 font-medium">Size</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Uploaded</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50/60" data-testid={`doc-row-${d.id}`}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span className="font-medium text-slate-900 truncate max-w-xs">{d.filename}</span>
                    <span className="text-[10px] text-slate-400 font-mono">v{d.version}</span>
                  </div>
                </td>
                <td className="px-5 py-3 uppercase text-xs font-mono text-slate-600">{d.file_type}</td>
                <td className="px-5 py-3 font-mono text-xs text-indigo-700">{d.chunk_count}</td>
                <td className="px-5 py-3 text-xs text-slate-600">{(d.size_bytes/1024).toFixed(1)} KB</td>
                <td className="px-5 py-3">
                  {d.status === "ready" && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" />Ready</span>}
                  {d.status === "processing" && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" />Processing</span>}
                  {d.status === "failed" && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200"><XCircle className="w-3 h-3" />Failed</span>}
                </td>
                <td className="px-5 py-3 text-xs text-slate-500">{new Date(d.created_at).toLocaleString()}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-1 justify-end">
                    <button onClick={async ()=>{ await api.post(`/documents/${d.id}/reprocess`); load(); }} title="Reprocess"
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-indigo-600">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={async ()=>{ if(confirm("Delete document?")){ await api.delete(`/documents/${d.id}`); load(); }}}
                      data-testid={`delete-doc-${d.id}`}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-sm">No documents yet. Upload PDF, DOCX, TXT, XLSX or CSV.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Empty = ({ msg }) => (
  <div className="max-w-7xl mx-auto px-8 py-16 text-center">
    <div className="inline-block px-5 py-3 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm">{msg}</div>
  </div>
);
