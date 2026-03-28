# PULSE 2.0 — Complete Setup Summary

## 📚 Documentation Index

1. **QUICK_START.md** — Get running in 5 minutes
2. **SETUP_GUIDE.md** — Detailed step-by-step instructions
3. **ARCHITECTURE.md** — System design and data flow
4. **INTEL_IRIS_XE_SETUP.md** — Hardware-specific configuration
5. **This file** — Quick reference

---

## ⚡ Super Quick Start

### First Time Setup (10 minutes):

```bash
# 1. Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# Edit .env: Add GEMINI_API_KEY, set DEVICE=cpu
python models/download_models.py

# 2. Frontend
cd frontend
npm install
# Create .env.local with NEXT_PUBLIC_PULSE_API_URL=https://YOUR_IP:8000

# 3. PWA
cd PWA
npm install
```

### Every Time You Run:

**Option 1 - Automatic (Windows):**
```bash
start_all.bat
```

**Option 2 - Manual (3 terminals):**
```bash
# Terminal 1
cd backend && venv\Scripts\activate && python run_https.py

# Terminal 2
cd frontend && npm run dev

# Terminal 3
cd PWA && npx expo start
```

---

## 🔗 Connection URLs

| Component | URL | Access From |
|-----------|-----|-------------|
| Backend API | `https://YOUR_LAPTOP_IP:8000` | Phone, Frontend |
| Frontend Dashboard | `http://localhost:3000` | Browser |
| PWA Dev Server | QR Code in Terminal 3 | Phone (Expo Go) |

**Replace `YOUR_LAPTOP_IP`** with your actual IP (run `ipconfig` to find it).

---

## 📱 Phone Setup

1. Install **Expo Go** from app store
2. Ensure phone and laptop on **same WiFi**
3. Scan QR code from Terminal 3
4. In PWA Setup screen:
   - Backend URL: `https://YOUR_LAPTOP_IP:8000`
   - Session name: `test_drive_1`
   - Camera height: `1.2` (measure your actual mount)
5. Tap **Start Recording**

---

## 🔧 Configuration Files

### backend/.env
```env
DEVICE=cpu
GEMINI_API_KEY=your_key_here
CAMERA_HEIGHT_M=1.20
```

### frontend/.env.local
```env
NEXT_PUBLIC_PULSE_API_URL=https://192.168.1.100:8000
```
(Replace with your laptop IP)

---

## ✅ Verification Checklist

- [ ] Backend running: `https://localhost:8000/health` returns `{"status":"ok"}`
- [ ] Frontend running: `http://localhost:3000` shows dashboard
- [ ] PWA showing QR code in terminal
- [ ] Phone and laptop on same WiFi
- [ ] Laptop IP address noted (from `ipconfig`)
- [ ] `.env` files configured
- [ ] Gemini API key added
- [ ] Can access backend from phone browser

---

## 🐛 Common Issues

### "Cannot connect from phone"
- Check WiFi: Phone and laptop on same network?
- Check firewall: Allow port 8000 in Windows Firewall
- Check backend: Is it running? See "Uvicorn running on..." in terminal

### "SSL Certificate Error"
- Expected with self-signed certs
- On phone browser: Visit `https://YOUR_IP:8000/health` → Accept warning
- Then PWA can connect

### "Frontend can't reach backend"
- Check `frontend/.env.local` has correct IP
- Restart frontend after changing .env: `npm run dev`

### "Slow processing"
- Expected on Intel Iris Xe (CPU mode)
- Gemini API: 10-15s per segment (recommended)
- Ollama CPU: 30-60s per segment
- Solution: Record first, process later

---

## 📊 What You Get

After driving 100 meters:
- ✅ IRI measurement (physics-grade road roughness)
- ✅ 3D rut depth (millimeter precision)
- ✅ Visual distress detection (potholes, cracks)
- ✅ Surface type classification (BC/WBM/Granular)
- ✅ 5-year deterioration prediction
- ✅ Economic impact analysis (₹)
- ✅ Auto-drafted PMGSY funding application

All visible in real-time dashboard!

---

## 🎯 Performance (Intel Iris Xe)

| Component | Speed |
|-----------|-------|
| IRI Computation | Real-time |
| Depth Processing | 2-5 fps (post-process) |
| Visual Assessment (Gemini) | 2-5s per segment |
| **Total per 100m** | **10-15 seconds** |

---

## 📁 Output Location

```
backend/output/debug/pulse_1234567890/
├── seg_0001/
│   ├── pipeline_result.json    ← Complete segment analysis
│   ├── iri_result.json         ← IRI computation details
│   ├── visual_result.json      ← VLM assessment
│   ├── captured_frames/        ← All camera frames
│   └── vlm_input_frames/       ← Frames sent to VLM
├── seg_0002/
└── ...
```

---

## 🚀 Next Steps

1. **Test Drive:**
   - Mount phone in car (rigid mount)
   - Measure camera height
   - Drive 100+ meters at 20+ km/h
   - Watch dashboard update

2. **View Results:**
   - Dashboard: `http://localhost:3000`
   - Debug viewer: `https://YOUR_IP:8000/debug/viewer`
   - Raw files: `backend/output/debug/`

3. **Customize:**
   - Adjust segment length in `backend/.env`
   - Change IRI thresholds in `backend/backend/sensors/iri_computer.py`
   - Modify dashboard in `frontend/app/`

---

## 📖 Full Documentation

- **SETUP_GUIDE.md** — Complete step-by-step setup
- **ARCHITECTURE.md** — System design and data flow
- **INTEL_IRIS_XE_SETUP.md** — Hardware-specific guide
- **QUICK_START.md** — 5-minute quick start

---

## 🆘 Support

**Get Gemini API Key:** https://aistudio.google.com/apikey  
**Download Ollama:** https://ollama.ai/download  
**Expo Go App:** Search "Expo Go" in app store

---

## 🎉 You're Ready!

Run `start_all.bat` and start collecting road data!

The system will:
1. Capture 5-channel sensor data from your phone
2. Process with 7 AI agents on your laptop
3. Display live results in the dashboard
4. Save everything for later analysis

**Happy road surveying!** 🛣️
