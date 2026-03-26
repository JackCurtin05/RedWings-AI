import "./App.css";
import { useState } from "react";
import VideoFeedback from "./components/VideoFeedback";
import Navbar from "./components/Navbar";
import ProfileForm from "./components/ProfileForm";
import Results from "./components/Results";
import HistoryPanel from "./components/HistoryPanel";
import cleanlogo from "./assets/cleanlogo.png";
import Field from "./components/Field";

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#E8112D] focus:bg-white/[0.08] transition-all duration-200 font-body text-sm";

// ── History helpers ───────────────────────────────────────────────────────────
const HISTORY_KEY = "redwings_history_v1";
const MAX_HISTORY = 25;

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addToHistory(result) {
  try {
    const prev = loadHistory();
    const entry = { id: Date.now().toString(), date: new Date().toISOString(), ...result };
    const updated = [entry, ...prev].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch { return loadHistory(); }
}

function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
  return [];
}

function deleteEntry(id) {
  const updated = loadHistory().filter(e => e.id !== id);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
  return updated;
}

// Find the most recent session for the same sport (for comparison)
function lastRunForSport(history, sport, excludeId) {
  return history.find(e => e.profile?.sport === sport && e.id !== excludeId) || null;
}


// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [step,        setStep]        = useState(0);
  const [profile,     setProfile]     = useState(null);
  const [result,      setResult]      = useState(null);
  const [videoInfo,   setVideoInfo]   = useState(null);
  const [history,     setHistory]     = useState(loadHistory);
  const [showHistory, setShowHistory] = useState(false);

  const handleProfileSave = (data) => {
    setProfile(data);
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResult = (data) => {
    const updated = addToHistory(data);
    setHistory(updated);
    setResult(data);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Load a historical result into the results view
  const handleLoadHistory = (entry) => {
    setResult(entry);
    setStep(2);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteEntry = (id) => setHistory(deleteEntry(id));
  const handleClearHistory = () => setHistory(clearHistory());

  // Previous run for the same sport (used for comparison deltas)
  const previousRun = result?.profile?.sport
    ? lastRunForSport(history, result.profile.sport, result.id)
    : null;

  return (
    <div className="min-h-screen bg-[#060D18] text-white flex flex-col">

      <Navbar
        currentStep={step}
        onStepClick={(i) => i < step && setStep(i)}
        historyCount={history.length}
        onHistoryOpen={() => setShowHistory(true)}
      />

      {/* ── History panel ── */}
      {showHistory && (
        <HistoryPanel
          history={history}
          onLoad={handleLoadHistory}
          onDelete={handleDeleteEntry}
          onClear={handleClearHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* ── Step 0: Landing + Profile ── */}
      {step === 0 && (
        <>
          {/* Hero */}
          <section className="relative pt-40 pb-20 px-6 text-center overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-80 bg-[#E8112D] opacity-[0.09] blur-[120px] rounded-full pointer-events-none" />
            <div className="relative max-w-3xl mx-auto">
              <img src={cleanlogo} alt="RedWings AI" className="h-35 mx-auto mb-8 object-contain opacity-90" />
              <p className="font-condensed text-[1.5rem] tracking-[0.45em] uppercase text-[#E8112D] mb-5">
                ★ AI-Powered · Extreme Sports ★
              </p>
              <h1 className="font-display text-[clamp(3.5rem,10vw,7rem)] tracking-[0.06em] leading-[0.95] text-white mb-6">
                PUSH YOUR <span className="text-[#E8112D]">LIMITS</span><br />SAFELY
              </h1>
              <p className="font-body text-white/40 text-base leading-relaxed max-w-md mx-auto mb-10">
                Upload your trick footage. Get elite biomechanical analysis
                and AI coaching built for athletes who don't hold back.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {["Pose Detection", "Injury Risk", "Form Corrections", "AI Coaching"].map((f) => (
                  <span key={f} className="font-condensed text-[0.9rem] tracking-[0.25em] uppercase border border-white/[0.07] text-white/35 px-4 py-1.5 rounded-full">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="flex items-center gap-3 max-w-sm mx-auto w-full px-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#E8112D]/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#E8112D] shadow-[0_0_10px_rgba(232,17,45,0.6)]" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#E8112D]/40" />
          </div>

          {/* Recent sessions strip (if history exists) */}
          {history.length > 0 && (
            <section className="max-w-2xl mx-auto w-full px-6 pt-4 pb-0">
              <div className="flex items-center justify-between mb-3">
                <p className="font-condensed text-[0.6rem] tracking-[0.3em] uppercase text-white/25">Recent Sessions</p>
                <button
                  onClick={() => setShowHistory(true)}
                  className="font-condensed text-[0.6rem] tracking-[0.25em] uppercase text-white/25 hover:text-white/50 transition-colors"
                >
                  View all →
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {history.slice(0, 5).map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => handleLoadHistory(entry)}
                    className="flex-shrink-0 bg-white/[0.025] border border-white/[0.07] hover:border-[#E8112D]/30 rounded-xl px-4 py-3 text-left transition-colors duration-200 min-w-[140px]"
                  >
                    <p className="font-condensed text-xs tracking-wider uppercase text-white/70 mb-1">
                      {entry.profile?.sport || "Unknown"}
                    </p>
                    <p className="font-body text-[0.65rem] text-white/30">
                      {new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                    {entry.metrics?.stability_score != null && (
                      <p className="font-display text-base text-white/50 mt-1">
                        {entry.metrics.stability_score.toFixed(0)}
                        <span className="font-body text-[0.6rem] text-white/25 ml-0.5">bal</span>
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Profile form */}
          <section className="max-w-2xl mx-auto w-full px-6 py-20">
            <span className="font-condensed text-[1.8rem] tracking-[0.4em] uppercase text-[#E8112D] block mb-1">
              Step 01
            </span>
            <h2 className="font-display text-[clamp(2rem,5vw,3rem)] tracking-[0.12em] text-white mb-2">
              ATHLETE PROFILE
            </h2>
            <p className="font-body text-white/40 text-sm leading-relaxed max-w-lg mb-8 text-center mx-auto text-[0.9rem]">
              Tell us about your body and experience so the AI can tailor its analysis to you.
            </p>
            <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-5 hover:border-[#E8112D]/25 transition-colors duration-300">
              <ProfileForm onSubmit={handleProfileSave} />
            </div>
          </section>
        </>
      )}

      {/* ── Step 1: Upload ── */}
      {step === 1 && (
        <section className="max-w-3xl mx-auto w-full px-6 pt-28 pb-20">
          <span className="font-condensed text-[1.8rem] tracking-[0.4em] uppercase text-[#E8112D] block mb-1">
            Step 02
          </span>
          <h2 className="font-display text-[clamp(2rem,5vw,3rem)] tracking-[0.12em] text-white mb-2">
            ANALYZE YOUR MOVEMENT
          </h2>
          <p className="font-body text-white/40 text-sm leading-relaxed max-w-lg mb-8 text-center mx-auto">
            Drop in a video of your trick or training run. Our computer vision pipeline
            extracts joint angles and impact data — then our AI coach turns it into actionable advice.
          </p>

          {/* Profile summary badge */}
          {profile && (
            <div className="flex items-center justify-between bg-white/[0.04] border border-white/[0.07] rounded-xl px-5 py-3 mb-6">
              <div>
                <p className="font-condensed text-sm tracking-wider uppercase text-white">
                  {profile.sport} · {profile.skill_level}
                </p>
                <p className="font-body text-xs text-white/40 mt-0.5">
                  Age {profile.age} · {profile.height_ft}'{profile.height_in}" · {profile.weight_lbs}lbs · {profile.training_hours}hrs/wk
                </p>
              </div>
            </div>
          )}

          <Field label="Video Description">
            <textarea
              placeholder="e.g. Performing a 10ft jump..."
              onChange={(e) => setVideoInfo(e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>

          <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-10 hover:border-[#E8112D]/25 transition-colors duration-300">
            <VideoFeedback profile={profile} onResult={handleResult} videoInfo={videoInfo} />
          </div>

          {/* How it works */}
          <div className="mt-16">
            <h3 className="font-display text-sm text-[1.5rem] tracking-[0.4em] text-white/30 text-center mb-8">
              HOW IT WORKS
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-white/[0.07] border border-white/[0.07] rounded-2xl overflow-hidden">
              {[
                { n: "01", icon: "🎬", label: "Upload",  desc: "Submit a video of your trick or training session" },
                { n: "02", icon: "🦴", label: "Detect",  desc: "MediaPipe extracts pose and joint angles frame by frame" },
                { n: "03", icon: "⚡", label: "Analyze", desc: "Risk engine scores your form and flags asymmetries" },
                { n: "04", icon: "🎯", label: "Coach",   desc: "GPT-4o generates personalized corrections and drills" },
              ].map(({ n, icon, label, desc }) => (
                <div key={n} className="bg-[#0b1525] hover:bg-[#E8112D]/[0.04] transition-colors duration-200 p-6 flex flex-col gap-2">
                  <span className="font-display text-xs tracking-[0.2em] text-[#E8112D]">{n}</span>
                  <span className="text-2xl">{icon}</span>
                  <p className="font-condensed text-xs tracking-[0.15em] uppercase text-white font-semibold">{label}</p>
                  <p className="font-body text-[1.0rem] text-xs text-white/35 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Step 2: Results ── */}
      {step === 2 && result && (
        <Results
          result={result}
          previousRun={previousRun}
          onReset={() => { setStep(1); setResult(null); }}
        />
      )}

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-white/[0.07] py-10 text-center">
        <p className="font-condensed text-[0.55rem] tracking-[0.45em] uppercase text-white/15">
          RedWings AI · IrvineHacks 2026 · Powered by MediaPipe + OpenAI
        </p>
      </footer>

    </div>
  );
}

export default App;
