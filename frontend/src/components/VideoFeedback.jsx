import { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";

const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/avi"];
const ACCEPTED_EXT   = ".mp4,.mov,.webm,.avi";
const SIZE_WARN_MB   = 150;   // warn above this
const SIZE_LIMIT_MB  = 500;   // hard reject above this

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(sec) {
  if (!sec || isNaN(sec)) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function VideoFeedback({ profile, onResult, videoInfo }) {
  const [video,        setVideo]        = useState(null);
  const [previewUrl,   setPreviewUrl]   = useState(null);
  const [duration,     setDuration]     = useState(null);
  const [dragging,     setDragging]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [sizeWarning,  setSizeWarning]  = useState(false);
  const fileRef = useRef(null);

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // ── File validation & preview ────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return;

    const isVideo = ACCEPTED_TYPES.includes(file.type) || file.name.match(/\.(mp4|mov|webm|avi)$/i);
    if (!isVideo) {
      setError("Please upload a video file (.mp4, .mov, .webm, or .avi).");
      return;
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > SIZE_LIMIT_MB) {
      setError(`File is too large (${sizeMB.toFixed(0)} MB). Please use a video under ${SIZE_LIMIT_MB} MB.`);
      return;
    }

    setError("");
    setSizeWarning(sizeMB > SIZE_WARN_MB);
    setVideo(file);
    setDuration(null);

    // Build preview URL and extract duration via HTML5 video
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.onloadedmetadata = () => setDuration(vid.duration);
    vid.src = url;
  };

  // ── Drag events ──────────────────────────────────────────────────────────
  const onDragOver  = useCallback((e) => { e.preventDefault(); setDragging(true);  }, []);
  const onDragLeave = useCallback((e) => { e.preventDefault(); setDragging(false); }, []);
  const onDrop      = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [previewUrl]);

  // ── Submit ───────────────────────────────────────────────────────────────
  const onSubmit = async () => {
    if (!video) { setError("Please select a video first."); return; }
    if (!profile) { setError("Profile data is missing. Please complete your profile first."); return; }

    setLoading(true);
    setError("");

    const data = new FormData();
    data.append("video",          video);
    data.append("sport",          profile.sport);
    data.append("skill_level",    profile.skill_level);
    data.append("age",            profile.age);
    data.append("height_in",      parseInt(profile.height_ft) * 12 + parseInt(profile.height_in));
    data.append("weight_lbs",     profile.weight_lbs);
    data.append("training_hours", profile.training_hours);
    data.append("injury_history", profile.injury_history || "None");
    data.append("video_info",     videoInfo || "None");

    try {
      const response = await axios.post("/api/analyze", data);
      onResult(response.data);
    } catch (err) {
      const msg = err.response?.data?.detail || "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !loading && fileRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-3
          border-2 border-dashed rounded-xl text-center
          transition-all duration-200 cursor-pointer select-none overflow-hidden
          ${loading
            ? "opacity-50 cursor-not-allowed border-white/10 px-6 py-12"
            : dragging
              ? "border-[#E8112D] bg-[#E8112D]/[0.06] scale-[1.01] px-6 py-12"
              : video
                ? "border-[#E8112D]/40 hover:border-[#E8112D]/60 p-0"
                : "border-white/10 hover:border-white/25 hover:bg-white/[0.02] px-6 py-12"
          }
        `}
      >
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_EXT}
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
          disabled={loading}
        />

        {video && previewUrl ? (
          /* ── Preview state ── */
          <div className="relative w-full">
            <video
              src={previewUrl}
              className="w-full rounded-xl object-cover max-h-64"
              muted
              playsInline
              onMouseEnter={e => e.target.play()}
              onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }}
            />
            {/* Overlay badge */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent rounded-xl pointer-events-none" />
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
              <div>
                <p className="font-condensed text-sm tracking-wider text-white truncate max-w-[180px]">{video.name}</p>
                <p className="font-body text-xs text-white/50">
                  {formatBytes(video.size)}{duration ? ` · ${formatDuration(duration)}` : ""}
                </p>
              </div>
              <span className="font-condensed text-[0.6rem] tracking-widest uppercase bg-white/10 backdrop-blur text-white/60 px-2.5 py-1 rounded-full">
                Hover to preview
              </span>
            </div>
          </div>
        ) : (
          /* ── Empty state ── */
          <>
            <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
              <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <p className="font-condensed text-sm tracking-wider uppercase text-white/60">Drop your video here</p>
              <p className="font-body text-xs text-white/25 mt-1">or click to browse — MP4, MOV, WEBM, AVI</p>
            </div>
          </>
        )}
      </div>

      {/* Replace button when a file is selected */}
      {video && !loading && (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-2 rounded-lg font-condensed text-xs tracking-widest uppercase text-white/30 hover:text-white/60 border border-white/[0.07] hover:border-white/20 transition-all duration-200"
        >
          Replace video
        </button>
      )}

      {/* Size warning */}
      {sizeWarning && !error && (
        <p className="font-body text-xs text-amber-400/80 text-center">
          ⚠ Large file — analysis may take longer than usual
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="font-body text-sm text-[#E8112D] text-center">{error}</p>
      )}

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={loading || !video}
        className={`
          w-full py-4 rounded-xl font-display text-2xl tracking-[0.3em] uppercase
          transition-all duration-200
          ${loading || !video
            ? "bg-white/[0.05] text-white/25 cursor-not-allowed border border-white/[0.07]"
            : "bg-[#E8112D] text-white hover:bg-[#c50e26] hover:shadow-[0_0_30px_rgba(232,17,45,0.4)] hover:scale-[1.01] active:scale-[0.99]"
          }
        `}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-3">
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ANALYZING...
          </span>
        ) : "ANALYZE →"}
      </button>

      {/* Loading hint */}
      {loading && (
        <div className="space-y-2 text-center">
          <div className="w-full h-px bg-white/[0.07] relative overflow-hidden rounded-full">
            <div className="absolute inset-y-0 left-0 bg-[#E8112D] rounded-full"
              style={{ animation: "pulse-bar 2.5s ease-in-out infinite" }} />
          </div>
          <p className="font-body text-[0.7rem] text-white/25 tracking-widest uppercase">
            Running pose detection · This may take 30–60 seconds
          </p>
        </div>
      )}

    </div>
  );
}
