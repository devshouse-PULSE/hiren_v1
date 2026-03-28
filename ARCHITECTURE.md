# PULSE 2.0 — System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PULSE 2.0 System                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📱 PWA (React Native)                                               │
│  ┌────────────────────────────────────────────────────────┐         │
│  │  • 5 Sensor Streams (IMU, GPS, Camera, Audio)          │         │
│  │  • Real-time IRI estimation                            │         │
│  │  • Offline SQLite buffer                               │         │
│  │  • WebSocket client                                    │         │
│  └────────────────────────────────────────────────────────┘         │
│                            │                                         │
│                            │ WebSocket                               │
│                            │ wss://LAPTOP_IP:8000/ws/{session_id}   │
│                            ↓                                         │
│  💻 Backend (Python FastAPI)                                         │
│  ┌────────────────────────────────────────────────────────┐         │
│  │  WebSocket Handler                                      │         │
│  │    ↓                                                    │         │
│  │  SegmentManager (groups data into 100m chunks)         │         │
│  │    ↓                                                    │         │
│  │  PULSEPipeline (7 AI Agents)                           │         │
│  │    ├─ Agent 0: Sensor Fusion                           │         │
│  │    ├─ Agent 1: Depth Reconstructor                     │         │
│  │    ├─ Agent 2: Visual Assessor (Gemini/Ollama)        │         │
│  │    ├─ Agent 3: Acoustic Classifier                     │         │
│  │    ├─ Agent 4: Deterioration Oracle                    │         │
│  │    ├─ Agent 5: Economic Cascade                        │         │
│  │    ├─ Agent 6: Devil's Advocate                        │         │
│  │    └─ Agent 7: Government Pipeline                     │         │
│  │    ↓                                                    │         │
│  │  Save to output/debug/{session}/{segment}/             │         │
│  │                                                         │         │
│  │  REST API Endpoints:                                   │         │
│  │    • GET /api/live        (active sessions)            │         │
│  │    • GET /api/sessions    (all sessions)               │         │
│  │    • GET /api/stats       (global metrics)             │         │
│  │    • GET /api/sessions/{id}/segments                   │         │
│  └────────────────────────────────────────────────────────┘         │
│                            ↑                                         │
│                            │ HTTP/HTTPS                              │
│                            │ Polling every 5s                        │
│                            │                                         │
│  🌐 Frontend (Next.js)                                               │
│  ┌────────────────────────────────────────────────────────┐         │
│  │  Zustand Store (state management)                      │         │
│  │    ↓                                                    │         │
│  │  API Proxy (/api/pulse/*)                              │         │
│  │    → Forwards to Backend                               │         │
│  │    ↓                                                    │         │
│  │  Dashboard Pages:                                      │         │
│  │    • Overview (live metrics)                           │         │
│  │    • Agent Decisions (multi-agent reasoning)           │         │
│  │    • Anomalies (distress detection)                    │         │
│  │    • Context (visual feed)                             │         │
│  │    • System Health (pipeline status)                   │         │
│  └────────────────────────────────────────────────────────┘         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: From Phone to Dashboard

### 1. Data Collection (PWA → Backend)

```
Phone Sensors → PWA App → WebSocket → Backend
     ↓              ↓           ↓           ↓
  200Hz IMU    Timestamp   JSON Packet  SegmentManager
   1Hz GPS     Sync All    {type, data}  Accumulates
   2fps Cam    Channels                  until 100m
  10Hz Audio
```

**Packet Format:**
```json
{
  "type": "imu",
  "timestamp": 1709123456789,
  "data": {
    "ax": 0.12,
    "ay": -0.03,
    "az": 9.83,
    "rx": 0.01,
    "ry": 0.00,
    "rz": 0.02
  }
}
```

### 2. Processing (Backend Pipeline)

```
100m Segment Complete
    ↓
PULSEPipeline.process_segment()
    ↓
┌─────────────────────────────────────┐
│ Sequential Agent Execution:         │
│                                     │
│ 1. IRI Computer                     │
│    Input: IMU buffer                │
│    Output: iri_value (m/km)         │
│                                     │
│ 2. Depth Pipeline                   │
│    Input: Camera frames + IMU       │
│    Output: rut_depth_mm             │
│                                     │
│ 3. Visual Assessor                  │
│    Input: Camera frames             │
│    Output: distresses[], PCI        │
│                                     │
│ 4. Acoustic Classifier              │
│    Input: Audio buffer              │
│    Output: surface_type             │
│                                     │
│ 5. Sensor Fusion                    │
│    Input: All above outputs         │
│    Output: Unified segment dict     │
│    Resolves conflicts (IRI wins)    │
│                                     │
│ 6. Deterioration Oracle             │
│    Input: Fused segment             │
│    Output: 5-year trajectory        │
│                                     │
│ 7. Economic Cascade                 │
│    Input: Fused segment + OSM data  │
│    Output: Economic impact (₹)      │
│                                     │
│ 8. Devil's Advocate                 │
│    Input: All outputs               │
│    Output: Quality flags            │
│                                     │
│ 9. Government Pipeline              │
│    Input: All outputs               │
│    Output: PMGSY application        │
└─────────────────────────────────────┘
    ↓
Save to output/debug/{session}/{segment}/
    ├─ pipeline_result.json
    ├─ iri_result.json
    ├─ visual_result.json
    ├─ depth_result.json
    ├─ captured_frames/
    └─ vlm_input_frames/
    ↓
Send result back to PWA via WebSocket
```

### 3. Visualization (Frontend Dashboard)

```
Frontend Zustand Store
    ↓
Polls Backend Every 5s
    ↓
GET /api/live        → Active session telemetry
GET /api/sessions    → Historical sessions
GET /api/stats       → Global aggregates
GET /api/sessions/{id}/segments → Full segment data
    ↓
Update Dashboard Components
    ├─ Live Metrics (IRI, PCI, Speed)
    ├─ Agent Decision Log
    ├─ Distress Map
    ├─ Economic Impact
    └─ System Health
```

---

## Network Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Local WiFi Network                       │
│                    (192.168.1.x)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📱 Phone (192.168.1.50)                                     │
│     ├─ Expo Go App (PWA)                                    │
│     │  └─ WebSocket → wss://192.168.1.100:8000/ws/pulse_*  │
│     └─ Browser (optional)                                   │
│        └─ HTTPS → https://192.168.1.100:8000/app/          │
│                                                              │
│  💻 Laptop (192.168.1.100)                                   │
│     ├─ Backend (Port 8000)                                  │
│     │  ├─ WebSocket Server                                 │
│     │  ├─ REST API                                          │
│     │  └─ Static Files (/app/*, /debug-files/*)            │
│     │                                                        │
│     ├─ Frontend (Port 3000)                                 │
│     │  ├─ Next.js Dev Server                               │
│     │  └─ API Proxy (/api/pulse/* → Backend:8000)          │
│     │                                                        │
│     └─ Expo Dev Server (Port 8081)                          │
│        └─ Serves PWA bundle to phone                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Critical:** All devices must be on the same WiFi network!

---

## Port Configuration

| Service | Port | Protocol | Accessible From |
|---------|------|----------|-----------------|
| Backend API | 8000 | HTTPS | Phone, Frontend proxy |
| Backend WebSocket | 8000 | WSS | Phone (PWA) |
| Frontend Dashboard | 3000 | HTTP | Browser (localhost) |
| Expo Dev Server | 8081 | HTTP | Phone (Expo Go) |

---

## File System Structure

```
backend/
├── backend/
│   ├── main.py              ← FastAPI app, WebSocket handler
│   ├── pipeline.py          ← Orchestrates 7 agents
│   ├── segment_manager.py   ← Groups packets into 100m segments
│   ├── agents/
│   │   ├── sensor_fusion.py
│   │   ├── visual_assessor.py
│   │   ├── deterioration_oracle.py
│   │   ├── economic_cascade.py
│   │   └── government_pipeline.py
│   └── sensors/
│       ├── iri_computer.py
│       ├── depth_pipeline.py
│       └── acoustic_classifier.py
├── output/
│   └── debug/
│       └── pulse_1234567890/    ← Session folder
│           └── seg_0001/        ← Segment folder
│               ├── pipeline_result.json
│               ├── iri_result.json
│               ├── visual_result.json
│               ├── captured_frames/
│               └── vlm_input_frames/
└── .env                     ← Configuration

frontend/
├── app/
│   ├── page.tsx             ← Dashboard overview
│   ├── agent-decisions/     ← Multi-agent reasoning view
│   ├── anomalies/           ← Distress detection view
│   ├── context/             ← Visual feed view
│   └── api/
│       └── pulse/[...path]/ ← Proxy to backend
│           └── route.ts
├── lib/
│   ├── store.ts             ← Zustand state management
│   └── firebase-service.ts  ← Auth only
└── .env.local               ← Configuration

PWA/
├── App.jsx                  ← Navigation root
├── screens/
│   ├── SetupScreen.jsx      ← Configure backend URL
│   ├── RecordingScreen.jsx  ← Main data collection UI
│   └── HistoryScreen.jsx    ← Past sessions
├── hooks/
│   ├── useIMU.js            ← Accelerometer/gyroscope
│   ├── useGPS.js            ← Location tracking
│   ├── useCamera.js         ← Frame capture
│   ├── useAudio.js          ← Microphone RMS
│   └── useRecordingEngine.js ← Orchestrates all sensors
└── services/
    ├── WebSocketClient.js   ← Backend connection
    └── OfflineBuffer.js     ← SQLite local storage
```

---

## State Management

### PWA State (React Native)
```javascript
// useRecordingEngine.js
{
  isRecording: boolean,
  display: {
    accelZ: number,
    currentIRI: number,
    speedKmh: number,
    distanceM: number,
    gpsCoords: {lat, lng},
    audioRMS: number,
    currentSegmentDistance: number,
    elapsedSeconds: number,
    wsStatus: 'connected' | 'disconnected' | 'off'
  },
  completedSegments: Array<Segment>,
  queueSize: number
}
```

### Backend State (Python)
```python
# main.py
active_sessions = {
  "pulse_1234567890": {
    "manager": SegmentManager,
    "pipeline": PULSEPipeline,
    "current_gps": {lat, lng},
    "current_speed_kmh": float
  }
}
```

### Frontend State (Zustand)
```typescript
// store.ts
{
  isConnected: boolean,
  hasActiveSession: boolean,
  currentGPS: {lat, lng},
  currentIRI: number,
  avgIRI: number,
  avgPCI: number,
  distressCount: number,
  sessions: Array<SessionSummary>,
  segments: Array<SegmentResult>,
  agentDecisions: Array<AgentDecision>
}
```

---

## API Endpoints Reference

### Backend REST API

```
GET  /health
     → {"status": "ok", "version": "1.0.0"}

WS   /ws/{session_id}
     → WebSocket connection for sensor data ingestion

GET  /api/live
     → {active: boolean, sessions: [...]}

GET  /api/sessions
     → {sessions: [{session_id, status, segment_count, avg_iri, ...}]}

GET  /api/stats
     → {total_sessions, total_segments, avg_iri, avg_pci, ...}

GET  /api/sessions/{session_id}/segments
     → {session_id, status, segments: [...]}

GET  /api/frames/{session_id}
     → {session_id, segments: [{segment_id, frames: [...]}]}

GET  /debug/sessions
     → {sessions: [{session_id, segments: [...]}]}

GET  /debug/{session_id}/{segment_id}
     → {files: {pipeline_result.json, iri_result.json, ...}}
```

### Frontend API Proxy

```
GET  /api/pulse/live
     → Proxies to Backend /api/live

GET  /api/pulse/sessions
     → Proxies to Backend /api/sessions

GET  /api/pulse/stats
     → Proxies to Backend /api/stats

GET  /api/pulse/sessions/{id}/segments
     → Proxies to Backend /api/sessions/{id}/segments
```

**Why proxy?** Bypasses CORS and SSL certificate issues.

---

## Security Considerations

### Self-Signed Certificates
- Backend uses `trustme` to generate self-signed SSL certs
- Required for HTTPS (needed for phone sensor access)
- Phone browser will show security warning — must accept

### CORS
- Backend allows all origins (`allow_origins=["*"]`)
- Acceptable for local development
- Production: Restrict to specific domains

### API Keys
- Gemini API key stored in backend `.env`
- Never committed to version control
- Frontend doesn't need API keys (proxies through backend)

---

## Performance Optimization

### Intel Iris Xe Specific:
1. **Depth Anything V2:** Runs on CPU (~2-5 fps)
   - Strategy: Post-process recorded video
   - PWA records at 2fps (acceptable)

2. **Visual Assessment:** Use Gemini API
   - Cloud-based, no local compute
   - 2-5 seconds per segment

3. **IRI Computation:** CPU-only, very fast
   - Real-time capable
   - Most important metric

### Data Flow Optimization:
- PWA buffers offline in SQLite
- WebSocket auto-reconnects
- Backend processes segments asynchronously
- Frontend polls every 5s (not real-time WebSocket)

---

## Debugging Tools

### Backend Logs
```bash
# Backend terminal shows:
INFO: Client connected for session: pulse_1234567890
INFO: [pulse_1234567890] Processing segment: seg_0001
INFO: IRI computation: 3.2 m/km (Fair condition)
INFO: Gemini VLM: 3.4s, segment=seg_0001
```

### Frontend Console
```javascript
// Browser console (F12):
console.log('Connected to PULSE backend')
console.log('Fetched 5 segments')
console.log('Agent decisions:', agentDecisions)
```

### Debug Viewer
```
https://localhost:8000/debug/viewer
```
Shows all raw JSON files and images for each segment.

---

## Deployment Considerations

### Local Development (Current Setup)
- Backend: `python run_https.py`
- Frontend: `npm run dev`
- PWA: `npx expo start`

### Production Deployment
- Backend: Use `gunicorn` with `uvicorn` workers
- Frontend: `npm run build` → static export
- PWA: Build native apps with `expo run:android/ios`

### Cloud Deployment (Optional)
- Backend: Deploy to AWS/GCP/Azure
- Frontend: Deploy to Vercel/Netlify
- PWA: Publish to Play Store/App Store

---

This architecture enables:
- ✅ Real-time sensor data collection
- ✅ Multi-agent AI processing
- ✅ Live dashboard visualization
- ✅ Offline-first operation
- ✅ Intel Iris Xe compatibility
