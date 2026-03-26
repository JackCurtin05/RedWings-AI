export default function Field({ label, hint, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-[15px] font-condensed tracking-[0.25em] uppercase text-white/50">{label}</label>
        {hint && <span className="text-[10px] text-white/25 font-body">{hint}</span>}
      </div>
      {children}
    </div>
  );
};