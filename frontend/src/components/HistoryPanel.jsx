import { useState } from "react";

// Key metrics to show on each history card
const CARD_METRICS = [
  { key: "stability_score",   label: "Balance", unit: "",   lowerBetter: false },
  { key: "knee_symmetry_avg", label: "Symmetry",unit: "°",  lowerBetter: true  },
  { key: "knee_velocity_max", label: "Impact",  unit: "°/f",lowerBetter: true  },
  { key: "trunk_lean_avg",    label: "Lean",    unit: "°",  lowerBetter: true  },
];

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// A single session card in the history list
function SessionCard({ entry, onLoad, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const m = entry.metrics || {};
  const p = entry.profile  || {};

  return (
    <div className="bg-white/[0.025] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-colors duration-200">

      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-condensed text-sm tracking-wider uppercase text-white">
            {p.sport || "Unknown"}
          </p>
          <p className="font-body text-[0.65rem] text-white/30 mt-0.5">
            {formatDate(entry.date)} · {formatTime(entry.date)}
          </p>
          {p.video_info && p.video_info !== "None" && (
            <p className="font-body text-[0.65rem] text-white/25 mt-0.5 italic truncate max-w-[180px]">
              "{p.video_info}"
            </p>
          )}
        </div>
        <span className="font-condensed text-[0.55rem] tracking-widest uppercase border border-white/[0.08] text-white/30 px-2 py-0.5 rounded-full">
          {p.skill_level || "—"}
        </span>
      </div>

      {/* Metric chips */}
      <div className="grid grid-cols-4 gap-1.5 mb-4">
        {CARD_METRICS.map(({ key, label, unit }) => {
          const val = m[key];
          const display = val != null && !isNaN(val) ? val.toFixed(1) : "—";
          return (
            <div key={key} className="bg-white/[0.03] rounded-lg px-2 py-1.5 text-center">
              <p className="font-condensed text-[0.5rem] tracking-widest uppercase text-white/25 mb-0.5">{label}</p>
              <p className="font-display text-sm text-white/70">
                {display}
                <span className="font-body text-[0.55rem] text-white/25 ml-0.5">{unit}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onLoad(entry)}
          className="flex-1 py-2 rounded-lg bg-[#E8112D]/80 hover:bg-[#E8112D] text-white font-condensed text-xs tracking-widest uppercase transition-colors duration-200"
        >
          Load Report
        </button>
        {confirmDelete ? (
          <>
            <button
              onClick={() => { onDelete(entry.id); setConfirmDelete(false); }}
              className="py-2 px-3 rounded-lg bg-[#E8112D]/20 border border-[#E8112D]/40 text-[#E8112D] font-condensed text-[0.6rem] tracking-widest uppercase transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="py-2 px-3 rounded-lg border border-white/[0.08] text-white/30 font-condensed text-[0.6rem] tracking-widest uppercase transition-colors hover:border-white/20"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="py-2 px-3 rounded-lg border border-white/[0.06] hover:border-white/20 text-white/20 hover:text-white/40 font-condensed text-[0.6rem] tracking-widest uppercase transition-all duration-200"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}


// ── Main panel ────────────────────────────────────────────────────────────────

export default function HistoryPanel({ history, onLoad, onDelete, onClear, onClose }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [filter, setFilter] = useState("All");

  // Collect unique sports from history for filter tabs
  const sports = ["All", ...Array.from(new Set(history.map(e => e.profile?.sport).filter(Boolean)))];

  const filtered = filter === "All"
    ? history
    : history.filter(e => e.profile?.sport === filter);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#08111f] border-l border-white/[0.07] z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
          <div>
            <h2 className="font-display text-2xl tracking-[0.15em] text-white">HISTORY</h2>
            <p className="font-body text-xs text-white/30 mt-0.5">
              {history.length} session{history.length !== 1 ? "s" : ""} stored locally
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-white/[0.08] flex items-center justify-center text-white/30 hover:text-white hover:border-white/25 transition-all duration-200"
          >
            ✕
          </button>
        </div>

        {/* Sport filter tabs */}
        {sports.length > 2 && (
          <div className="flex gap-1.5 px-6 py-3 border-b border-white/[0.05] overflow-x-auto">
            {sports.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`flex-shrink-0 px-3 py-1 rounded-full font-condensed text-[0.6rem] tracking-widest uppercase transition-all duration-200 ${
                  filter === s
                    ? "bg-[#E8112D] text-white"
                    : "border border-white/[0.08] text-white/30 hover:border-white/20 hover:text-white/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mb-4">
                <span className="text-2xl opacity-40">📋</span>
              </div>
              <p className="font-condensed text-sm tracking-wider uppercase text-white/20">
                {filter === "All" ? "No sessions yet" : `No ${filter} sessions`}
              </p>
              <p className="font-body text-xs text-white/15 mt-1">
                Complete an analysis to see it here
              </p>
            </div>
          ) : (
            filtered.map(entry => (
              <SessionCard
                key={entry.id}
                entry={entry}
                onLoad={onLoad}
                onDelete={onDelete}
              />
            ))
          )}
        </div>

        {/* Footer — clear all */}
        {history.length > 0 && (
          <div className="px-6 py-4 border-t border-white/[0.07]">
            {confirmClear ? (
              <div className="flex items-center gap-3">
                <p className="font-body text-xs text-white/40 flex-1">Clear all {history.length} sessions?</p>
                <button
                  onClick={() => { onClear(); setConfirmClear(false); }}
                  className="font-condensed text-[0.6rem] tracking-widest uppercase text-[#E8112D] hover:text-[#ff4d6a] transition-colors"
                >
                  Clear all
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="font-condensed text-[0.6rem] tracking-widest uppercase text-white/25 hover:text-white/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="font-body text-xs text-white/20 hover:text-white/40 transition-colors"
              >
                Clear all history
              </button>
            )}
          </div>
        )}

      </div>
    </>
  );
}
