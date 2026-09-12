import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Send, Zap, Cpu, DollarSign, Timer, Layers, FileText, X, Bot, User as UserIcon } from "lucide-react";

const MODELS = [
  { key: "gpt-5.4", label: "GPT-5.4" },
  { key: "claude-sonnet-5", label: "Claude Sonnet 5" },
  { key: "gemini-3-flash", label: "Gemini 3 Flash" },
];

export default function Chat() {
  const { property } = useAuth();
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [convId, setConvId] = useState(null);
  const [model, setModel] = useState("gpt-5.4");
  const [showObs, setShowObs] = useState(null); // msg for drawer
  const endRef = useRef();

  useEffect(() => { setMsgs([]); setConvId(null); }, [property?.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async (e) => {
    e?.preventDefault();
    if (!input.trim() || !property || busy) return;
    const userMsg = { id: `u-${Date.now()}`, role: "user", content: input, created_at: new Date().toISOString() };
    setMsgs((m) => [...m, userMsg]);
    const q = input; setInput(""); setBusy(true);
    try {
      const r = await api.post("/chat", { property_id: property.id, question: q, conversation_id: convId, model_key: model });
      setConvId(r.data.conversation_id);
      setMsgs((m) => [...m, r.data]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: `Error: ${e.response?.data?.detail || e.message}`, cache_status: "MISS", citations: [] }]);
    } finally { setBusy(false); }
  };

  if (!property) return (<div className="max-w-7xl mx-auto px-8 py-16 text-center"><div className="inline-block px-5 py-3 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm">Select a college to start chatting.</div></div>);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden" data-testid="chat-view">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center gap-3">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Model</div>
          <select value={model} onChange={(e)=>setModel(e.target.value)} data-testid="chat-model-select"
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:border-indigo-500 outline-none">
            {MODELS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <div className="ml-auto text-xs text-slate-500">{msgs.length} messages</div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50">
          <div className="max-w-3xl mx-auto space-y-5">
            {msgs.length === 0 && (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 grid place-items-center mx-auto mb-4">
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <div className="text-lg font-semibold text-slate-900" style={{fontFamily:"Cabinet Grotesk, Outfit, sans-serif"}}>Ask VidyaGPT anything about {property.name}</div>
                <div className="text-sm text-slate-500 mt-1">Answers are strictly grounded in your uploaded documents.</div>
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  {["What are the admission requirements?", "Tell me about the fee structure", "What courses are offered?"].map((s) => (
                    <button key={s} onClick={()=>setInput(s)} data-testid="suggested-prompt"
                      className="px-3 py-1.5 text-xs rounded-full bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 text-slate-600 transition">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={m.id || i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`} data-testid={`msg-${m.role}`}>
                <div className={`w-8 h-8 rounded-full grid place-items-center flex-shrink-0 ${m.role === "user" ? "bg-slate-900 text-white" : "bg-gradient-to-br from-indigo-500 to-cyan-400 text-white"}`}>
                  {m.role === "user" ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`flex-1 min-w-0 max-w-2xl ${m.role === "user" ? "flex justify-end" : ""}`}>
                  <div className={`inline-block rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200"}`}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm prose-slate max-w-none prose-headings:font-semibold prose-table:text-xs prose-th:bg-slate-50 prose-th:font-medium prose-td:border prose-td:border-slate-200 prose-th:border prose-th:border-slate-200 prose-th:p-2 prose-td:p-2 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:text-indigo-700 prose-code:before:content-none prose-code:after:content-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>
                  {m.role === "assistant" && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      {m.cache_status === "HIT" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><Zap className="w-3 h-3" />Cache HIT</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200"><Layers className="w-3 h-3" />Cache MISS</span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"><Cpu className="w-3 h-3" />{m.model || "n/a"}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"><Timer className="w-3 h-3" />{m.latency_ms}ms</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"><DollarSign className="w-3 h-3" />${(m.cost_usd||0).toFixed(4)}</span>
                      {(m.citations||[]).map((c, ci) => (
                        <button key={ci} onClick={()=>setShowObs(m)} data-testid="citation-badge"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100">
                          <FileText className="w-3 h-3" />{c.filename} p.{c.page}
                        </button>
                      ))}
                      <button onClick={()=>setShowObs(m)} data-testid="inspect-msg-btn"
                        className="text-indigo-600 hover:underline font-medium">Inspect</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 grid place-items-center"><Bot className="w-4 h-4 text-white" /></div><div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-500">Thinking…</div></div>}
            <div ref={endRef} />
          </div>
        </div>

        <form onSubmit={send} className="border-t border-slate-200 bg-white p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <input value={input} onChange={(e)=>setInput(e.target.value)} placeholder={`Ask about ${property.name}…`}
              data-testid="chat-input" disabled={busy}
              className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900" />
            <button type="submit" disabled={busy || !input.trim()} data-testid="chat-send-btn"
              className="px-5 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-medium flex items-center gap-2">
              <Send className="w-4 h-4" /> Send
            </button>
          </div>
        </form>
      </div>

      {showObs && (
        <aside className="w-96 flex-shrink-0 border-l border-slate-200 bg-white overflow-y-auto" data-testid="observability-drawer">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Response details</h3>
              <p className="text-xs text-slate-500">Full observability trace</p>
            </div>
            <button onClick={()=>setShowObs(null)} className="p-1 hover:bg-slate-100 rounded" data-testid="close-obs-btn"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-5 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Model" value={showObs.model} />
              <Metric label="Provider" value={showObs.provider} />
              <Metric label="Tokens in" value={showObs.tokens_in} />
              <Metric label="Tokens out" value={showObs.tokens_out} />
              <Metric label="Cost" value={`$${(showObs.cost_usd||0).toFixed(5)}`} />
              <Metric label="Latency" value={`${showObs.latency_ms}ms`} />
              <Metric label="Cache" value={showObs.cache_status} />
              <Metric label="Chunks" value={(showObs.retrieved_chunks||[]).length} />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-700 uppercase tracking-wide mb-2">Retrieved chunks</div>
              <div className="space-y-2">
                {(showObs.retrieved_chunks||[]).map((c, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span className="font-mono">{c.filename} p.{c.page}</span>
                      <span className="font-mono text-indigo-700">score {c.score}</span>
                    </div>
                    <div className="text-xs text-slate-700 leading-relaxed">{c.preview}…</div>
                  </div>
                ))}
                {(showObs.retrieved_chunks||[]).length === 0 && <div className="text-xs text-slate-500">No chunks retrieved (cache hit or no docs).</div>}
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

const Metric = ({label,value}) => (
  <div className="p-2 rounded bg-slate-50 border border-slate-200">
    <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    <div className="text-sm font-semibold text-slate-900 truncate">{value ?? "-"}</div>
  </div>
);
