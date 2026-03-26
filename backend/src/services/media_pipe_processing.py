import os
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks.python.core.base_options import BaseOptions
from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "pose_landmarker_full.task")

# Target this many analyzed frames regardless of video length.
# Keeps processing time predictable and data density consistent.
TARGET_FRAMES = 80


def analyze_video(video_path):
    """
    Extracts 3D joint coordinates from a video using an adaptive frame-skip
    strategy so that every video yields ~TARGET_FRAMES of pose data.

    Returns:
        dict with keys:
          joint_data   — np.ndarray shape (N, 33, 4): N analyzed frames,
                         33 body joints, each [x, y, z, visibility]
          fps          — source video frame rate
          duration_sec — video duration in seconds
          total_frames — total raw frames in the source file
          analyzed_frames — how many frames had detectable pose
          sampled_frames  — how many frames were sent to MediaPipe
          coverage     — float 0-1: analyzed_frames / sampled_frames
          frame_skip   — the adaptive skip that was used
    """
    base_options = BaseOptions(model_asset_path=MODEL_PATH)
    options = PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=RunningMode.VIDEO,
    )
    mp_pose = PoseLandmarker.create_from_options(options)

    cap = cv2.VideoCapture(video_path)
    fps          = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = total_frames / fps

    # Adaptive skip: aim for TARGET_FRAMES samples; min skip = 1 (every frame),
    # max skip = 10 (very long videos — don't process forever).
    frame_skip = max(1, min(10, total_frames // TARGET_FRAMES))

    frame_count    = 0
    sampled_frames = 0
    joint_data     = []

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % frame_skip != 0:
            frame_count += 1
            continue

        sampled_frames += 1
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image  = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

        timestamp_ms = int((frame_count / fps) * 1000)
        results = mp_pose.detect_for_video(mp_image, timestamp_ms)

        if results.pose_landmarks:
            frame_joints = []
            for landmark in results.pose_landmarks[0]:
                frame_joints.append([
                    landmark.x,
                    landmark.y,
                    landmark.z,
                    landmark.visibility,
                ])
            joint_data.append(frame_joints)

        frame_count += 1

    cap.release()
    mp_pose.close()

    analyzed = len(joint_data)
    coverage = analyzed / max(sampled_frames, 1)

    return {
        "joint_data":      np.array(joint_data) if joint_data else np.array([]),
        "fps":             round(fps, 2),
        "duration_sec":    round(duration_sec, 2),
        "total_frames":    total_frames,
        "sampled_frames":  sampled_frames,
        "analyzed_frames": analyzed,
        "coverage":        round(coverage, 3),
        "frame_skip":      frame_skip,
    }
