# 🦅 RedWings AI

**AI-powered biomechanical coaching for extreme sports athletes.**

Upload a video of your trick or training run — RedWings analyzes your joint angles, movement symmetry, and body mechanics, then delivers elite-level coaching feedback tailored to your sport.

<!-- 📸 Add a wide hero screenshot of the results page here:
     1. Run the app and take a screenshot of the results/analysis page
     2. Drag the screenshot into any GitHub issue or PR comment box
     3. Copy the generated URL and replace the src below
<img width="2363" alt="RedWings AI Results" src="https://github.com/user-attachments/assets/YOUR_IMAGE_ID" />
-->

*Built at IrvineHacks 2026.*

---

## Features

- 🎿 **10 extreme sports** — Snowboarding, Skiing, Skateboarding, BMX, Surfing, Parkour, Motocross, Rock Climbing, Wingsuiting, and more
- 📐 **Frame-by-frame pose analysis** — MediaPipe extracts knee angles, hip angles, trunk lean, shoulder symmetry, stance width, and movement velocity
- 🤖 **Sport-specific AI coaching** — GPT-4o gives form corrections, safety warnings, targeted drills, and a conditioning plan in the voice of a coach for your exact sport
- 📊 **Visual metrics dashboard** — sparkline charts, color-coded reference ranges, and risk flags
- 📈 **Progress tracking** — compare your current run against your last session for the same sport with delta indicators
- 🗂 **Session history** — stores your last 25 analyses locally, filterable by sport, with quick-load
- 👤 **Athlete profile** — skill level, fatigue, injury history, and body metrics personalize every analysis

---

## Screenshots

### Athlete Profile
<img width="2305" height="1966" alt="image" src="https://github.com/user-attachments/assets/6be352b9-6fbd-4f54-bdbf-5106130b31b8" />

<!-- 📸 Screenshot of the profile form (step 1 of the app) -->
<!-- <img alt="Athlete Profile" src="https://github.com/user-attachments/assets/YOUR_IMAGE_ID" /> -->

### Video Upload
<img width="1747" height="1678" alt="image" src="https://github.com/user-attachments/assets/7210f740-147c-48f4-9460-3629f51844d5" />

<!-- 📸 Screenshot of the drag-and-drop upload screen with a video loaded and previewing -->
<!-- <img alt="Video Upload" src="https://github.com/user-attachments/assets/YOUR_IMAGE_ID" /> -->

### Biomechanical Analysis
<img width="2031" height="2020" alt="image" src="https://github.com/user-attachments/assets/a8553007-2b25-47ee-bdbc-a456c8fdbe03" />
<!-- 📸 Screenshot of the full results page — metrics grid, sparklines, coaching feedback -->
<!-- <img alt="Analysis Results" src="https://github.com/user-attachments/assets/YOUR_IMAGE_ID" /> -->

### Session History
<img width="860" height="777" alt="image" src="https://github.com/user-attachments/assets/83ce583a-82a1-42c4-8739-18812877b4fb" />

<!-- 📸 Screenshot of the history panel slide-out with a few sessions listed -->
<!-- <img alt="Session History" src="https://github.com/user-attachments/assets/YOUR_IMAGE_ID" /> -->

---

## How It Works

1. **Profile** — Set your sport, skill level, age, height, weight, fatigue level, and any injury history
2. **Upload** — Drag and drop a video clip (.mp4, .mov, .webm, .avi, .m4v, .mkv)
3. **Pose Detection** — MediaPipe PoseLandmarker runs frame-by-frame with adaptive sampling (targets ~80 frames regardless of video length) and Savitzky-Golay smoothing to reduce jitter
4. **Metrics** — Calculates knee/hip angles, trunk lean, shoulder symmetry, stance width, center-of-mass stability, and movement velocity
5. **AI Coaching** — A sport-specific GPT-4o prompt (with a dedicated coach persona per sport) turns the raw biomechanics into actionable feedback
6. **Results** — Visual dashboard with sparklines, color-coded reference ranges, risk banners, and progress deltas vs your last run for that sport

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | FastAPI, Python |
| Pose Detection | MediaPipe PoseLandmarker (VIDEO mode) |
| Video Processing | OpenCV |
| AI Coaching | OpenAI GPT-4o |
| Storage | localStorage (session history + athlete profile) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- An OpenAI API key

### 1. Clone the repo

```bash
git clone https://github.com/jackcurtin05/redwings-ai.git
cd redwings-ai
```

### 2. Download the MediaPipe model

Place the model file in `backend/services/`:

```bash
# Mac/Linux
curl -L https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task \
  -o backend/services/pose_landmarker_full.task
```

```powershell
# Windows (PowerShell)
Invoke-WebRequest -Uri "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task" -OutFile "backend/services/pose_landmarker_full.task"
```

### 3. Set up environment

Create `backend/.env`:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Run the backend

```bash
cd backend
pip install -r requirements.txt
fastapi dev src/api.py
```

The API runs at `http://127.0.0.1:8000`.

### 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies all `/api` requests to the FastAPI backend automatically.

---

## Project Structure

```
redwings-ai/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Navbar.jsx          # Navigation + history toggle button
│       │   ├── ProfileForm.jsx     # Athlete profile (step 1)
│       │   ├── VideoFeedback.jsx   # Drag-and-drop upload (step 2)
│       │   ├── Results.jsx         # Analysis dashboard (step 3)
│       │   └── HistoryPanel.jsx    # Slide-out session history drawer
│       ├── App.jsx                 # State management, history, routing
│       ├── App.css
│       └── index.css
└── backend/
    └── src/
        ├── services/
        │   ├── media_pipe_processing.py  # Pose extraction + adaptive sampling
        │   ├── metrics.py                # Angle/symmetry/stability calculations
        │   └── llm.py                    # Sport-specific GPT-4o prompts
        └── api.py                        # FastAPI endpoint
```

---

## API

### `POST /api/analyze`

**Request** — `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `video` | file | .mp4, .mov, .webm, .avi, .m4v, or .mkv |
| `sport` | string | e.g. `"Snowboarding"` |
| `skill_level` | string | `"Beginner"`, `"Intermediate"`, `"Advanced"`, `"Pro"` |
| `age` | int | Athlete age |
| `height_cm` | float | Height in centimeters |
| `weight_kg` | float | Weight in kilograms |
| `fatigue_level` | int | 1–10 scale |
| `injury_history` | string | Optional free text |

**Response**

```json
{
  "profile": { "sport": "Snowboarding", "skill_level": "Intermediate" },
  "metrics": {
    "knee_angle_avg": 132.4,
    "knee_angle_min": 88.1,
    "knee_symmetry_avg": 12.3,
    "hip_angle_avg": 145.2,
    "trunk_lean_avg": 18.2,
    "trunk_lean_max": 34.5,
    "shoulder_symmetry_avg": 0.04,
    "stability_score": 72.1,
    "arm_spread_avg": 0.38,
    "knee_velocity_max": 18.5,
    "knee_angle_series": [132, 128, 124, "..."],
    "hip_angle_series": [145, 142, 140, "..."],
    "trunk_lean_series": [18, 21, 19, "..."]
  },
  "coaching": {
    "form_corrections": ["..."],
    "safety_warnings": ["..."],
    "drills": ["..."],
    "conditioning": "...",
    "overall_assessment": "..."
  },
  "video_meta": {
    "fps": 30.0,
    "duration_sec": 8.4,
    "total_frames": 252,
    "analyzed_frames": 80,
    "coverage": 0.98
  }
}
```

---

## Deployment

The project includes a `Dockerfile` and `vercel.json`. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for details.

---

## Team

Built at IrvineHacks 2026.

---

## License

MIT
