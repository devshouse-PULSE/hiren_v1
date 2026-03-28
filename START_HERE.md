# 🚀 PULSE 2.0 — START HERE

## What is PULSE?

PULSE turns your smartphone into a physics-grade road assessment instrument. It measures road roughness (IRI), detects potholes and cracks, predicts when roads will fail, and auto-generates government funding applications.

**Your Hardware:** Intel i5 13th Gen + Iris Xe → Fully supported with Gemini API!

---

## 📖 Documentation Guide

| Document | When to Read | Time |
|----------|--------------|------|
| **QUICK_START.md** | Want to run it NOW | 5 min |
| **COMMANDS_CHEATSHEET.md** | Need copy-paste commands | 2 min |
| **SETUP_GUIDE.md** | First time setup, detailed | 15 min |
| **CONNECTION_GUIDE.md** | Connection issues | 10 min |
| **ARCHITECTURE.md** | Understand system design | 10 min |
| **INTEL_IRIS_XE_SETUP.md** | Hardware-specific config | 5 min |

---

## ⚡ Fastest Path to Running

### 1. Get Gemini API Key (2 minutes)
- Visit: https://aistudio.google.com/apikey
- Click "Create API Key"
- Copy the key

### 2. Configure Backend (1 minute)
```bash
cd backend
copy .env.example .env
notepad .env
```
Add your key:
```
GEMINI_API_KEY=your_key_here
DEVICE=cpu
```

### 3. Install Everything (5 minutes)
```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python models/download_models.py  # Choose A (Gemini)

# Frontend
cd ..\frontend
npm install

# PWA
cd ..\PWA
npm install
```

### 4. Find Your Laptop IP (30 seconds)
```bash
ipconfig
# Note the IPv4 Address (e.g., 192.168.1.100)
```

### 5. Configure Frontend (30 seconds)
```bash
cd frontend
echo NEXT_PUBLIC_PULSE_API_URL=https://192.168.1.100:8000 > .env.local
# Replace 192.168.1.100 with YOUR IP from step 4
```

### 6. Run Everything (30 seconds)
```bash
# From project root
start_all.bat
```

### 7. Connect Phone (1 minute)
- Install Expo Go app
- Scan QR code from Terminal 3
- Enter backend URL: `https://YOUR_LAPTOP_IP:8000`
- Tap "Start Recording"

### 8. View Dashboard (10 seconds)
- Open browser: `http://localhost:3000`
- Watch live data appear!

---

## 🎯 What Each Component Does

```
📱 PWA (Phone App)
   └─ Collects 5 sensor streams
   └─ Sends to backend via WebSocket
   └─ Shows live IRI and sensor status

💻 Backend (Laptop)
   └─ Receives sensor data
   └─ Groups into 100m segments
   └─ Runs 7 AI agents
   └─ Saves results to files
   └─ Provides REST API

🌐 Frontend (Browser)
   └─ Polls backend every 5s
   └─ Shows live dashboard
   └─ Displays agent decisions
   └─ Maps distresses
```

---

## 🔗 Connection Summary

```
Phone (PWA) ─────WebSocket────→ Laptop (Backend) ←────HTTP────── Browser (Frontend)
   Port: N/A                      Port: 8000                      Port: 3000
   
   Sends:                         Receives:                       Polls:
   • IMU @ 200Hz                  • Sensor packets                • /api/live
   • GPS @ 1Hz                    • Processes segments            • /api/sessions
   • Camera @ 2fps                • Runs AI agents                • /api/stats
   • Audio @ 10Hz                 • Saves results                 • /api/segments
```

**Critical:** Phone and laptop must be on the **same WiFi network**!

---

## ✅ Verification Steps

After running `start_all.bat`:

1. **Check Terminal 1 (Backend):**
   ```
   ✓ Should see: "Uvicorn running on https://0.0.0.0:8000"
   ```

2. **Check Terminal 2 (Frontend):**
   ```
   ✓ Should see: "ready started server on 0.0.0.0:3000"
   ```

3. **Check Terminal 3 (PWA):**
   ```
   ✓ Should see: QR code displayed
   ```

4. **Test Backend:**
   - Open: `https://localhost:8000/health`
   - Should return: `{"status":"ok","version":"1.0.0"}`

5. **Test Frontend:**
   - Open: `http://localhost:3000`
   - Should show: PULSE dashboard login

6. **Test Phone Connection:**
   - Phone browser: `https://YOUR_LAPTOP_IP:8000/health`
   - Accept certificate warning
   - Should return: `{"status":"ok"}`

---

## 🐛 Common Issues & Fixes

| Problem | Solution |
|---------|----------|
| "Cannot connect from phone" | Check WiFi, firewall, and IP address |
| "SSL certificate error" | Accept warning in phone browser first |
| "Port 8000 in use" | Kill process: `taskkill /F /IM python.exe` |
| "Frontend 502 error" | Check backend is running |
| "Slow processing" | Expected on Iris Xe — use Gemini API |
| "Module not found" | Reinstall: `pip install -r requirements.txt` |

**Full troubleshooting:** See `CONNECTION_GUIDE.md`

---

## 📂 Important Files

### Configuration Files (Edit These):
- `backend/.env` — Backend settings, API keys
- `frontend/.env.local` — Frontend backend URL

### Generated Files (Auto-created):
- `backend/key.pem`, `cert.pem` — SSL certificates
- `backend/output/debug/` — Processed data

### Don't Commit:
- `backend/.env`
- `frontend/.env.local`
- `backend/key.pem`, `cert.pem`
- `backend/output/`
- `node_modules/`
- `venv/`

---

## 🎓 Learning Path

1. **Just want it running?**
   → Read: `QUICK_START.md`

2. **Need detailed setup?**
   → Read: `SETUP_GUIDE.md`

3. **Connection problems?**
   → Read: `CONNECTION_GUIDE.md`

4. **Want to understand the system?**
   → Read: `ARCHITECTURE.md`

5. **Hardware-specific questions?**
   → Read: `INTEL_IRIS_XE_SETUP.md`

6. **Need commands?**
   → Read: `COMMANDS_CHEATSHEET.md`

---

## 🎯 Your Next Steps

1. ✅ Get Gemini API key
2. ✅ Run setup commands (see above)
3. ✅ Find your laptop IP (`ipconfig`)
4. ✅ Configure `.env` files
5. ✅ Run `start_all.bat`
6. ✅ Connect phone with Expo Go
7. ✅ Start recording
8. ✅ View dashboard

**Estimated time:** 10 minutes first time, 30 seconds every time after.

---

## 💡 Pro Tips

- **Use Gemini API** — fastest for Iris Xe (2-5s per segment)
- **Record first, process later** — PWA buffers offline
- **Mount phone rigidly** — loose mounting adds noise to IRI
- **Drive 20+ km/h** — minimum speed for valid IRI
- **Measure camera height** — critical for depth accuracy

---

## 🆘 Need Help?

1. Check `CONNECTION_GUIDE.md` troubleshooting section
2. Check backend terminal for error messages
3. Check browser console (F12) for frontend errors
4. Check Expo Go app console for PWA errors

---

## 🎉 Ready to Go!

You have everything you need. Run `start_all.bat` and start collecting road data!

**Questions?** Check the documentation files listed above.

**Let's build something amazing!** 🛣️✨
