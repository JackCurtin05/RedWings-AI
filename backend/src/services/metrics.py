import numpy as np
from scipy.signal import savgol_filter


# ── Geometry helpers ──────────────────────────────────────────────────────────

def calculate_angle(a, b, c):
    """
    3D angle at point B in the chain A→B→C, in degrees.
    Returns None if any of the three landmarks has visibility < 0.5.
    """
    if len(a) > 3 and (a[3] < 0.5 or b[3] < 0.5 or c[3] < 0.5):
        return None

    a, b, c = np.array(a[:3]), np.array(b[:3]), np.array(c[:3])
    ba, bc  = a - b, c - b
    cosine  = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    return float(np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0))))


def calculate_distance(a, b):
    """True 3D Euclidean distance between two landmarks."""
    return float(np.linalg.norm(np.array(a[:3]) - np.array(b[:3])))


def calculate_trunk_lean(frame):
    """
    Angle (degrees) between the trunk axis (hip-midpoint → shoulder-midpoint)
    and the vertical axis, measured in the image plane (x-y).

    0° = perfectly upright.  Positive = leaning forward/sideways.
    Returns None if any landmark visibility is too low.
    """
    ls, rs = frame[11], frame[12]   # left / right shoulder
    lh, rh = frame[23], frame[24]   # left / right hip

    min_vis = min(ls[3], rs[3], lh[3], rh[3])
    if min_vis < 0.4:
        return None

    shoulder_mid = np.array([(ls[0] + rs[0]) / 2, (ls[1] + rs[1]) / 2])
    hip_mid      = np.array([(lh[0] + rh[0]) / 2, (lh[1] + rh[1]) / 2])

    trunk_vec = shoulder_mid - hip_mid          # points upward in image coords
    vertical  = np.array([0.0, -1.0])           # "up" in image = negative y

    norm = np.linalg.norm(trunk_vec)
    if norm < 1e-6:
        return None

    cosine = np.dot(trunk_vec / norm, vertical)
    return float(np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0))))


def calculate_shoulder_symmetry(frame):
    """
    Normalized height difference between left and right shoulders.
    0 = perfectly level.  Higher = one shoulder is significantly raised.
    Returns None if either shoulder has low confidence.
    """
    ls, rs = frame[11], frame[12]
    if ls[3] < 0.4 or rs[3] < 0.4:
        return None
    return float(abs(ls[1] - rs[1]))


# ── Signal processing ─────────────────────────────────────────────────────────

def smooth_angles(angles, window=7, poly=2):
    """
    Savitzky-Golay smoothing to reduce MediaPipe jitter.
    None / NaN values are interpolated before smoothing.
    """
    arr  = np.array([float('nan') if v is None else v for v in angles], dtype=float)
    nans = np.isnan(arr)

    if nans.all():
        return angles

    indices    = np.arange(len(arr))
    arr[nans]  = np.interp(indices[nans], indices[~nans], arr[~nans])

    if len(arr) < window:
        return arr.tolist()

    return savgol_filter(arr, window_length=window, polyorder=poly).tolist()


def downsample(values, n=30):
    """
    Return at most n evenly-spaced samples from a list, rounding to 1 dp.
    Nones are preserved.
    """
    if not values:
        return []
    step = max(1, len(values) // n)
    return [
        round(values[i], 1) if values[i] is not None else None
        for i in range(0, len(values), step)
    ][:n]


# ── Phase detection ───────────────────────────────────────────────────────────

def detect_phases(frame_by_frame):
    """
    Labels each frame based on body position — sport-agnostic.

    Phases:
        extended         — legs nearly straight (approach, riding tall, flight)
        deep_compression — both knee and hip acutely bent (hard landing, deep press)
        knee_compression — knees bent, hips upright (jump prep, carve, crouch)
        hip_hinge        — forward lean dominant (nose/tail press, surf crouch)
        arms_tucked      — arms pulled in tight (spin, tuck)
        athletic_stance  — balanced neutral position
        unknown          — low-confidence landmarks
    """
    phases = []
    for f in frame_by_frame:
        knee = f["right_knee_angle"]
        hip  = f["right_hip_angle"]
        arm  = f["arm_spread"]

        if knee is None or hip is None:
            phase = "unknown"
        elif knee > 160 and hip > 155:
            phase = "extended"
        elif knee < 90 and hip < 95:
            phase = "deep_compression"
        elif knee < 100:
            phase = "knee_compression"
        elif hip < 115:
            phase = "hip_hinge"
        elif arm is not None and arm < 0.06:
            phase = "arms_tucked"
        else:
            phase = "athletic_stance"

        phases.append({"frame": f["frame"], "phase": phase})
    return phases


# ── Main extraction ───────────────────────────────────────────────────────────

def extract_metrics(joint_data):
    """
    Converts raw joint coordinates (frames × 33 × 4) into biomechanical
    metrics for LLM analysis and frontend display.

    MediaPipe landmark indices used:
        11 = L shoulder   12 = R shoulder
        13 = L elbow      14 = R elbow
        15 = L wrist      16 = R wrist
        23 = L hip        24 = R hip
        25 = L knee       26 = R knee
        27 = L ankle      28 = R ankle

    Returns a dict of summary stats, a per-frame breakdown, and a
    downsampled angle series suitable for sparkline rendering.
    """
    if len(joint_data) == 0:
        return {}

    # ── Per-frame raw extraction ──────────────────────────────────────────
    right_knee_angles   = []
    left_knee_angles    = []
    right_hip_angles    = []
    left_hip_angles     = []
    right_elbow_angles  = []
    trunk_leans         = []
    shoulder_symmetries = []
    arm_spread          = []
    stance_width        = []
    center_of_mass_x    = []
    center_of_mass_y    = []

    for frame in joint_data:
        right_knee_angles.append(calculate_angle(frame[24], frame[26], frame[28]))
        left_knee_angles.append( calculate_angle(frame[23], frame[25], frame[27]))
        right_hip_angles.append( calculate_angle(frame[12], frame[24], frame[26]))
        left_hip_angles.append(  calculate_angle(frame[11], frame[23], frame[25]))
        right_elbow_angles.append(calculate_angle(frame[12], frame[14], frame[16]))
        trunk_leans.append(         calculate_trunk_lean(frame))
        shoulder_symmetries.append( calculate_shoulder_symmetry(frame))

        arm_spread.append(   calculate_distance(frame[15], frame[16]))
        stance_width.append( calculate_distance(frame[27], frame[28]))

        center_of_mass_x.append(float((frame[23][0] + frame[24][0]) / 2))
        center_of_mass_y.append(float((frame[23][1] + frame[24][1]) / 2))

    # ── Smoothing ─────────────────────────────────────────────────────────
    right_knee_angles  = smooth_angles(right_knee_angles)
    left_knee_angles   = smooth_angles(left_knee_angles)
    right_hip_angles   = smooth_angles(right_hip_angles)
    left_hip_angles    = smooth_angles(left_hip_angles)
    right_elbow_angles = smooth_angles(right_elbow_angles)
    trunk_leans        = smooth_angles(trunk_leans)

    # ── Validity filters (remove glitched frames) ─────────────────────────
    valid_right_knee = [a for a in right_knee_angles if a is not None and a > 25]
    valid_left_knee  = [a for a in left_knee_angles  if a is not None and a > 25]
    valid_hip        = [a for a in right_hip_angles  if a is not None and a > 25]
    valid_trunk      = [a for a in trunk_leans       if a is not None]
    valid_elbow      = [a for a in right_elbow_angles if a is not None]
    valid_shoulder_sym = [a for a in shoulder_symmetries if a is not None]

    if not valid_right_knee or not valid_hip:
        return {
            "error": (
                "Could not detect pose reliably. Make sure the full body is clearly "
                "visible in the frame and well-lit."
            ),
        }

    # ── Derived series ─────────────────────────────────────────────────────
    # Knee symmetry (L vs R angle difference per frame)
    knee_symmetry = [
        abs(right_knee_angles[i] - left_knee_angles[i])
        if right_knee_angles[i] is not None and left_knee_angles[i] is not None
        else None
        for i in range(len(right_knee_angles))
    ]
    valid_symmetry = [v for v in knee_symmetry if v is not None]

    # Knee velocity — frame-to-frame angle delta (hard-landing indicator)
    knee_velocity = [
        abs(right_knee_angles[i] - right_knee_angles[i - 1])
        if right_knee_angles[i] is not None and right_knee_angles[i - 1] is not None
        else 0.0
        for i in range(1, len(right_knee_angles))
    ]

    # Stability score: 0–100 from lateral CoM variance
    # CoM std < 0.02 = excellent (100), > 0.14 = poor (0)
    com_std = float(np.std(center_of_mass_x))
    stability_score = round(max(0.0, min(100.0, (1.0 - com_std / 0.14) * 100)), 1)

    # Pose coverage: fraction of sampled frames with valid knee detection
    coverage_local = len(valid_right_knee) / max(len(right_knee_angles), 1)

    # ── Per-frame breakdown ───────────────────────────────────────────────
    frame_by_frame = [
        {
            "frame":            i,
            "right_knee_angle": round(right_knee_angles[i], 2) if right_knee_angles[i] is not None else None,
            "left_knee_angle":  round(left_knee_angles[i],  2) if left_knee_angles[i]  is not None else None,
            "knee_symmetry":    round(knee_symmetry[i], 2)      if knee_symmetry[i]     is not None else None,
            "right_hip_angle":  round(right_hip_angles[i],  2) if right_hip_angles[i]  is not None else None,
            "trunk_lean":       round(trunk_leans[i],        2) if trunk_leans[i]       is not None else None,
            "elbow_angle":      round(right_elbow_angles[i], 2) if right_elbow_angles[i] is not None else None,
            "arm_spread":       round(arm_spread[i],   3),
            "stance_width":     round(stance_width[i], 3),
            "center_of_mass_x": round(center_of_mass_x[i], 3),
        }
        for i in range(len(right_knee_angles))
    ]

    return {
        # ── Knee ──
        "knee_angle_avg":        float(np.mean(valid_right_knee)),
        "knee_angle_min":        float(np.min(valid_right_knee)),
        "knee_angle_max":        float(np.max(valid_right_knee)),
        "knee_symmetry_avg":     float(np.mean(valid_symmetry)) if valid_symmetry else None,

        # ── Hip ──
        "hip_angle_avg":         float(np.mean(valid_hip)),
        "hip_angle_min":         float(np.min(valid_hip)),

        # ── Trunk / upper body ──
        "trunk_lean_avg":        float(np.mean(valid_trunk))   if valid_trunk  else None,
        "trunk_lean_max":        float(np.max(valid_trunk))    if valid_trunk  else None,
        "shoulder_symmetry_avg": float(np.mean(valid_shoulder_sym)) if valid_shoulder_sym else None,
        "elbow_angle_avg":       float(np.mean(valid_elbow))   if valid_elbow  else None,

        # ── Arms / stance ──
        "arm_spread_avg":        float(np.mean(arm_spread)),
        "arm_spread_min":        float(np.min(arm_spread)),
        "stance_width_avg":      float(np.mean(stance_width)),

        # ── Center of mass ──
        "center_of_mass_x_avg":  float(np.mean(center_of_mass_x)),
        "center_of_mass_x_std":  com_std,

        # ── Impact / velocity ──
        "knee_velocity_max":     float(np.max(knee_velocity))  if knee_velocity else None,
        "knee_velocity_avg":     float(np.mean(knee_velocity)) if knee_velocity else None,

        # ── Composite scores ──
        "stability_score":       stability_score,
        "pose_coverage":         round(coverage_local, 3),

        # ── Sparkline series (downsampled, sent to frontend for charts) ──
        "knee_angle_series":     downsample(right_knee_angles, 30),
        "hip_angle_series":      downsample(right_hip_angles,  30),
        "trunk_lean_series":     downsample(trunk_leans,       30),

        # ── Phase / frame data ──
        "trick_phases":          detect_phases(frame_by_frame),
        "frame_by_frame":        frame_by_frame,
    }
