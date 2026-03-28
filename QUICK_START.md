# PULSE 2.0 — Quick Start (5 Minutes)

## One-Time Setup (First Time Only)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env`:
- Set `DEVICE=cpu`
- Add `GEMINI_API_KEY=your_key_here` (get from https://aistudio.google.com/apikey)

```bash
python models/download_models.py
# Choose Option A (Gemini) when prompted
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_PULSE_API_URL=https://YOUR_LAPTOP_IP:8000
```
Replace `YOUR_LAPTOP_IP` with your actual IP (run `ipconfig` to find it).

### 3. PWA Setup
```bash
cd PWA
npm install
```

---

## Every Time You Run (After Setup)

### Option A: Automatic (Windows)
```bash
# From project root
start_all.bat
```
This opens 3 terminals automatically!

### Option B: Manual (3 Terminals)

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

## Connect Your Phone

1. Install **Expo Go** app from Play Store/App Store
2. Ensure phone and laptop are on **same WiFi**
3. Open Expo Go → Scan QR code from Terminal 3
4. In PWA Setup screen, enter: `https://YOUR_LAPTOP_IP:8000`
5. Tap **Start Recording**

---

## View Dashboard

Open browser: `http://localhost:3000`

---

## That's It!

You now have:
- 📱 PWA collecting 5-channel sensor data
- 💻 Backend processing with 7 AI agents
- 🌐 Dashboard showing live results

Drive 100 meters and watch the magic happen!
