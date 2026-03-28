# PULSE 2.0 — Connection Guide

## How PWA, Backend, and Frontend Connect

---

## Visual Connection Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  📱 PHONE (Your Smartphone)                                              │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │                                                             │         │
│  │  PWA App (Expo Go)                                          │         │
│  │  Running on: exp://192.168.1.100:8081                       │         │
│  │                                                             │         │
│  │  User enters in Setup Screen:                              │         │
│  │  Backend URL: https://192.168.1.100:8000                   │         │
│  │                                                             │         │
│  │  When "Start Recording" pressed:                           │         │
│  │  ┌──────────────────────────────────────────────┐          │         │
│  │  │ 1. WebSocket connects to backend             │          │         │
│  │  │    wss://192.168.1.100:8000/ws/pulse_123456  │          │         │
│  │  │                                               │          │         │
│  │  │ 2. Sensors start streaming:                  │          │         │
│  │  │    • IMU @ 200Hz    → {"type":"imu", ...}    │          │         │
│  │  │    • GPS @ 1Hz      → {"type":"gps", ...}    │          │         │
│  │  │    • Camera @ 2fps  → {"type":"camera", ...} │          │         │
│  │  │    • Audio @ 10Hz   → {"type":"audio", ...}  │          │         │
│  │  │                                               │          │         │
│  │  │ 3. Receives back:                            │          │         │
│  │  │    {"type":"SEGMENT_COMPLETE", segment:{...}}│          │         │
│  │  └──────────────────────────────────────────────┘          │         │
│  │                                                             │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                          │
│                              │                                           │
│                              │ WebSocket (WSS)                           │
│                              │ Port 8000                                 │
│                              ↓                                           │
│                                                                          │
│  💻 LAPTOP (Your Computer)                                               │
│  IP: 192.168.1.100 (example - yours will be different)                  │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │                                                             │         │
│  │  BACKEND (Python FastAPI)                                   │         │
│  │  Running on: https://0.0.0.0:8000                           │         │
│  │                                                             │         │
│  │  Endpoints:                                                 │         │
│  │  ┌──────────────────────────────────────────────┐          │         │
│  │  │ WebSocket: /ws/{session_id}                  │          │         │
│  │  │   ← Receives sensor packets from PWA         │          │         │
│  │  │   → Sends SEGMENT_COMPLETE back to PWA       │          │         │
│  │  │                                               │          │         │
│  │  │ REST API:                                     │          │         │
│  │  │   GET /api/live        ← Frontend polls      │          │         │
│  │  │   GET /api/sessions    ← Frontend polls      │          │         │
│  │  │   GET /api/stats       ← Frontend polls      │          │         │
│  │  │   GET /api/sessions/{id}/segments            │          │         │
│  │  │                                               │          │         │
│  │  │ Static Files:                                 │          │         │
│  │  │   /app/index.html      ← PWA web version     │          │         │
│  │  │   /debug-files/*       ← Saved images/data   │          │         │
│  │  └──────────────────────────────────────────────┘          │         │
│  │                                                             │         │
│  └────────────────────────────────────────────────────────────┘         │
│                              ↑                                           │
│                              │ HTTP/HTTPS                                │
│                              │ Port 8000                                 │
│                              │                                           │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │                                                             │         │
│  │  FRONTEND (Next.js Dashboard)                               │         │
│  │  Running on: http://localhost:3000                          │         │
│  │                                                             │         │
│  │  API Proxy: /api/pulse/*                                    │         │
│  │  ┌──────────────────────────────────────────────┐          │         │
│  │  │ Browser requests:                            │          │         │
│  │  │   GET /api/pulse/live                        │          │         │
│  │  │   GET /api/pulse/sessions                    │          │         │
│  │  │   GET /api/pulse/stats                       │          │         │
│  │  │                                               │          │         │
│  │  │ Next.js proxy forwards to:                   │          │         │
│  │  │   → https://localhost:8000/api/live          │          │         │
│  │  │   → https://localhost:8000/api/sessions      │          │         │
│  │  │   → https://localhost:8000/api/stats         │          │         │
│  │  │                                               │          │         │
│  │  │ Why proxy? Bypasses CORS + SSL cert issues   │          │         │
│  │  └──────────────────────────────────────────────┘          │         │
│  │                                                             │         │
│  │  Zustand Store:                                             │         │
│  │    • Polls backend every 5 seconds                          │         │
│  │    • Updates dashboard components                           │         │
│  │    • Manages global state                                   │         │
│  │                                                             │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Step by Step

### Step 1: PWA Collects Data (Phone)
```
Sensors → useRecordingEngine → WebSocketClient
  ↓
IMU: 200 samples/second
GPS: 1 sample/second
Camera: 2 frames/second
Audio: 10 samples/second
  ↓
All timestamped and synchronized
  ↓
Sent via WebSocket to backend
```

### Step 2: Backend Processes (Laptop)
```
WebSocket receives packet
  ↓
SegmentManager.ingest_packet()
  ↓
Accumulates until 100m traveled (GPS distance)
  ↓
Triggers PULSEPipeline.process_segment()
  ↓
7 AI Agents run sequentially:
  1. IRI Computer (accelerometer → roughness)
  2. Depth Pipeline (camera → 3D rut depth)
  3. Visual Assessor (Gemini/Ollama → distresses)
  4. Acoustic Classifier (audio → surface type)
  5. Sensor Fusion (merge all channels)
  6. Deterioration Oracle (predict failure)
  7. Economic Cascade (calculate impact)
  8. Devil's Advocate (quality control)
  9. Government Pipeline (draft application)
  ↓
Save to output/debug/{session}/{segment}/
  ↓
Send SEGMENT_COMPLETE back to PWA
```

### Step 3: Frontend Displays (Browser)
```
Zustand Store polls backend every 5s
  ↓
GET /api/pulse/live → Active session data
GET /api/pulse/sessions → All sessions
GET /api/pulse/stats → Global metrics
GET /api/pulse/sessions/{id}/segments → Full segment data
  ↓
Update dashboard components:
  • Live metrics (IRI, PCI, speed)
  • Agent decision log
  • Distress map
  • Economic impact
  • System health
```

---

## Configuration Matrix

### What Goes Where?

| Setting | File | Purpose |
|---------|------|---------|
| Gemini API Key | `backend/.env` | Visual assessment + narratives |
| Device (cpu/cuda) | `backend/.env` | Hardware selection |
| Camera Height | `backend/.env` | Depth scale calibration |
| Backend URL | `frontend/.env.local` | Frontend → Backend connection |
| Backend URL | PWA Setup Screen | PWA → Backend connection |

### IP Address Usage:

**Laptop IP (e.g., 192.168.1.100):**
- Used by: PWA, Frontend
- Find with: `ipconfig` (Windows) or `ifconfig` (Linux/Mac)
- Must be on same WiFi as phone

**localhost (127.0.0.1):**
- Used by: Backend (binds to 0.0.0.0 but accessible via localhost)
- Used by: Frontend (runs on localhost:3000)
- NOT accessible from phone (use laptop IP instead)

---

## Port Forwarding (If Needed)

If phone can't reach laptop on local WiFi, use ngrok:

```bash
# Install ngrok: https://ngrok.com/download

# Forward port 8000
ngrok http 8000

# Use the ngrok URL in PWA Setup:
# https://abc123.ngrok.io
```

**Note:** Ngrok free tier has limits. Local WiFi is preferred.

---

## Testing Connections

### Test 1: Backend Health
```bash
# From laptop browser:
curl https://localhost:8000/health

# Expected:
{"status":"ok","version":"1.0.0"}
```

### Test 2: Frontend → Backend
```bash
# From laptop browser:
# Open http://localhost:3000
# Check browser console (F12)
# Should see API calls to /api/pulse/*
```

### Test 3: Phone → Backend
```bash
# From phone browser:
# Visit https://YOUR_LAPTOP_IP:8000/health
# Accept certificate warning
# Should see: {"status":"ok","version":"1.0.0"}
```

### Test 4: PWA → Backend WebSocket
```bash
# In PWA app:
# Setup screen → Enter backend URL → Start Recording
# Check backend terminal:
# Should see: "Client connected for session: pulse_*"
```

---

## Firewall Configuration (Windows)

If phone can't connect, allow port 8000:

```powershell
# Run as Administrator:
netsh advfirewall firewall add rule name="PULSE Backend" dir=in action=allow protocol=TCP localport=8000
```

Or via GUI:
1. Windows Security → Firewall & network protection
2. Advanced settings → Inbound Rules → New Rule
3. Port → TCP → 8000 → Allow connection

---

## Environment Variables Summary

### backend/.env
```env
DEVICE=cpu                                    # Intel Iris Xe
GEMINI_API_KEY=AIzaSy...                     # Your actual key
CAMERA_HEIGHT_M=1.20                          # Measure with ruler
GEMINI_MODEL=gemini-2.5-flash                # Model name
VLM_OLLAMA_MODEL=llama3.2-vision:11b-q4      # If using Ollama
BACKEND_HOST=0.0.0.0                          # Listen on all interfaces
BACKEND_PORT=8000                             # Default port
```

### frontend/.env.local (create this file)
```env
NEXT_PUBLIC_PULSE_API_URL=https://192.168.1.100:8000
```
**Replace 192.168.1.100 with YOUR laptop IP!**

### PWA (configured in-app)
- No .env file needed
- Enter backend URL in Setup Screen: `https://YOUR_LAPTOP_IP:8000`

---

## Success Indicators

### Backend Terminal:
```
INFO:     Uvicorn running on https://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Frontend Terminal:
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully
```

### PWA Terminal:
```
› Metro waiting on exp://192.168.1.100:8081
› Scan the QR code above with Expo Go
```

### Phone App:
- Setup screen loads
- Can enter backend URL
- "Start Recording" button enabled
- After starting: Sensor status dots turn green

### Dashboard:
- Login page loads
- After login: Shows metrics
- "Edge Node Status" shows "Connected"
- Metrics update when recording

---

## Troubleshooting Decision Tree

```
Can't connect from phone?
├─ Is backend running?
│  ├─ No → Run: python run_https.py
│  └─ Yes → Continue
├─ Same WiFi network?
│  ├─ No → Connect phone to same WiFi as laptop
│  └─ Yes → Continue
├─ Correct IP in PWA?
│  ├─ No → Run ipconfig, update PWA Setup screen
│  └─ Yes → Continue
├─ Firewall blocking?
│  ├─ Maybe → Allow port 8000 in Windows Firewall
│  └─ No → Continue
└─ SSL certificate accepted?
   ├─ No → Visit https://YOUR_IP:8000/health in phone browser, accept warning
   └─ Yes → Should work now!

Frontend not showing data?
├─ Is backend running?
│  └─ Check: https://localhost:8000/health
├─ Is .env.local configured?
│  └─ Check: NEXT_PUBLIC_PULSE_API_URL=https://YOUR_IP:8000
└─ Restart frontend after .env changes
   └─ Ctrl+C, then: npm run dev
```

---

## Network Requirements

### Minimum:
- Phone and laptop on same WiFi network
- Laptop IP address known
- Port 8000 accessible (firewall configured)

### Optimal:
- Strong WiFi signal (for WebSocket stability)
- Low latency (<50ms ping between devices)
- Stable connection (no dropouts)

### Test Network:
```bash
# From phone, ping laptop:
# Android: Use "Network Utilities" app
# iOS: Use "Network Ping Lite" app
# Ping: 192.168.1.100
# Should see: <50ms response time
```

---

## Data Persistence

### PWA (Phone):
- **SQLite database:** Stores sessions and segments offline
- **Location:** App's local storage
- **Survives:** App restarts, network disconnects
- **Cleared:** When app is uninstalled

### Backend (Laptop):
- **File system:** `backend/output/debug/{session}/{segment}/`
- **Format:** JSON files + JPEG images
- **Survives:** Backend restarts
- **Cleared:** Manual deletion only

### Frontend (Browser):
- **No persistence:** All data fetched from backend
- **Zustand store:** In-memory only
- **Cleared:** On page refresh (re-fetches from backend)

---

## Offline Behavior

### PWA Offline:
- Sensors keep recording
- Data buffered in SQLite
- WebSocket queues packets (up to 2000)
- Auto-reconnects when backend reachable
- Auto-drains queue on reconnect

### Backend Offline:
- PWA shows "disconnected" status
- Frontend shows "Cannot connect"
- Data remains in PWA SQLite
- No data loss

### Frontend Offline:
- Dashboard shows stale data
- No impact on PWA or backend
- Refresh when connection restored

---

## Real-Time vs Polling

### Real-Time (WebSocket):
- **PWA → Backend:** Sensor data streams
- **Backend → PWA:** Segment completion notifications
- **Latency:** <100ms
- **Frequency:** 200Hz (IMU), 1Hz (GPS), 2fps (camera)

### Polling (HTTP):
- **Frontend → Backend:** Dashboard data
- **Latency:** Up to 5 seconds
- **Frequency:** Every 5 seconds
- **Why not WebSocket?** Simpler, more reliable for dashboard

---

## Security Notes

### Self-Signed Certificates:
- Backend generates `key.pem` and `cert.pem` on startup
- Valid for: localhost, 127.0.0.1, YOUR_LAPTOP_IP
- Browser/phone will show warning — must accept
- **Production:** Use Let's Encrypt or proper CA

### API Keys:
- Gemini API key stored in `backend/.env`
- Never sent to frontend or PWA
- Backend makes API calls on behalf of clients
- **Production:** Use environment variables, not .env files

### CORS:
- Backend allows all origins (development)
- **Production:** Restrict to specific domains

---

## Bandwidth Usage

### PWA → Backend (Upload):
- IMU: ~10 KB/s (200 samples/s × 50 bytes)
- GPS: ~0.1 KB/s (1 sample/s × 100 bytes)
- Camera: ~50 KB/s (2 fps × 25 KB JPEG)
- Audio: ~1 KB/s (10 samples/s × 100 bytes)
- **Total:** ~60 KB/s = 0.5 Mbps

### Backend → Frontend (Download):
- Polling: ~5 KB per request × 12 requests/min = 1 KB/s
- Segment data: ~50 KB per segment
- **Total:** Negligible

**Conclusion:** Works fine on any WiFi network.

---

## Quick Commands Reference

```bash
# Find your laptop IP
ipconfig                    # Windows
ifconfig                    # Linux/Mac

# Start backend
cd backend
venv\Scripts\activate
python run_https.py

# Start frontend
cd frontend
npm run dev

# Start PWA
cd PWA
npx expo start

# Test backend
curl https://localhost:8000/health

# Check backend logs
# See Terminal 1 output

# Check frontend logs
# See Terminal 2 output

# Check PWA logs
# See Terminal 3 output + Expo Go app console
```

---

## You're All Set!

The three components are now connected:
- 📱 PWA streams sensor data to backend
- 💻 Backend processes with AI agents
- 🌐 Frontend displays results in real-time

Start recording and watch the system work!
