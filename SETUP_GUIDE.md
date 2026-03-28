# PULSE 2.0 — Complete Setup Guide
## Intel Iris Xe Compatible | Step-by-Step Instructions

---

## System Architecture Overview

```
📱 PWA (Phone)  ←→  💻 Backend (Laptop)  ←→  🌐 Frontend Dashboard (Browser)
   React Native      Python FastAPI           Next.js
   Port: N/A         Port: 8000               Port: 3000
   
   WebSocket         REST API
   Connection        Proxy
```

---

## Prerequisites

### Required Software:
- **Python 3.10+** (for backend)
- **Node.js 18+** (for frontend)
- **npm or yarn** (for PWA and frontend)
- **Git** (to clone/manage repo)

### Optional:
- **Ollama** (if using local visual assessment instead of Gemini API)

---

## Part 1: Backend Setup (Python FastAPI)

### Step 1: Install Python Dependencies

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install additional packages for Intel Iris Xe
pip install python-dotenv trustme
```

### Step 2: Configure Environment

```bash
# Copy the example environment file
copy .env.example .env

# Edit .env with your settings
notepad .env
```

**Required changes in `.env`:**
```env
# Set device to CPU for Intel Iris Xe
DEVICE=cpu

# Add your Gemini API key (RECOMMENDED)
# Get free key: https://aistudio.google.com/apikey
GEMINI_API_KEY=your_actual_gemini_key_here

# Measure your phone mount height above road (in metres)
CAMERA_HEIGHT_M=1.20
```

### Step 3: Download AI Models

```bash
# Run the model setup script
python models/download_models.py

# When prompted, choose:
#   A) Gemini API (recommended for Iris Xe)
#   B) Ollama CPU mode (slower but local)
#   C) Skip visual assessment
```

**If you chose Gemini (Option A):**
- Just add your API key to `.env` — done!

**If you chose Ollama (Option B):**
```bash
# Install Ollama from https://ollama.ai/download
# Then pull a model:
ollama pull llama3.2-vision:11b-q4

# Start Ollama in a separate terminal
ollama serve
```

### Step 4: Get Your Laptop's Local IP Address

```bash
# Windows:
ipconfig
# Look for "IPv4 Address" under your WiFi adapter
# Example: 192.168.1.100

# Linux/Mac:
ifconfig
# Look for "inet" under your WiFi interface
```

**Save this IP address** — you'll need it for PWA and frontend configuration.

### Step 5: Start the Backend

```bash
# From backend/ directory
python run_https.py
```

**Expected output:**
```
Generating self-signed cert for 192.168.1.100...
Certificates written to key.pem and cert.pem
==================================================
Starting PULSE Backend over HTTPS!
Access the frontend on your smartphone at:
https://192.168.1.100:8000/app/index.html
==================================================
```

**Keep this terminal running!** The backend must stay active.

**Test it:**
Open in browser: `https://localhost:8000/health`
Should return: `{"status":"ok","version":"1.0.0"}`

---

## Part 2: Frontend Dashboard Setup (Next.js)

### Step 1: Install Dependencies

```bash
# Open a NEW terminal
cd frontend

npm install
```

### Step 2: Configure Environment

```bash
# Create .env.local file
notepad .env.local
```

**Add this content** (replace with your laptop's IP):
```env
# Firebase (already configured in .env)
# No changes needed

# Backend API URL - REPLACE WITH YOUR LAPTOP IP
NEXT_PUBLIC_PULSE_API_URL=https://192.168.1.100:8000
```

### Step 3: Start the Frontend

```bash
# From frontend/ directory
npm run dev
```

**Expected output:**
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully
```

**Keep this terminal running!**

**Test it:**
Open in browser: `http://localhost:3000`
Should show the PULSE dashboard login page.

---

## Part 3: PWA Mobile App Setup (React Native)

### Step 1: Install Dependencies

```bash
# Open a NEW terminal
cd PWA

npm install
```

### Step 2: Start Expo Development Server

```bash
npx expo start
```

**Expected output:**
```
› Metro waiting on exp://192.168.1.100:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

### Step 3: Install Expo Go on Your Phone

- **Android:** Install "Expo Go" from Google Play Store
- **iOS:** Install "Expo Go" from App Store

### Step 4: Connect Phone to App

1. **Ensure phone and laptop are on the SAME WiFi network**
2. Open Expo Go app on your phone
3. Scan the QR code from the terminal
4. App will load on your phone

### Step 5: Configure Backend Connection in App

Once the app loads:
1. You'll see the **Setup Screen**
2. Enter your backend URL: `https://192.168.1.100:8000`
   - Replace `192.168.1.100` with YOUR laptop's IP from Step 4 of Backend Setup
3. Enter session name: `test_drive_1`
4. Enter camera height: `1.2` (or measure your actual phone mount height)
5. Tap **Start Recording**

---

## Connection Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    PULSE Connection Map                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📱 PWA (Phone)                                                  │
│  http://192.168.1.100:8081 (Expo Dev Server)                    │
│                    │                                             │
│                    │ WebSocket                                   │
│                    ↓                                             │
│  💻 Backend (Laptop)                                             │
│  https://192.168.1.100:8000                                      │
│  ├─ /ws/{session_id}        ← WebSocket (PWA sends sensor data) │
│  ├─ /api/live               ← REST (Frontend polls every 5s)    │
│  ├─ /api/sessions           ← REST (Frontend gets history)      │
│  ├─ /api/stats              ← REST (Frontend gets aggregates)   │
│  └─ /app/index.html         ← Static (PWA web version)          │
│                    ↑                                             │
│                    │ HTTP Proxy                                  │
│                    │                                             │
│  🌐 Frontend Dashboard (Browser)                                 │
│  http://localhost:3000                                           │
│  └─ /api/pulse/* → proxies to backend                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start Commands (All 3 Components)

Open **3 separate terminals**:

### Terminal 1: Backend
```bash
cd backend
venv\Scripts\activate  # Windows
python run_https.py
```

### Terminal 2: Frontend Dashboard
```bash
cd frontend
npm run dev
```

### Terminal 3: PWA Mobile App
```bash
cd PWA
npx expo start
```

Then:
1. Open browser: `http://localhost:3000` (dashboard)
2. Scan QR code with Expo Go on phone (mobile app)
3. In mobile app, enter backend URL: `https://YOUR_LAPTOP_IP:8000`

---

## Testing the Full Pipeline

### 1. Test Backend Alone

```bash
cd backend
python -c "from backend.pipeline import PULSEPipeline; print('✓ Pipeline ready')"
```

### 2. Test Backend API

Open browser: `https://localhost:8000/health`
Should return: `{"status":"ok","version":"1.0.0"}`

### 3. Test Frontend → Backend Connection

1. Open dashboard: `http://localhost:3000`
2. Check browser console (F12)
3. Should see: "Connected to PULSE backend" or similar

### 4. Test PWA → Backend Connection

1. Open PWA on phone
2. Enter backend URL: `https://YOUR_LAPTOP_IP:8000`
3. Tap "Start Recording"
4. Check backend terminal — should see: "Client connected for session: pulse_xxxxx"

---

## Troubleshooting

### "Cannot connect to backend from phone"

**Check 1:** Are phone and laptop on the same WiFi?
```bash
# On laptop, verify IP:
ipconfig  # Windows
ifconfig  # Linux/Mac
```

**Check 2:** Is Windows Firewall blocking port 8000?
```bash
# Allow port 8000 in Windows Firewall:
# Settings → Windows Security → Firewall → Advanced → Inbound Rules → New Rule
# Port: 8000, Protocol: TCP, Allow connection
```

**Check 3:** Is backend running?
```bash
# Should see this in backend terminal:
# INFO:     Uvicorn running on https://0.0.0.0:8000
```

### "SSL Certificate Error on Phone"

This is expected with self-signed certificates.

**On phone browser:**
1. Navigate to `https://YOUR_LAPTOP_IP:8000/health`
2. Click "Advanced" → "Proceed to site (unsafe)"
3. Now the PWA can connect

**In Expo Go app:**
- Expo Go may reject self-signed certs
- Solution: Use HTTP instead (less secure but works for local dev)
- Edit `backend/run_https.py` or run: `uvicorn backend.main:app --host 0.0.0.0 --port 8000`

### "Frontend shows 'Cannot connect to PULSE backend'"

**Check 1:** Is `NEXT_PUBLIC_PULSE_API_URL` set correctly?
```bash
# frontend/.env.local should have:
NEXT_PUBLIC_PULSE_API_URL=https://192.168.1.100:8000
```

**Check 2:** Restart frontend after changing .env:
```bash
# Stop frontend (Ctrl+C)
npm run dev
```

### "Depth Anything V2 is very slow"

Expected on Intel Iris Xe (CPU mode). Solutions:
- **Record first, process later:** PWA records all data, backend processes offline
- **Reduce frame rate:** In PWA, camera captures at 2fps — acceptable for post-processing
- **Skip depth if needed:** IRI alone is still valuable (the most important metric)

### "Gemini API quota exceeded"

Free tier: 1500 requests/day. Each 100m segment = 1 request.

**Solutions:**
- Process in smaller batches
- Switch to Ollama CPU mode (slower but unlimited)
- Disable visual assessment (IRI + depth still work)

---

## Network Configuration Summary

| Component | Port | Protocol | Access From |
|-----------|------|----------|-------------|
| Backend API | 8000 | HTTPS | Phone (PWA), Browser (Frontend proxy) |
| Frontend Dashboard | 3000 | HTTP | Browser (localhost) |
| PWA Dev Server | 8081 | HTTP | Phone (Expo Go) |

**Critical:** Phone and laptop MUST be on the same WiFi network!

---

## Data Flow Test

### 1. Start all 3 components (see Quick Start Commands above)

### 2. On phone (PWA):
- Open Expo Go → Scan QR code
- Setup screen: Enter `https://YOUR_LAPTOP_IP:8000`
- Tap "Start Recording"
- Walk around for 100 meters (or simulate with test mode)

### 3. Watch backend terminal:
```
INFO: Client connected for session: pulse_1234567890
INFO: [pulse_1234567890] Processing segment: seg_0001
INFO: Segment seg_0001 assembled with 20000 IMU readings and 200 frames
INFO: IRI computation: 3.2 m/km (Fair condition)
INFO: Gemini VLM: 3.4s, segment=seg_0001
INFO: Segment seg_0001 complete — saved to output/debug/
```

### 4. Check frontend dashboard:
- Open `http://localhost:3000`
- Should show:
  - Live session indicator
  - Current IRI value
  - Completed segments count
  - Real-time metrics updating

### 5. Verify data saved:
```bash
# Check output directory
dir backend\output\debug\pulse_*
# Should see folders: pulse_1234567890/seg_0001/
```

---

## Production Build (Optional)

### Build PWA for Production:
```bash
cd PWA
npx expo run:android  # For Android
npx expo run:ios      # For iOS (requires Mac)
```

### Build Frontend for Production:
```bash
cd frontend
npm run build
npm run start  # Runs on port 3000
```

### Run Backend in Production:
```bash
cd backend
gunicorn backend.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

---

## Performance Expectations (Intel Iris Xe)

| Metric | Performance |
|--------|-------------|
| IRI Computation | Real-time (CPU, very fast) |
| Depth Anything V2 | 2-5 fps (post-process recorded video) |
| Visual Assessment (Gemini) | 2-5 seconds per segment |
| Visual Assessment (Ollama CPU) | 15-30 seconds per segment |
| **Total Processing Time** | **10-15s per 100m** (Gemini) or **30-60s** (Ollama) |

**Strategy for Iris Xe:**
- Record your drive with PWA (real-time sensor capture)
- Backend processes segments as they complete (may lag behind)
- View results in dashboard after drive completes
- This is perfectly acceptable for hackathon demo!

---

## Quick Reference: All Commands

```bash
# ===== BACKEND =====
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# Edit .env: add GEMINI_API_KEY, set DEVICE=cpu
python models/download_models.py
python run_https.py

# ===== FRONTEND =====
cd frontend
npm install
# Create .env.local with NEXT_PUBLIC_PULSE_API_URL=https://YOUR_IP:8000
npm run dev

# ===== PWA =====
cd PWA
npm install
npx expo start
# Scan QR code with Expo Go app on phone
```

---

## Verification Checklist

- [ ] Backend running on `https://0.0.0.0:8000`
- [ ] Frontend running on `http://localhost:3000`
- [ ] PWA dev server showing QR code
- [ ] Phone and laptop on same WiFi
- [ ] Backend IP address noted (from `ipconfig`)
- [ ] `.env` files configured with correct IPs
- [ ] Gemini API key added to `backend/.env`
- [ ] Can access `https://YOUR_IP:8000/health` from phone browser
- [ ] Accepted self-signed certificate warning on phone

---

## Next Steps After Setup

1. **Camera Calibration** (optional but recommended):
   ```bash
   cd backend
   python calibration/camera_calibration.py
   ```

2. **Test Drive:**
   - Mount phone in car (rigid mount, rear camera facing road)
   - Measure camera height with ruler
   - Update `CAMERA_HEIGHT_M` in backend `.env`
   - Drive at 20+ km/h for 100+ meters
   - Watch segments appear in dashboard

3. **View Results:**
   - Dashboard: `http://localhost:3000`
   - Debug viewer: `https://YOUR_IP:8000/debug/viewer`
   - Raw data: `backend/output/debug/pulse_*/`

---

## Common Issues & Solutions

### "ModuleNotFoundError: No module named 'backend'"

```bash
# Make sure you're in the backend/ directory
cd backend

# Reinstall dependencies
pip install -r requirements.txt
```

### "Port 8000 already in use"

```bash
# Windows: Find and kill process
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Or change port in backend/.env:
BACKEND_PORT=8001
```

### "Frontend can't reach backend (502 Bad Gateway)"

Check `frontend/.env.local`:
```env
NEXT_PUBLIC_PULSE_API_URL=https://192.168.1.100:8000
```
Must match your laptop's actual IP!

### "PWA can't connect to WebSocket"

1. Verify backend is running: `https://YOUR_IP:8000/health`
2. Accept certificate warning in phone browser first
3. Check PWA Setup screen — URL must be `https://YOUR_IP:8000` (no trailing slash)
4. Check backend terminal for connection logs

---

## File Structure After Setup

```
backend/
├── .env                    ← Your configuration (DO NOT COMMIT)
├── key.pem, cert.pem       ← Auto-generated SSL certificates
├── venv/                   ← Python virtual environment
├── output/
│   └── debug/
│       └── pulse_*/        ← Recorded session data
└── models/                 ← Downloaded AI models (cached by HuggingFace)

frontend/
├── .env.local              ← Your configuration (DO NOT COMMIT)
└── .next/                  ← Build output

PWA/
└── (no local config needed — configured in-app)
```

---

## Support & Resources

- **Gemini API Key:** https://aistudio.google.com/apikey
- **Ollama Download:** https://ollama.ai/download
- **Expo Go App:** Search "Expo Go" in app store
- **Intel Iris Xe Guide:** See `INTEL_IRIS_XE_SETUP.md`

---

**Ready to roll!** Start all 3 terminals, connect your phone, and start recording road data.
