# PULSE 2.0 — Commands Cheat Sheet

## 🚀 Quick Start (Copy-Paste Ready)

### First Time Setup

```bash
# ===== STEP 1: Backend Setup =====
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env

# Edit .env: Add your Gemini API key
notepad .env
# Set: GEMINI_API_KEY=your_key_here
# Set: DEVICE=cpu

# Download models
python models/download_models.py
# Choose: A (Gemini API)

# ===== STEP 2: Frontend Setup =====
cd ..\frontend
npm install

# Create .env.local
echo NEXT_PUBLIC_PULSE_API_URL=https://localhost:8000 > .env.local
# Edit and replace localhost with your laptop IP (run ipconfig)

# ===== STEP 3: PWA Setup =====
cd ..\PWA
npm install

# Done! Now run the system (see below)
```

---

## 🏃 Running the System

### Automatic (Windows)
```bash
# From project root
start_all.bat
```

### Manual (3 Terminals)

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate
python run_https.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - PWA:**
```bash
cd PWA
npx expo start
```

---

## 🔍 Testing Commands

### Test Backend
```bash
# Health check
curl https://localhost:8000/health

# List sessions
curl https://localhost:8000/api/sessions

# Get stats
curl https://localhost:8000/api/stats

# Check if running
netstat -ano | findstr :8000
```

### Test Frontend
```bash
# Open in browser
start http://localhost:3000

# Check build
cd frontend
npm run build
```

### Test PWA
```bash
# Clear cache and restart
cd PWA
rm -rf node_modules/.cache
npx expo start --clear
```

---

## 🛠️ Troubleshooting Commands

### Find Your Laptop IP
```bash
# Windows
ipconfig
# Look for "IPv4 Address" under WiFi adapter

# Linux/Mac
ifconfig
# Look for "inet" under WiFi interface
```

### Kill Process on Port
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Or change port in backend/.env
```

### Check Python Environment
```bash
cd backend
venv\Scripts\activate
python --version
pip list | findstr torch
pip list | findstr fastapi
```

### Reinstall Dependencies
```bash
# Backend
cd backend
venv\Scripts\activate
pip install --upgrade -r requirements.txt

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install

# PWA
cd PWA
rm -rf node_modules package-lock.json
npm install
```

### Clear All Caches
```bash
# Backend
cd backend
rm -rf __pycache__ backend/__pycache__ backend/*/__pycache__

# Frontend
cd frontend
rm -rf .next

# PWA
cd PWA
rm -rf node_modules/.cache
```

---

## 📊 Monitoring Commands

### Watch Backend Logs
```bash
cd backend
venv\Scripts\activate
python run_https.py
# Keep terminal open, watch for:
# "Client connected for session: pulse_*"
# "Processing segment: seg_*"
# "IRI computation: X.X m/km"
```

### Watch Frontend Logs
```bash
cd frontend
npm run dev
# Keep terminal open, watch for:
# "compiled client and server successfully"
# "ready started server on 0.0.0.0:3000"
```

### Check Output Files
```bash
# List all sessions
dir backend\output\debug

# View specific session
dir backend\output\debug\pulse_1234567890

# View segment data
type backend\output\debug\pulse_1234567890\seg_0001\pipeline_result.json
```

---

## 🔧 Configuration Commands

### Update Backend Config
```bash
cd backend
notepad .env
# After changes, restart backend:
# Ctrl+C in Terminal 1, then: python run_https.py
```

### Update Frontend Config
```bash
cd frontend
notepad .env.local
# After changes, restart frontend:
# Ctrl+C in Terminal 2, then: npm run dev
```

### Get Gemini API Key
```bash
# Open in browser:
start https://aistudio.google.com/apikey
# Copy key, add to backend/.env
```

---

## 📦 Model Management

### Download Models
```bash
cd backend
venv\Scripts\activate
python models/download_models.py
```

### Check Downloaded Models
```bash
# HuggingFace cache
dir %USERPROFILE%\.cache\huggingface\hub

# Ollama models (if using)
ollama list
```

### Pull Ollama Models (Optional)
```bash
# If using Ollama instead of Gemini:
ollama pull llama3.2-vision:11b-q4
ollama pull llava:7b-q4

# Start Ollama
ollama serve
```

---

## 🧪 Testing Individual Components

### Test IRI Computation
```bash
cd backend
venv\Scripts\activate
python -c "from backend.sensors.iri_computer import compute_iri; print('✓ IRI module ready')"
```

### Test Visual Assessor
```bash
cd backend
venv\Scripts\activate
python -c "from backend.agents.visual_assessor import VisualRoadAssessor; print('✓ Visual assessor ready')"
```

### Test Pipeline
```bash
cd backend
venv\Scripts\activate
python -c "from backend.pipeline import PULSEPipeline; print('✓ Pipeline ready')"
```

### Test Frontend Build
```bash
cd frontend
npm run build
# Should complete without errors
```

### Test PWA Build
```bash
cd PWA
npx expo doctor
# Should show all dependencies OK
```

---

## 🔄 Reset Everything

### Reset Backend
```bash
cd backend
rm -rf output/debug/*
rm -rf __pycache__ backend/__pycache__
rm key.pem cert.pem
# Restart: python run_https.py
```

### Reset Frontend
```bash
cd frontend
rm -rf .next
# Restart: npm run dev
```

### Reset PWA
```bash
cd PWA
rm -rf node_modules/.cache
npx expo start --clear
```

---

## 📱 Phone Setup Commands

### Install Expo Go
```
Android: Play Store → Search "Expo Go"
iOS: App Store → Search "Expo Go"
```

### Accept SSL Certificate
```
1. Open phone browser
2. Visit: https://YOUR_LAPTOP_IP:8000/health
3. Click "Advanced" → "Proceed to site (unsafe)"
4. Now PWA can connect
```

### Configure PWA
```
1. Open Expo Go → Scan QR code
2. Setup Screen:
   - Backend URL: https://YOUR_LAPTOP_IP:8000
   - Session name: test_drive_1
   - Camera height: 1.2
3. Tap "Start Recording"
```

---

## 🎯 Performance Testing

### Measure Processing Time
```bash
# Check backend logs for:
# "Segment seg_0001 complete — processing time: 12.3s"

# Or check pipeline_result.json:
type backend\output\debug\pulse_*\seg_0001\pipeline_result.json | findstr processing_time
```

### Monitor Resource Usage
```bash
# Windows Task Manager
# Watch:
# - Python.exe (backend) — CPU usage
# - Node.exe (frontend + PWA) — CPU usage
# - Memory usage (should be <8GB total)
```

---

## 🆘 Emergency Commands

### Stop Everything
```bash
# Press Ctrl+C in all 3 terminals
# Or close terminal windows
```

### Force Kill Processes
```bash
# Windows
taskkill /F /IM python.exe
taskkill /F /IM node.exe

# Linux/Mac
pkill -f python
pkill -f node
```

### Check What's Running
```bash
# Windows
netstat -ano | findstr :8000
netstat -ano | findstr :3000
netstat -ano | findstr :8081

# Linux/Mac
lsof -i :8000
lsof -i :3000
lsof -i :8081
```

---

## 📝 Quick Reference

| Task | Command |
|------|---------|
| Find laptop IP | `ipconfig` |
| Start backend | `cd backend && venv\Scripts\activate && python run_https.py` |
| Start frontend | `cd frontend && npm run dev` |
| Start PWA | `cd PWA && npx expo start` |
| Test backend | `curl https://localhost:8000/health` |
| View dashboard | `http://localhost:3000` |
| View debug data | `https://localhost:8000/debug/viewer` |
| Check output | `dir backend\output\debug` |
| Get Gemini key | `https://aistudio.google.com/apikey` |

---

## 🎉 Success Checklist

- [ ] Backend shows: "Uvicorn running on https://0.0.0.0:8000"
- [ ] Frontend shows: "ready started server on 0.0.0.0:3000"
- [ ] PWA shows QR code
- [ ] Can access `https://localhost:8000/health` → `{"status":"ok"}`
- [ ] Can access `http://localhost:3000` → Dashboard loads
- [ ] Phone can scan QR code → PWA loads
- [ ] PWA Setup screen accepts backend URL
- [ ] "Start Recording" works → Backend logs "Client connected"
- [ ] After 100m → Dashboard shows new segment

**All checked?** You're ready to collect road data! 🛣️
