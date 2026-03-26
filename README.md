# RedWings AI

AI-powered injury prevention and performance coaching for extreme sports athletes. Upload a video of your trick or training run and get elite biomechanical analysis with personalized coaching advice — built at IrvineHacks 2026.

---

## What It Does

1. **Athlete Profile** — Enter your sport, skill level, body metrics, fatigue level, and injury history
2. **Video Upload** — Submit a video clip of your trick or training session
3. **Pose Detection** — MediaPipe extracts joint angles, symmetry, stance width, and movement velocity frame by frame
4. **AI Coaching** — GPT-5-mini turns the biomechanical data into actionable form corrections, safety warnings, drills, and a conditioning recommendation

---

## Tech Stack

**Frontend**
- React + Vite
- Tailwind CSS

**Backend**
- FastAPI
- MediaPipe Pose (computer vision)
- OpenCV
- OpenAI API (GPT-5-mini)

---

## Project Structure

```
redwings-ai/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── ProfileForm.jsx
│       │   ├── VideoFeedback.jsx
│       │   └── Results.jsx
│       ├── App.jsx
│       ├── App.css
│       └── index.css
└── backend/
    ├── services/
    │   ├── media_pipe_processing.py
    │   ├── metrics.py
    │   └── llm.py
    ├── api.py
    ├── main.py
    ├── requirements.txt
    └── requirements-dev.txt
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- An OpenAI API key
- The MediaPipe `pose_landmarker_full.task` model file (place it in `backend/services/`)

You can download the model file here:
```
https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task
```

### Environment Setup

Create a `.env` file in the project root:

```
OPENAI_API_KEY=your_openai_api_key_here
```

---

### Backend

```bash
cd backend
pip install -r requirements.txt
pip install -r requirements-dev.txt
fastapi dev src/api.py
```

The API will be running at `http://127.0.0.1:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be running at `http://localhost:5173`. Vite proxies all `/api` requests to the FastAPI backend automatically.

---

## API

### `POST /api/analyze`

Accepts a video file and athlete profile, returns biomechanical metrics and AI coaching.

**Request** — `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `video` | file | Video file (.mp4, .mov, etc.) |
| `sport` | string | e.g. `"Snowboarding"` |
| `skill_level` | string | `"Beginner"`, `"Intermediate"`, `"Advanced"`, or `"Pro"` |
| `age` | int | Athlete age |
| `height_cm` | float | Height in centimeters |
| `weight_kg` | float | Weight in kilograms |
| `fatigue_level` | int | 1–10 scale |
| `injury_history` | string | Optional free text |

**Response**

```json
{
  "profile": { "sport": "Snowboarding", "skill_level": "Intermediate", "..." },
  "metrics": {
    "knee_angle_avg": 132.4,
    "knee_angle_min": 88.1,
    "knee_symmetry_avg": 12.3,
    "hip_angle_avg": 145.2,
    "arm_spread_avg": 0.38,
    "knee_velocity_max": 18.5
  },
  "coaching": {
    "form_corrections": ["...", "...", "..."],
    "safety_warnings": ["...", "..."],
    "drills": ["...", "..."],
    "conditioning": "...",
    "overall_assessment": "..."
  }
}
```

---

## Team

Built at IrvineHacks 2026 by a team of 4.
