import { useState, useEffect } from "react";
import Field from "./Field";

const SPORTS = ["Snowboarding", "Skateboarding", "BMX", "Skiing", "Parkour", "Surfing", "Motocross", "Rock Climbing", "Wingsuiting", "Other"];
const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Pro"];
const STORAGE_KEY  = "redwings_profile_v1";

const DEFAULTS = {
  sport: "Snowboarding",
  skill_level: "Intermediate",
  age: "",
  height_ft: "",
  height_in: "",
  weight_lbs: "",
  training_hours: 5,
  injury_history: "",
};

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#E8112D] focus:bg-white/[0.08] transition-all duration-200 font-body text-sm";

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default function ProfileForm({ onSubmit }) {
  const [form,      setForm]      = useState(loadSaved);
  const [restored,  setRestored]  = useState(() => !!localStorage.getItem(STORAGE_KEY));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); } catch {}
    onSubmit(form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Sport */}
      <Field label="Sport">
        <div className="flex flex-wrap gap-2">
          {SPORTS.map((s) => (
            <button
              key={s} type="button"
              onClick={() => set("sport", s)}
              className={`px-4 py-2 rounded-lg text-sm font-condensed tracking-wider uppercase transition-all duration-200 border ${
                form.sport === s
                  ? "bg-[#E8112D] border-[#E8112D] text-white shadow-[0_0_12px_rgba(232,17,45,0.35)]"
                  : "bg-white/5 border-white/10 text-white/60 hover:border-white/30 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>

      {/* Skill level */}
      <Field label="Skill Level">
        <div className="grid grid-cols-4 gap-2">
          {SKILL_LEVELS.map((lvl) => (
            <button
              key={lvl} type="button"
              onClick={() => set("skill_level", lvl)}
              className={`py-3 rounded-lg text-sm font-condensed tracking-wider uppercase transition-all duration-200 border ${
                form.skill_level === lvl
                  ? "bg-[#E8112D] border-[#E8112D] text-white shadow-[0_0_12px_rgba(232,17,45,0.35)]"
                  : "bg-white/5 border-white/10 text-white/60 hover:border-white/30 hover:text-white"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </Field>

      {/* Body metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Field label="Age" hint="yrs">
          <input type="number" placeholder="24" min={10} max={80}
            value={form.age} onChange={(e) => set("age", e.target.value)}
            className={inputCls} required />
        </Field>
        <Field label="Height">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type="number" placeholder="5" min={3} max={8}
                value={form.height_ft} onChange={(e) => set("height_ft", e.target.value)}
                className={inputCls} required />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 font-condensed">ft</span>
            </div>
            <div className="relative flex-1">
              <input type="number" placeholder="10" min={0} max={11}
                value={form.height_in} onChange={(e) => set("height_in", e.target.value)}
                className={inputCls} required />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 font-condensed">in</span>
            </div>
          </div>
        </Field>
        <Field label="Weight" hint="lbs">
          <input type="number" placeholder="160" min={50} max={500}
            value={form.weight_lbs} onChange={(e) => set("weight_lbs", e.target.value)}
            className={inputCls} required />
        </Field>
      </div>

      {/* Training frequency slider */}
      <Field
        label={`Training Frequency — ${form.training_hours} hrs / week`}
        hint={form.training_hours <= 2 ? "Casual" : form.training_hours <= 5 ? "Recreational" : form.training_hours <= 10 ? "Serious" : form.training_hours <= 15 ? "Dedicated" : "Competitive"}
      >
        <div className="relative pt-1">
          <input
            type="range" min={0} max={20} value={form.training_hours}
            onChange={(e) => set("training_hours", parseInt(e.target.value))}
            className="w-full h-1 appearance-none bg-white/10 rounded-full accent-[#E8112D] cursor-pointer"
          />
          <div className="flex justify-between mt-2 px-0.5">
            {[0,2,4,6,8,10,12,14,16,18,20].map(n => (
              <div key={n} className={`w-1 h-1 rounded-full ${n <= form.training_hours ? "bg-[#E8112D]" : "bg-white/15"}`} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-white/25 font-condensed">0 hrs</span>
            <span className="text-[10px] text-white/25 font-condensed">20 hrs</span>
          </div>
        </div>
      </Field>

      {/* Injury history */}
      <Field label="Injury History" hint="optional">
        <textarea
          placeholder="e.g. Left knee sprain 2023, right ankle fracture 2022..."
          value={form.injury_history}
          onChange={(e) => set("injury_history", e.target.value)}
          rows={3}
          className={`${inputCls} resize-none`}
        />
      </Field>

      {/* Restored notice */}
      {restored && (
        <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.07] rounded-lg px-4 py-2.5">
          <p className="font-body text-xs text-white/35">Profile restored from last session</p>
          <button
            type="button"
            onClick={() => {
              try { localStorage.removeItem(STORAGE_KEY); } catch {}
              setForm(DEFAULTS);
              setRestored(false);
            }}
            className="font-condensed text-[0.6rem] tracking-widest uppercase text-white/25 hover:text-white/50 transition-colors ml-4"
          >
            Clear
          </button>
        </div>
      )}

      <button
        type="submit"
        className="w-full py-4 bg-[#E8112D] hover:bg-[#c50e26] text-white font-display text-2xl tracking-[0.3em] rounded-xl transition-all duration-200 hover:shadow-[0_0_30px_rgba(232,17,45,0.4)] hover:scale-[1.01] active:scale-[0.99]"
      >
        SAVE & CONTINUE →
      </button>
    </form>
  );
}
