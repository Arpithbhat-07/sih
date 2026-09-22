import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Send,
  ArrowUpRight,
  Database,
  User,
  ShieldAlert,
  AlertTriangle,
  Info,
  ExternalLink,
} from 'lucide-react';
import { Logo } from '../components/common/Logo';
import { SUGGESTED_PROMPTS, askSentinel, investigateHighestRisk } from '../services/aiEngine';

const PROMPT_CARDS = SUGGESTED_PROMPTS;

export default function SentinelAI() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || thinking) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setThinking(true);
    try {
      const res = await askSentinel(q);
      setMessages((m) => [...m, { role: 'assistant', ...res }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          title: 'Query Exception',
          answer: `An error occurred while evaluating the query: ${err?.message || err}. Please retry or check server status.`,
          disclaimer:
            'Analytical signals do not constitute proof of fraud or misconduct. Final assessment requires authorized human investigation.',
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const handleInvestigateHighestRisk = async () => {
    if (thinking) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: 'Explain the highest-risk project.' }]);
    setThinking(true);
    try {
      const res = await investigateHighestRisk();
      setMessages((m) => [...m, { role: 'assistant', ...res }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          title: 'Investigation Error',
          answer: `Could not retrieve highest risk project: ${err?.message || err}.`,
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header with Prominent Shortcut */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-ai/10 border border-ai/30 flex items-center justify-center">
            <Sparkles size={18} className="text-ai" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#EDEDED]">Sentinel AI</h1>
            <p className="text-xs text-[#A0A5B0]">
              Grounded analytical assistant for MPLADS works, expenditure signals, and risk patterns.
            </p>
          </div>
        </div>

        {/* Prominent Quick Action Button */}
        <button
          onClick={handleInvestigateHighestRisk}
          disabled={thinking}
          className="px-3 py-2 rounded-md bg-[#EE4444]/15 border border-[#EE4444]/40 hover:bg-[#EE4444]/25 text-[#EE4444] text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          data-testid="investigate-highest-risk-btn"
        >
          <ShieldAlert size={14} className="animate-pulse" />
          <span>Investigate Highest Risk</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-4"
        data-testid="ai-messages"
      >
        {empty ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
            <Logo size={44} />
            <h2 className="text-lg font-semibold text-[#EDEDED] mt-4">
              How can I help you investigate?
            </h2>
            <p className="text-sm text-[#737987] mt-1 max-w-md">
              Sentinel AI queries live multi-signal analytics (costs, timelines, duplicates, agencies)
              across 3,000 synthetic MPLADS records.
            </p>

            {/* Featured shortcut banner */}
            <div className="w-full max-w-3xl mt-6 p-3 rounded-lg border border-[#EE4444]/30 bg-[#EE4444]/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-8 h-8 rounded-md bg-[#EE4444]/20 border border-[#EE4444]/40 flex items-center justify-center text-[#EE4444] shrink-0">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#EDEDED]">
                    High-Priority Investigation Shortcut
                  </div>
                  <div className="text-[11px] text-[#A0A5B0]">
                    Inspect the highest composite risk project (W-11261, Score: 84/100) with complete dossier.
                  </div>
                </div>
              </div>
              <button
                onClick={handleInvestigateHighestRisk}
                className="px-3 py-1.5 rounded-md bg-[#EE4444] text-white text-xs font-semibold hover:bg-[#EE4444]/90 transition-colors shrink-0 ml-3"
              >
                Inspect Now
              </button>
            </div>

            {/* Suggested Question Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-4 w-full max-w-3xl">
              {PROMPT_CARDS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => send(p.text)}
                  className="text-left p-3 rounded-md border border-hairline bg-surface hover:border-ai/40 hover:bg-[#15181E] transition-all group"
                  data-testid={`prompt-${p.label.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#EDEDED]">{p.label}</span>
                    <ArrowUpRight
                      size={13}
                      className="text-[#737987] group-hover:text-ai transition-colors"
                    />
                  </div>
                  <span className="text-[11px] text-[#737987] mt-1 block leading-relaxed">
                    {p.description || p.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => <Message key={i} m={m} navigate={navigate} />)
        )}

        {thinking && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-ai/10 border border-ai/30 flex items-center justify-center shrink-0">
              <Sparkles size={15} className="text-ai" />
            </div>
            <div className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-surface border border-hairline">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="w-1.5 h-1.5 rounded-full bg-ai animate-bounce"
                  style={{ animationDelay: `${d * 0.15}s` }}
                />
              ))}
              <span className="text-[11px] text-[#A0A5B0] ml-1">
                Sentinel is retrieving analytical evidence…
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 pt-2 border-t border-hairline/60">
        {!empty && (
          <div className="flex flex-wrap gap-2 mb-2.5">
            {PROMPT_CARDS.slice(0, 4).map((p) => (
              <button
                key={p.label}
                onClick={() => send(p.text)}
                className="text-[11px] px-2.5 py-1 rounded-md border border-hairline bg-surface text-[#A0A5B0] hover:text-[#EDEDED] hover:border-ai/40 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 h-11 px-3 rounded-lg bg-surface border border-hairline focus-within:border-ai/50 transition-colors">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask about W-11261, critical works, risky states, duplicate works, or review priorities…"
            className="flex-1 bg-transparent text-sm text-[#EDEDED] placeholder:text-[#5C616D] outline-none"
            data-testid="ai-input"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || thinking}
            className="w-8 h-8 rounded-md bg-ai/90 hover:bg-ai flex items-center justify-center text-white disabled:opacity-40 transition-colors"
            data-testid="ai-send"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="text-[10px] text-[#5C616D] text-center mt-2">
          Responses are strictly grounded in 3,000 verified MPLADS demonstration records. Analytical signals do not constitute proof of fraud or misconduct.
        </p>
      </div>
    </div>
  );
}

function Message({ m, navigate }) {
  if (m.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 justify-end"
      >
        <div className="max-w-[80%] rounded-lg rounded-tr-sm bg-[#16191E] border border-hairline px-3.5 py-2.5 text-sm text-[#EDEDED]">
          {m.text}
        </div>
        <div className="w-8 h-8 rounded-md bg-[#1B2130] border border-hairline flex items-center justify-center shrink-0 text-brand">
          <User size={15} />
        </div>
      </motion.div>
    );
  }

  const isCritical = m.riskTier === 'CRITICAL' || m.title?.includes('CRITICAL');
  const isHigh = m.riskTier === 'HIGH' || m.title?.includes('HIGH');

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
      data-testid="assistant-message"
    >
      <div className="w-8 h-8 rounded-md bg-ai/10 border border-ai/30 flex items-center justify-center shrink-0">
        <Sparkles size={15} className="text-ai" />
      </div>
      <div className="max-w-[88%] space-y-2.5">
        {/* Main Response Box */}
        <div className="rounded-lg rounded-tl-sm bg-surface border border-hairline px-4 py-3.5">
          {/* Header Bar */}
          {m.title && (
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-hairline/60">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
                    isCritical
                      ? 'bg-[#EE4444]/20 text-[#EE4444] border border-[#EE4444]/40'
                      : isHigh
                      ? 'bg-[#E5A93C]/20 text-[#E5A93C] border border-[#E5A93C]/40'
                      : 'bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40'
                  }`}
                >
                  {m.riskTier || (isCritical ? 'CRITICAL' : 'ANALYTICAL INTELLIGENCE')}
                </span>
                <span className="text-xs font-semibold text-[#EDEDED]">{m.title}</span>
              </div>
              {m.riskScore !== undefined && m.riskScore !== null && (
                <div className="flex items-center gap-1 font-mono text-xs font-semibold text-[#EDEDED]">
                  <span className="text-[#A0A5B0]">Risk:</span>
                  <span className={m.riskScore >= 80 ? 'text-[#EE4444]' : 'text-[#E5A93C]'}>
                    {m.riskScore}/100
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Formatted Content */}
          <p className="text-sm text-[#C9CDD6] whitespace-pre-line leading-relaxed font-sans">
            {m.answer}
          </p>

          {/* Action Button if workId or evidence URL exists */}
          {m.workId && (
            <div className="mt-3.5 pt-2.5 border-t border-hairline/60 flex items-center gap-2">
              <button
                onClick={() => navigate(`/works/${m.workId}`)}
                className="text-xs px-3 py-1.5 rounded-md bg-brand/15 border border-brand/40 text-brand hover:bg-brand/25 transition-colors inline-flex items-center gap-1.5 font-medium"
                data-testid={`open-dossier-${m.workId}`}
              >
                Open {m.workId} Investigation Dossier
                <ArrowUpRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Data Signals Strip */}
        {m.signals && m.signals.length > 0 && (
          <div className="rounded-md border border-divider bg-[#0D0F12] px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#737987] mb-1.5">
              <Database size={11} /> Analytical Signals
            </div>
            <div className="flex flex-wrap gap-1.5">
              {m.signals.map((s, i) => (
                <span
                  key={i}
                  className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#16191E] border border-divider text-[#A0A5B0]"
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Evidence & Provenance Bar */}
        {m.evidence && (
          <div className="flex items-center justify-between text-[11px] text-[#737987] px-2">
            <div className="flex items-center gap-1.5">
              <Info size={11} />
              <span>
                Source: <strong className="text-[#A0A5B0]">{m.evidence.source}</strong> ({m.evidence.dataset})
              </span>
            </div>
            {m.evidence.url && (
              <button
                onClick={() => navigate(m.evidence.url)}
                className="text-brand hover:text-white inline-flex items-center gap-1 transition-colors"
              >
                View Evidence <ExternalLink size={11} />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
