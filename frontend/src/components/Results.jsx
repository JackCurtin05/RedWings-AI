import { useState } from "react";

// ── Reference ranges ──────────────────────────────────────────────────────────
// Each entry: good/warn thresholds + whether lower or higher is better.
// Values outside the warn band are flagged as danger.
const RANGES = {
  knee_angle_avg:        { good: [115, 162], warn: [95, 170],  label: "Knee Angle Avg",        unit: "°",    hint: "Athletic stance range" },
  knee_angle_min:        { good: [80,  180], warn: [65, 180],  label: "Knee Angle Min",        unit: "°",    hint: "Deepest compression" },
  knee_angle_max:        { good: [0,   172], warn: [0,  178],  label: "Knee Angle Max",        unit: "°",    hint: "Most extended position" },
  knee_symmetry_avg:     { good: [0,    11], warn: [0,   22],  label: "Knee Symmetry",         unit: "°",    hint: "L-R difference · lower = better", lowerBetter: true },
  hip_angle_avg:         { good: [110, 162], warn: [90, 170],  label: "Hip Angle Avg",         unit: "°",    hint: "Hip joint average" },
  knee_velocity_max:     { good: [0,    22], warn: [0,   38],  label: "Impact Velocity",       unit: "°/f",  hint: "Hard landing detector · lower = better", lowerBetter: true },
  trunk_lean_avg:        { good: [0,    25], warn: [0,   40],  label: "Trunk Lean Avg",        unit: "°",    hint: "Forward lean from vertical · lower = better", lowerBetter: true },
  trunk_lean_max:        { good: [0,    35], warn: [0,   55],  label: "Trunk Lean Max",        unit: "°",    hint: "Peak lean angle", lowerBetter: true },
  shoulder_symmetry_avg: { good: [0,  0.04], warn: [0, 0.08], label: "Shoulder Level",        unit: "",     hint: "Height difference · lower = better", lowerBetter: true, decimals: 3 },
  stability_score:       { good: [65,  100], warn: [38,  100], label: "Balance Score",         unit: "",     hint: "CoM stability · higher = better" },
  stance_width_avg:      { good: [0.1, 0.6], warn: [0.05, 0.7],label: "Stance Width",         unit: "",     hint: "Foot spread (normalized)" },
  arm_spread_avg:        { good: [0,    1],  warn: [0,    1],  label: "Arm Spread",            unit: "",     hint: "Wrist-to-wrist distance" },
};

function getStatus(key, value) {
  if (value === null || value === undefined || isNaN(value)) return "none";
  const r = RANGES[key];
  if (!r) return "none";
  const inGood = value >= r.good[0] && value <= r.good[1];
  const inWarn = value >= r.warn[0] && value <= r.warn[1];
  if (inGood) return "good";
  if (inWarn) return "warn";
  return "danger";
}

const STATUS_STYLES = {
  good:   { card: "bg-emerald-500/[0.06] border-emerald-500/20", dot: "bg-emerald-400", val: "text-emerald-300" },
  warn:   { card: "bg-amber-500/[0.07]   border-amber-500/25",   dot: "bg-amber-400",   val: "text-amber-300"   },
  danger: { card: "bg-[#E8112D]/[0.08]   border-[#E8112D]/30",   dot: "bg-[#E8112D]",   val: "text-[#ff4d6a]"   },
  none:   { card: "bg-white/[0.03]       border-white/[0.07]",   dot: "bg-white/20",    val: "text-white"        },
};

// ── Delta helper ─────────────────────────────────────────────────────────────
// Returns { diff, improved } or null if not meaningful.
function getDelta(key, current, prev) {
  if (current == null || prev == null || isNaN(current) || isNaN(prev)) return null;
  const diff = current - prev;
  if (Math.abs(diff) < 0.3) return null; // noise threshold
  const r = RANGES[key];
  if (!r) return null;
  // lowerBetter: improvement = diff < 0. Otherwise improvement = diff > 0.
  const improved = r.lowerBetter ? diff < 0 : diff > 0;
  return { diff, improved };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ metricKey, value, prevValue }) {
  const r      = RANGES[metricKey] || {};
  const status = getStatus(metricKey, value);
  const s      = STATUS_STYLES[status];
  const dec    = r.decimals ?? 1;
  const display = (value !== null && value !== undefined && !isNaN(value))
    ? value.toFixed(dec)
    : "—";
  const delta = prevValue !== undefined ? getDelta(metricKey, value, prevValue) : null;

  return (
    <div className={`rounded-xl p-4 border transition-colors duration-200 ${s.card}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-condensed text-[0.5rem] tracking-[0.2em] uppercase text-white/30 leading-tight">
          {r.label || metricKey}
        </p>
        <div className="flex items-center gap-1.5">
          {delta && (
            <span className={`font-body text-[0.58rem] font-semibold ${delta.improved ? "text-emerald-400" : "text-[#ff4d6a]"}`}>
              {delta.improved ? "↑" : "↓"} {Math.abs(delta.diff).toFixed(dec)}{r.unit}
            </span>
          )}
          {status !== "none" && (
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
          )}
        </div>
      </div>
      <p className={`font-display text-2xl ${s.val}`}>
        {display}
        {r.unit && <span className="text-xs text-white/30 ml-0.5">{r.unit}</span>}
      </p>
      {r.hint && (
        <p className="font-body text-[0.6rem] text-white/20 mt-1 leading-tight">{r.hint}</p>
      )}
    </div>
  );
}

function BulletList({ items, icon, iconClass }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm font-body text-white/70 leading-relaxed">
          <span className={`mt-0.5 flex-shrink-0 text-xs ${iconClass}`}>{icon}</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="font-condensed text-[1.1rem] tracking-[0.3em] uppercase text-white/40 mb-3">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="h-px bg-white/[0.07]" />;
}

// Sparkline chart using inline SVG
function Sparkline({ series, label, unit = "°", color = "#E8112D" }) {
  if (!series?.length) return null;
  const valid = series.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (valid.length < 3) return null;

  const min   = Math.min(...valid);
  const max   = Math.max(...valid);
  const range = max - min || 1;
  const W = 200, H = 48, pad = 4;
  const iW = W - pad * 2, iH = H - pad * 2;

  const points = series
    .map((v, i) => {
      if (v === null || v === undefined || isNaN(v)) return null;
      const x = pad + (i / (series.length - 1)) * iW;
      const y = pad + (1 - (v - min) / range) * iH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
      <p className="font-condensed text-[0.55rem] tracking-[0.2em] uppercase text-white/30 mb-2">{label}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 48 }}>
        {/* Zero-guide line at 90° (deep compression warning) */}
        {unit === "°" && min < 90 && max > 90 && (
          <line
            x1={pad} y1={pad + (1 - (90 - min) / range) * iH}
            x2={W - pad} y2={pad + (1 - (90 - min) / range) * iH}
            stroke="rgba(251,191,36,0.25)" strokeWidth="0.8" strokeDasharray="3 3"
          />
        )}
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between mt-1">
        <span className="font-body text-[0.58rem] text-white/20">{min.toFixed(0)}{unit}</span>
        <span className="font-body text-[0.58rem] text-white/20">{max.toFixed(0)}{unit}</span>
      </div>
    </div>
  );
}

// Movement phase breakdown stacked bar
function PhaseSummary({ phases }) {
  if (!phases?.length) return null;

  const counts = phases.reduce((acc, { phase }) => {
    acc[phase] = (acc[phase] || 0) + 1;
    return acc;
  }, {});
  const total = phases.length;

  const PHASE_META = {
    extended:          { color: "#4ade80", label: "Extended"          },
    athletic_stance:   { color: "#60a5fa", label: "Athletic Stance"   },
    knee_compression:  { color: "#facc15", label: "Knee Compression"  },
    hip_hinge:         { color: "#fb923c", label: "Hip Hinge"         },
    deep_compression:  { color: "#f87171", label: "Deep Compression"  },
    arms_tucked:       { color: "#c084fc", label: "Arms Tucked"       },
    unknown:           { color: "#ffffff22", label: "Low Confidence"  },
  };

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <SectionLabel>Movement Phases</SectionLabel>
      <div className="flex h-2.5 rounded-full overflow-hidden mb-4 gap-px">
        {entries.map(([phase, count]) => (
          <div
            key={phase}
            style={{ width: `${(count / total) * 100}%`, background: PHASE_META[phase]?.color || "#888" }}
            title={`${PHASE_META[phase]?.label || phase}: ${Math.round((count / total) * 100)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {entries.map(([phase, count]) => (
          <div key={phase} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PHASE_META[phase]?.color || "#888" }} />
            <span className="font-body text-[0.68rem] text-white/35">
              {PHASE_META[phase]?.label || phase} {Math.round((count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Parse bullet-formatted conditioning text into lines
function parseConditioningLines(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map(line => line.replace(/^[\s\u2022\-\*•]+/, "").trim())
    .filter(Boolean);
}

// Risk summary banner — only shown if there are real concerns
function RiskBanner({ metrics }) {
  const flags = [];
  if (metrics?.knee_symmetry_avg > 15)  flags.push("Knee asymmetry detected — possible imbalance or compensation pattern");
  if (metrics?.knee_velocity_max > 35)  flags.push("High impact velocity — hard landing or abrupt deceleration detected");
  if (metrics?.trunk_lean_max > 45)     flags.push("Extreme trunk lean — increased spinal load risk");
  if (metrics?.stability_score < 40)    flags.push("Low balance score — centre of mass moving significantly during the clip");
  if (metrics?.pose_coverage < 0.5)     flags.push("Low pose confidence — results may be less accurate (ensure full body is visible)");

  if (!flags.length) return null;

  return (
    <div className="bg-[#E8112D]/[0.07] border border-[#E8112D]/20 rounded-xl px-5 py-4 mb-1">
      <p className="font-condensed text-[0.6rem] tracking-[0.25em] uppercase text-[#E8112D] mb-2">Risk Flags</p>
      <ul className="space-y-1.5">
        {flags.map((f, i) => (
          <li key={i} className="flex items-start gap-2 font-body text-xs text-white/60">
            <span className="text-[#E8112D] mt-0.5 flex-shrink-0">▸</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Video analysis metadata bar
function VideoMetaBar({ meta }) {
  if (!meta) return null;
  const coverage = meta.coverage != null ? Math.round(meta.coverage * 100) : null;
  return (
    <div className="flex flex-wrap gap-4 bg-white/[0.02] border border-white/[0.06] rounded-xl px-5 py-3 text-center">
      {[
        { label: "Duration",  value: meta.duration_sec != null ? `${meta.duration_sec.toFixed(1)}s` : "—" },
        { label: "Frames Analyzed", value: meta.analyzed_frames ?? "—" },
        { label: "Pose Coverage",   value: coverage != null ? `${coverage}%` : "—",
          color: coverage != null ? (coverage > 70 ? "text-emerald-400" : coverage > 40 ? "text-amber-400" : "text-[#ff4d6a]") : "" },
        { label: "FPS",       value: meta.fps != null ? `${meta.fps}` : "—" },
      ].map(({ label, value, color }) => (
        <div key={label} className="flex-1 min-w-[70px]">
          <p className="font-condensed text-[0.5rem] tracking-widest uppercase text-white/25 mb-0.5">{label}</p>
          <p className={`font-display text-base ${color || "text-white/70"}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}


// ── Main Results component ────────────────────────────────────────────────────

export default function Results({ result, previousRun, onReset }) {
  const { coaching, metrics, profile, video_meta } = result;
  const [showAllMetrics, setShowAllMetrics] = useState(false);
  const conditioningLines = parseConditioningLines(coaching?.conditioning);
  const prevMetrics = previousRun?.metrics || null;

  return (
    <section className="max-w-3xl mx-auto w-full px-6 pt-28 pb-20">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <span className="font-condensed text-[0.6rem] tracking-[0.4em] uppercase text-[#E8112D] block mb-1">Step 03</span>
          <h2 className="font-display text-[clamp(2rem,5vw,3rem)] tracking-[0.12em] text-white">YOUR REPORT</h2>
          {profile && (
            <p className="font-condensed text-xs tracking-wider text-white/30 mt-1 uppercase">
              {profile.sport} · {profile.skill_level}
            </p>
          )}
        </div>
        <button
          onClick={onReset}
          className="font-condensed text-[0.6rem] tracking-widest uppercase text-white/30 hover:text-white transition-colors mt-2"
        >
          ↩ Analyze another
        </button>
      </div>

      {/* Video metadata */}
      <VideoMetaBar meta={video_meta} />

      <div className="mt-4 bg-white/[0.025] border border-white/[0.07] rounded-2xl p-8 space-y-7">

        {/* Risk banner */}
        <RiskBanner metrics={metrics} />

        {/* Overall assessment */}
        <div>
          <SectionLabel>Overall Assessment</SectionLabel>
          <p className="font-body text-white/70 text-sm leading-relaxed">{coaching?.overall_assessment}</p>
        </div>

        <Divider />

        {/* Coaching grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <div>
            <SectionLabel>Form Corrections</SectionLabel>
            <BulletList items={coaching?.form_corrections} icon="▸" iconClass="text-[#E8112D]" />
          </div>
          <div>
            <SectionLabel>Safety Warnings</SectionLabel>
            <BulletList items={coaching?.safety_warnings} icon="⚠" iconClass="text-amber-400" />
          </div>
          <div>
            <SectionLabel>Recommended Drills</SectionLabel>
            <BulletList items={coaching?.drills} icon="▸" iconClass="text-[#E8112D]" />
          </div>
          <div>
            <SectionLabel>Conditioning Focus</SectionLabel>
            {conditioningLines.length > 0 ? (
              <ul className="space-y-2">
                {conditioningLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm font-body text-white/70 leading-relaxed">
                    <span className="mt-0.5 flex-shrink-0 text-xs text-white/30">·</span>
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm font-body text-white/70 leading-relaxed">{coaching?.conditioning}</p>
            )}
          </div>
        </div>

        <Divider />

        {/* Sparkline charts */}
        {(metrics?.knee_angle_series || metrics?.hip_angle_series || metrics?.trunk_lean_series) && (
          <>
            <div>
              <SectionLabel>Angle Timeline</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Sparkline series={metrics.knee_angle_series}  label="Knee Angle"  unit="°" color="#E8112D" />
                <Sparkline series={metrics.hip_angle_series}   label="Hip Angle"   unit="°" color="#60a5fa" />
                <Sparkline series={metrics.trunk_lean_series}  label="Trunk Lean"  unit="°" color="#fb923c" />
              </div>
              <p className="font-body text-[0.62rem] text-white/20 mt-2 text-right">
                Left → right represents time through the clip
              </p>
            </div>
            <Divider />
          </>
        )}

        {/* Metrics grid — primary */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-baseline gap-3">
              <SectionLabel>Biomechanical Metrics</SectionLabel>
              {prevMetrics && (
                <span className="font-body text-[0.6rem] text-white/25">
                  ↑↓ vs last {profile?.sport} run
                </span>
              )}
            </div>
            <button
              onClick={() => setShowAllMetrics(v => !v)}
              className="font-condensed text-[0.55rem] tracking-widest uppercase text-white/25 hover:text-white/50 transition-colors"
            >
              {showAllMetrics ? "Show less" : "Show all"}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <MetricCard metricKey="knee_angle_avg"    value={metrics?.knee_angle_avg}    prevValue={prevMetrics?.knee_angle_avg} />
            <MetricCard metricKey="knee_angle_min"    value={metrics?.knee_angle_min}    prevValue={prevMetrics?.knee_angle_min} />
            <MetricCard metricKey="knee_symmetry_avg" value={metrics?.knee_symmetry_avg} prevValue={prevMetrics?.knee_symmetry_avg} />
            <MetricCard metricKey="knee_velocity_max" value={metrics?.knee_velocity_max} prevValue={prevMetrics?.knee_velocity_max} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard metricKey="hip_angle_avg"         value={metrics?.hip_angle_avg}         prevValue={prevMetrics?.hip_angle_avg} />
            <MetricCard metricKey="trunk_lean_avg"        value={metrics?.trunk_lean_avg}        prevValue={prevMetrics?.trunk_lean_avg} />
            <MetricCard metricKey="stability_score"       value={metrics?.stability_score}       prevValue={prevMetrics?.stability_score} />
            <MetricCard metricKey="shoulder_symmetry_avg" value={metrics?.shoulder_symmetry_avg} prevValue={prevMetrics?.shoulder_symmetry_avg} />
          </div>

          {/* Extended metrics (toggle) */}
          {showAllMetrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <MetricCard metricKey="knee_angle_max"   value={metrics?.knee_angle_max}   prevValue={prevMetrics?.knee_angle_max} />
              <MetricCard metricKey="hip_angle_min"    value={metrics?.hip_angle_min}    prevValue={prevMetrics?.hip_angle_min} />
              <MetricCard metricKey="trunk_lean_max"   value={metrics?.trunk_lean_max}   prevValue={prevMetrics?.trunk_lean_max} />
              <MetricCard metricKey="stance_width_avg" value={metrics?.stance_width_avg} prevValue={prevMetrics?.stance_width_avg} />
              <MetricCard metricKey="arm_spread_avg"   value={metrics?.arm_spread_avg}   prevValue={prevMetrics?.arm_spread_avg} />
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 justify-end">
            {[["bg-emerald-400","Good"], ["bg-amber-400","Watch"], ["bg-[#E8112D]","Flag"]].map(([bg, lbl]) => (
              <div key={lbl} className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${bg}`} />
                <span className="font-body text-[0.6rem] text-white/25">{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Movement phases */}
        {metrics?.trick_phases?.length > 0 && (
          <>
            <Divider />
            <PhaseSummary phases={metrics.trick_phases} />
          </>
        )}

      </div>
    </section>
  );
}
