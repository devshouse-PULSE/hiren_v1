# PULSE 2.0 — Intel Iris Xe Setup Guide

**Hardware:** Intel i5 13th Gen + Iris Xe Integrated Graphics  
**Challenge:** No dedicated GPU → Need CPU-compatible alternatives

---

## Visual Assessment Options (Choose ONE)

### ✅ Option A: Gemini API (RECOMMENDED)

**Why:** Fast (2-5s per segment), free tier, excellent quality, no local compute needed

**Setup:**
1. Get free API key: https://aistudio.google.com/apikey
2. Edit `backend/.env`:
   ```
   GEMINI_API_KEY=your_key_here
   ```
3. Done! Visual assessment will use Gemini 2.0 Flash automatically

**Pros:**
- Fast inference (~2-5 seconds per segment)
- No RAM/CPU overhead on your laptop
- Best quality results
- Free tier: 1500 requests/day (enough for ~500 segments = 50km of road)

**Cons:**
- Requires internet connection
- Sends images to Google (not fully offline)

---

### Option B: Ollama CPU Mode (Fully Local)

**Why:** Completely offline, no cloud dependency, but slower

**Setup:**
1. Install Ollama: https://ollama.ai/download
2. Pull a CPU-compatible vision model:
   ```bash
   # Recommended: Better quality, needs 7GB RAM
   ollama pull llama3.2-vision:11b-q4
   
   # OR Faster: Lower quality, needs 4GB RAM
   ollama pull llava:7b-q4
   ```
3. Start Ollama:
   ```bash
   ollama serve
   ```
4. Leave `GEMINI_API_KEY` empty in `.env` — system will auto-use Ollama

**Performance:**
- llama3.2-vision:11b-q4: ~15-30 seconds per segment (7GB RAM)
- llava:7b-q4: ~10-15 seconds per segment (4GB RAM, lower quality)

**Pros:**
- Fully offline
- No API costs
- Complete data privacy

**Cons:**
- Slow (10-30s per segment vs 2-5s with Gemini)
- Uses significant RAM
- Lower quality than Gemini

---

### Option C: Disable Visual Assessment

**Why:** Fastest, minimal compute, still get physics-grade IRI + depth measurements

**Setup:**
1. Leave `GEMINI_API_KEY` empty in `.env`
2. Don't pull any Ollama models
3. System will skip visual assessment automatically

**What Still Works:**
- ✅ IRI computation (accelerometer physics) — the most important metric
- ✅ 3D rut depth measurement (Depth Anything V2 on CPU)
- ✅ Acoustic surface classification
- ✅ GPS tracking and segmentation
- ❌ Visual distress detection (potholes, cracks) — disabled
- ❌ PCI score estimation — disabled

**Performance:**
- ~5-10 seconds per segment (vs 15-35s with visual assessment)

---

## Depth Anything V2 on CPU

The depth pipeline will automatically run on CPU with Iris Xe. Expect:
- **Speed:** ~2-5 fps (vs 30 fps on dedicated GPU)
- **Strategy:** Post-process recorded video, not real-time
- **Impact:** Record your drive, then process offline — perfectly acceptable for hackathon demo

---

## Recommended Configuration for Iris Xe

```env
# backend/.env

# Option A: Use Gemini (recommended)
GEMINI_API_KEY=your_gemini_key_here

# Backend settings
PULSE_API_URL=https://localhost:8000
```

**Why this works:**
- IRI computation is CPU-only and very fast (core feature)
- Depth Anything V2 runs acceptably on CPU for post-processing
- Gemini API handles the heavy vision work in the cloud
- Total processing: ~10-15 seconds per 100m segment (vs 5-8s on RTX 4050)

---

## Installation Steps

```bash
# 1. Install Python dependencies
cd backend
pip install -r requirements.txt

# 2. Run model setup script
python models/download_models.py
# Choose Option A (Gemini) when prompted

# 3. Configure environment
copy .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 4. Test the setup
python -c "from backend.agents.visual_assessor import VisualRoadAssessor; print('✓ Visual assessor ready')"

# 5. Start backend
python run_https.py
```

---

## Performance Comparison

| Component | RTX 4050 (6GB) | Iris Xe (Gemini) | Iris Xe (Ollama CPU) |
|-----------|----------------|------------------|----------------------|
| IRI Computation | Real-time | Real-time | Real-time |
| Depth Anything V2 | 30 fps | 2-5 fps | 2-5 fps |
| Visual Assessment | 3-5s | 2-5s | 15-30s |
| **Total per 100m** | **5-8s** | **10-15s** | **30-60s** |

---

## Troubleshooting

**"Depth model is slow"**
- Expected on CPU. Record video first, process offline.
- Reduce frame rate in PWA: camera @ 1fps instead of 2fps

**"Gemini API quota exceeded"**
- Free tier: 1500 requests/day
- Each segment = 1 request
- Solution: Process in batches, or use Ollama CPU mode

**"Ollama is too slow"**
- Switch to Gemini API (Option A)
- Or disable visual assessment (Option C) — IRI alone is still valuable

**"Out of memory"**
- Close other applications
- Use llava:7b-q4 instead of llama3.2-vision:11b-q4 (needs less RAM)
- Or use Gemini API (no local memory needed)

---

## What You Lose vs Dedicated GPU

**Still Works:**
- ✅ IRI measurement (physics-grade, most important)
- ✅ 3D rut depth (slower but accurate)
- ✅ GPS tracking and segmentation
- ✅ All 7 AI agents
- ✅ Economic cascade analysis
- ✅ PMGSY application generation

**Slower:**
- Depth processing: 2-5 fps vs 30 fps (post-process instead of real-time)
- Visual assessment: 2-30s vs 3-5s (depending on Gemini vs Ollama)

**Not Available:**
- ORB-SLAM3 scale anchor (needs GPU) — system uses 2/3 scale anchors instead

**Bottom line:** System is fully functional on Iris Xe, just slower. Use Gemini API for best experience.
