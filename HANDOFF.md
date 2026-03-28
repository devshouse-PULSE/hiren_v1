# PULSE 2.0 — Developer Handoff Guide

Welcome to the PULSE 2.0 repository! This document outlines what the system currently does, how to run it locally, how to test the currently built features, and what machine learning components still need to be built according to `PULSE_PLAN.md`.

---

## 1. How to Run the System

The system consists of three distinct parts running simultaneously on your local network:
1. **Python Backend** (FastAPI WebSocket + ML orchestrator)
2. **Next.js Frontend** (Web Dashboard)
3. **React Native PWA** (Mobile data collector)

### Backend (FastAPI)
1. Open a terminal to `backend/`
2. Activate your virtual environment: `.\venv\Scripts\activate` (Windows)
3. Start the server in **HTTP format**:
   ```bash
   python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
   ```
   *(Note: Do not use `run_https.py` if testing with the React Native app, as Expo blocks self-signed SSL certs.)*

### Frontend (Next.js)
1. Open a terminal to `frontend/`
2. Ensure you have installed dependencies (`npm install`)
3. Ensure the `.env` file explicitly points to `http://127.0.0.1:8000` for `NEXT_PUBLIC_PULSE_API_URL`.
4. Run the development server:
   ```bash
   npm run dev
   ```
5. View it at `http://localhost:3000`

### Mobile PWA (React Native / Expo)
1. Open a terminal to `pwa/`
2. Find your computer's IPv4 address via `ipconfig` (e.g. `192.168.x.x` or `10.x.x.x`).
3. Set the hostname and run Expo:
   ```powershell
   $env:REACT_NATIVE_PACKAGER_HOSTNAME="10.221.X.X"
   npx expo start
   ```
4. Open the Expo Go app on your phone, connect to the dev server, and ensure you type your raw IP `10.221.X.X:8000` in the "Backend Server" box before starting a session.

---

## 2. What Has Been Completed

> [!SUCCESS]
> **Core Pipeline is Connected E2E!**

- **WebSocket Ingestion**: The mobile PWA successfully streams Camera 📷, GPS 🌍, and IMU ⚡ layers to the Backend at a locked interval (Camera at ~1.5Hz to prevent JS thread bottlenecking).
- **Segment Accumulation**: `SegmentManager` builds physical 100-meter segments from live GPS data (with a 25-second fallback timer for test environments).
- **Live React Map (`/map`)**: `react-leaflet` consumes real-time segments via Zustand and plots polyline traces color-coded by IRI (Roughness) status.
- **Economic Dashboard (`/applications`)**: Parses economic cascade outputs and drafts PMGSY narrative justifications.
- **ReportLab PDF Generator**: The backend successfully outputs official-looking A4 formatted PDF documents summarizing the road repair request logic.

---

## 3. How to Test Current Features

1. Start all 3 servers.
2. In the Next.js frontend, go to **Live Map** (`/map`).
3. On your phone app, hit "Simulation Mode" checkmark (optional, but forces mock GPS).
4. Tap **Initialize Hardware** on the phone. Watch the React map!
5. After several seconds (100-m logical drive, or 25-sec fallback), the segment cuts and is beamed to the Next.js dashboard. You'll see polylines plot out across the map.
6. Check the **PMGSY Dashboard** (`/applications`) and hit "Download Official PDF" to see the auto-generated ReportLab document.

---

## 4. What Needs to be Done (The ML Logic)

Based on the original `PULSE_PLAN.md`, the actual rigorous Intelligence Layer is what remains. Right now, the classes inside `backend/backend/agents/` are mostly placeholders providing mocked outputs so the frontend could be built.

Here is the checklist of logic to build next:

> [!WARNING]
> The Acoustic Classifier agent was explicitly skipped/descoped by the previous dev phase. Focus entirely on Vision and IMU.

### [ ] Agent 1: Depth Reconstructor (DPVO)
- **Goal:** Implement the True SLAM tracking logic using DPVO.
- **How to do it:** The DPVO environment was mapped out in `DPVO_SETUP_SUMMARY.md`. You need to pass the base64 frames received in `SegmentManager` into the `DepthReconstructor` node, extract ORB-SLAM3 or optical flow metrics, and output an absolute millimeter scaling factor for rut depths.

### [ ] Agent 2: Visual Assessor (Qwen2.5-VL-7B)
- **Goal:** Replace the mocked pothole/distress detector with the actual Vision-Language Model.
- **How to do it:** Provide the mid-point segment image to `Qwen2.5-VL-7B` running locally via vLLM or Ollama, prompt it to identify surface distresses (cracks, raveling, potholes) following IRC guidelines, and parse the JSON response.

### [ ] Agent 0: Rigorous Sensor Fusion
- **Goal:** Combine IMU physics with Vision context.
- **How to do it:** The IRI (International Roughness Index) calculation using the Quarter-Car model is sketched out in `PULSE_PLAN.md`. Implement `compute_iri()` using SciPy on the `imu_buffer`. Feed that IRI directly into the `FusionAgent` to classify road states.

### [ ] Agent 4 & 5: Deterioration Oracle / Economic Cascade
- **Goal:** Implement the localized physics models.
- **How to do it:** Using the actual outputs from the Fusion Agent (Rut depth + Roughness), calculate the specific remaining lifespan of the road segment, and plug it into the `EconomicCascadeEngine` formulas (fuel efficiency loss + time loss calculations) referenced in the main plan.
