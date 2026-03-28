# DPVO Integration Guide — WSL Ubuntu → Windows Backend

## Overview

You have DPVO installed in a conda environment in WSL Ubuntu. This guide shows how to integrate it with your Windows backend using a microservice bridge.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Windows (Backend)                                          │
│  ├─ FastAPI (main.py)                                       │
│  ├─ PULSEPipeline                                           │
│  └─ SLAMWrapper ──HTTP──┐                                   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          │ localhost:5555
                          │
┌─────────────────────────┼───────────────────────────────────┐
│  WSL Ubuntu             │                                   │
│  └─ DPVO Service (Flask)                                    │
│     ├─ Receives frames via HTTP POST                        │
│     ├─ Processes with DPVO (conda env)                      │
│     └─ Returns scale estimate                               │
└─────────────────────────────────────────────────────────────┘
```

## Why This Approach?

1. **DPVO requires CUDA** - Your WSL Ubuntu has proper CUDA setup
2. **Windows backend is simpler** - No need to rebuild DPVO on Windows
3. **Microservice pattern** - Clean separation, easy to debug
4. **Zero impact** - If DPVO service is down, system falls back to 2/3 anchors

---

## Step 1: Create DPVO Microservice in WSL

### 1.1 Create the Service File

In your WSL Ubuntu, create `dpvo_service.py`:

```bash
cd ~
mkdir dpvo_service
cd dpvo_service
nano dpvo_service.py
```

Paste this code:

```python
"""
DPVO Microservice for PULSE
Runs in WSL Ubuntu conda environment, serves Windows backend via HTTP
"""

from flask import Flask, request, jsonify
import numpy as np
import torch
import cv2
import base64
from io import BytesIO
from PIL import Image
import logging

# Initialize Flask
app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize DPVO
dpvo_instance = None
frame_count = 0

def init_dpvo():
    """Initialize DPVO on first request (lazy loading)"""
    global dpvo_instance
    if dpvo_instance is None:
        try:
            from dpvo.dpvo import DPVO
            dpvo_instance = DPVO(
                cfg="config/default.yaml",
                network="dpvo.pth",
                viz=False
            )
            logger.info("✓ DPVO initialized successfully")
        except Exception as e:
            logger.error(f"✗ DPVO initialization failed: {e}")
            dpvo_instance = None
    return dpvo_instance is not None

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "dpvo_loaded": dpvo_instance is not None,
        "frames_processed": frame_count
    })

@app.route('/process_frame', methods=['POST'])
def process_frame():
    """
    Process a single frame with DPVO
    
    Request JSON:
    {
        "frame": "base64_encoded_image",
        "timestamp": 1234567890.123,
        "intrinsics": {"fx": 800, "fy": 800, "cx": 320, "cy": 240}
    }
    
    Response JSON:
    {
        "scale": 1.234,
        "success": true
    }
    """
    global frame_count
    
    try:
        # Initialize DPVO if needed
        if not init_dpvo():
            return jsonify({"success": False, "error": "DPVO not initialized"}), 500
        
        # Parse request
        data = request.get_json()
        frame_b64 = data.get('frame')
        timestamp = data.get('timestamp', 0.0)
        intrinsics_dict = data.get('intrinsics', {})
        
        # Decode frame
        frame_bytes = base64.b64decode(frame_b64)
        image = Image.open(BytesIO(frame_bytes))
        frame = np.array(image)
        
        # Convert BGR to RGB if needed
        if len(frame.shape) == 3 and frame.shape[2] == 3:
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Prepare intrinsics tensor
        fx = intrinsics_dict.get('fx', frame.shape[1] * 0.8)
        fy = intrinsics_dict.get('fy', frame.shape[0] * 0.8)
        cx = intrinsics_dict.get('cx', frame.shape[1] / 2.0)
        cy = intrinsics_dict.get('cy', frame.shape[0] / 2.0)
        intrinsics = torch.tensor([fx, fy, cx, cy], dtype=torch.float32)
        
        # Convert frame to tensor (1, 3, H, W) normalized to [0, 1]
        frame_tensor = torch.from_numpy(frame).permute(2, 0, 1).float().unsqueeze(0) / 255.0
        
        # Process with DPVO
        dpvo_instance(frame_tensor, intrinsics, timestamp)
        poses, _ = dpvo_instance.terminate()
        
        # Extract scale from trajectory
        scale = None
        if poses is not None and len(poses) > 1:
            translation = poses[-1, :3, 3]
            scale = float(np.linalg.norm(translation))
            if scale < 0.001:
                scale = None
        
        frame_count += 1
        
        return jsonify({
            "success": True,
            "scale": scale,
            "frames_processed": frame_count
        })
        
    except Exception as e:
        logger.error(f"Frame processing error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/reset', methods=['POST'])
def reset():
    """Reset DPVO state for new session"""
    global dpvo_instance, frame_count
    dpvo_instance = None
    frame_count = 0
    return jsonify({"success": True, "message": "DPVO reset"})

if __name__ == '__main__':
    # Run on all interfaces so Windows can access it
    app.run(host='0.0.0.0', port=5555, debug=False)
```

### 1.2 Create Requirements File

```bash
nano requirements_dpvo.txt
```

```
flask==3.0.0
numpy
torch
opencv-python
pillow
dpvo
```

### 1.3 Install Dependencies in Conda Environment

```bash
# Activate your conda environment
conda activate dpvo  # or whatever your env name is

# Install Flask and dependencies
pip install flask numpy opencv-python pillow

# DPVO should already be installed
# If not: pip install dpvo
```

### 1.4 Test DPVO Service

```bash
# Start the service
python dpvo_service.py
```

You should see:
```
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5555
 * Running on http://172.x.x.x:5555
```

Test from another terminal:
```bash
curl http://localhost:5555/health
```

Should return:
```json
{"status": "healthy", "dpvo_loaded": false, "frames_processed": 0}
```

---

## Step 2: Update Windows Backend to Use DPVO Service

### 2.1 Update slam_wrapper.py

Add HTTP client support to communicate with WSL DPVO service:


```python
# Add to backend/backend/sensors/slam_wrapper.py

import requests
import base64
from io import BytesIO
from PIL import Image

class DPVORemoteClient:
    """
    Client for DPVO microservice running in WSL Ubuntu.
    Communicates via HTTP to localhost:5555
    """
    
    def __init__(self, service_url: str = "http://localhost:5555"):
        self.service_url = service_url
        self._available = self._check_health()
        
    def _check_health(self) -> bool:
        """Check if DPVO service is available"""
        try:
            resp = requests.get(f"{self.service_url}/health", timeout=2)
            return resp.status_code == 200
        except Exception:
            return False
    
    def process_frame(
        self,
        frame: np.ndarray,
        timestamp: float,
        intrinsics: Optional[dict] = None
    ) -> Optional[float]:
        """
        Send frame to DPVO service and get scale estimate.
        
        Args:
            frame: BGR numpy array (H, W, 3)
            timestamp: Frame timestamp in seconds
            intrinsics: Camera intrinsics dict (fx, fy, cx, cy)
        
        Returns:
            Scale estimate (float) or None
        """
        if not self._available:
            return None
        
        try:
            # Convert frame to base64
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb)
            buffer = BytesIO()
            pil_img.save(buffer, format='JPEG', quality=85)
            frame_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            # Prepare intrinsics
            if intrinsics is None:
                h, w = frame.shape[:2]
                intrinsics = {
                    'fx': w * 0.8,
                    'fy': h * 0.8,
                    'cx': w / 2.0,
                    'cy': h / 2.0
                }
            
            # Send request
            payload = {
                'frame': frame_b64,
                'timestamp': timestamp,
                'intrinsics': intrinsics
            }
            
            resp = requests.post(
                f"{self.service_url}/process_frame",
                json=payload,
                timeout=10
            )
            
            if resp.status_code == 200:
                result = resp.json()
                if result.get('success'):
                    return result.get('scale')
            
            return None
            
        except Exception as e:
            logger.debug(f"DPVO remote call failed: {e}")
            return None
    
    def reset(self):
        """Reset DPVO state for new session"""
        try:
            requests.post(f"{self.service_url}/reset", timeout=2)
        except Exception:
            pass
    
    @property
    def is_available(self) -> bool:
        return self._available
```

### 2.2 Integrate into SLAMWrapper

Update the `SLAMWrapper.__init__` method:

```python
def __init__(
    self,
    camera_height_m: float = 1.2,
    dpvo_config: Optional[dict] = None,
    dpvo_service_url: str = "http://localhost:5555",
):
    self.camera_height = camera_height_m
    self.backend = "none"
    self._vo = None
    
    # Try DPVO remote service first (WSL Ubuntu)
    dpvo_remote = DPVORemoteClient(dpvo_service_url)
    if dpvo_remote.is_available:
        self._vo = dpvo_remote
        self.backend = "dpvo_remote"
        logger.info("DPVO remote service (WSL) connected successfully.")
    # Then try local DPVO
    elif _DPVO_AVAILABLE:
        self._init_dpvo(dpvo_config or {})
    # Then stella_vslam
    elif _STELLA_AVAILABLE:
        self._init_stella()
    else:
        logger.info("No visual odometry backend available. Using IMU-only fallback.")
        self.backend = "imu_fallback"
```

Update `process_frame` method:

```python
def process_frame(
    self,
    frame: np.ndarray,
    timestamp: float,
    imu_measurements: Optional[list[dict]] = None,
) -> Optional[float]:
    """
    Feed a camera frame to the visual odometry backend.
    """
    if self.backend == "dpvo_remote" and self._vo is not None:
        return self._vo.process_frame(frame, timestamp)
    elif self.backend == "dpvo" and self._vo is not None:
        return self._process_dpvo(frame, timestamp)
    elif self.backend == "stella_vslam" and self._vo is not None:
        return self._process_stella(frame, timestamp)
    return None
```

---

## Step 3: Configure Backend Environment

### 3.1 Update backend/.env

Add DPVO service configuration:

```bash
# ── Visual Odometry (DPVO) ────────────────────────────────────
# DPVO service running in WSL Ubuntu
DPVO_SERVICE_URL=http://localhost:5555
DPVO_ENABLED=true
```

### 3.2 Update pipeline.py

The pipeline already uses `SLAMWrapper`, so no changes needed! The integration is automatic.

---

## Step 4: Start Everything

### 4.1 Terminal 1 (WSL Ubuntu) - Start DPVO Service

```bash
# In WSL Ubuntu
cd ~/dpvo_service
conda activate dpvo
python dpvo_service.py
```

Expected output:
```
 * Running on http://0.0.0.0:5555
✓ DPVO initialized successfully
```

### 4.2 Terminal 2 (Windows) - Start Backend

```bash
# In Windows PowerShell
cd backend
venv\Scripts\activate
python run_https.py
```

Expected output:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     DPVO remote service (WSL) connected successfully.
INFO:     Application startup complete.
```

### 4.3 Terminal 3 (Windows) - Start Frontend

```bash
cd frontend
npm run dev
```

### 4.4 Terminal 4 (Expo) - Start PWA

```bash
cd PWA
npx expo start
```

---

## Step 5: Verify Integration

### 5.1 Check DPVO Service Health

```bash
# From Windows PowerShell
curl http://localhost:5555/health
```

Expected:
```json
{
  "status": "healthy",
  "dpvo_loaded": true,
  "frames_processed": 0
}
```

### 5.2 Check Backend Logs

When you start recording from PWA, backend logs should show:

```
INFO: DPVO remote service (WSL) connected successfully.
INFO: Segment seg_0001 processed in 8.2s | IRI=3.4 | Condition=Fair
DEBUG: DPVO scale estimate: 1.234
```

### 5.3 Test Scale Fusion

Check `backend/output/debug/pulse_*/seg_0001/pipeline_result.json`:

```json
{
  "depth_3d": {
    "scale_used": 1.234,
    "scale_anchors": {
      "imu": 1.234,      // ← From DPVO!
      "ground": 1.189,
      "motion": 1.267
    }
  }
}
```

---

## Troubleshooting

### Issue 1: "Connection refused" to localhost:5555

**Cause:** DPVO service not running or WSL networking issue

**Fix:**
```bash
# In WSL, check if service is running
ps aux | grep dpvo_service

# If not running, start it
cd ~/dpvo_service
conda activate dpvo
python dpvo_service.py

# Check WSL IP address
ip addr show eth0

# If localhost doesn't work, use WSL IP in backend/.env:
# DPVO_SERVICE_URL=http://172.x.x.x:5555
```

### Issue 2: "DPVO not initialized"

**Cause:** DPVO installation issue in conda environment

**Fix:**
```bash
# In WSL
conda activate dpvo
pip install dpvo

# Or if that fails, install from source:
git clone https://github.com/princeton-vl/DPVO.git
cd DPVO
pip install -e .
```

### Issue 3: CUDA out of memory

**Cause:** DPVO trying to use GPU but insufficient VRAM

**Fix:** Reduce batch size or use CPU mode (slower):

```python
# In dpvo_service.py, modify init_dpvo():
dpvo_instance = DPVO(
    cfg="config/default.yaml",
    network="dpvo.pth",
    viz=False,
    device='cpu'  # Force CPU mode
)
```

### Issue 4: Slow processing (>5s per frame)

**Cause:** Network overhead or DPVO running on CPU

**Solutions:**
1. **Reduce frame rate:** Only send every 3rd frame to DPVO
2. **Batch processing:** Send multiple frames at once
3. **Use GPU:** Ensure CUDA is working in WSL

Check CUDA in WSL:
```bash
nvidia-smi
python -c "import torch; print(torch.cuda.is_available())"
```

### Issue 5: Backend falls back to IMU-only

**Cause:** DPVO service unreachable

**Check:**
```bash
# Windows PowerShell
curl http://localhost:5555/health

# If fails, check WSL networking:
wsl hostname -I
# Use that IP in DPVO_SERVICE_URL
```

---

## Performance Optimization

### Option 1: Frame Sampling (Recommended)

Only send every Nth frame to DPVO to reduce overhead:

```python
# In pipeline.py, modify _run_depth():
if frame_count % 3 == 0:  # Only every 3rd frame
    imu_scale = self._slam.process_frame(frame, timestamp)
```

### Option 2: Async Processing

Use async requests to avoid blocking:

```python
import asyncio
import aiohttp

async def process_frame_async(self, frame, timestamp):
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload) as resp:
            return await resp.json()
```

### Option 3: Local DPVO (Advanced)

If you can get DPVO working natively on Windows:

```bash
# Windows with CUDA
pip install dpvo
```

Then the system will use local DPVO instead of remote service (faster).

---

## System Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│  PWA (React Native)                                         │
│  └─ Captures: IMU @200Hz, Camera @2fps, GPS @1Hz           │
└────────────────────┬────────────────────────────────────────┘
                     │ WebSocket
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend (Windows - FastAPI)                                │
│  ├─ SegmentManager: Buffers 100m segments                   │
│  ├─ PULSEPipeline: Orchestrates 7 agents                    │
│  │  ├─ IRI Computer (IMU → roughness)                       │
│  │  ├─ Depth Pipeline (Camera → 3D)                         │
│  │  │  └─ SLAMWrapper ──HTTP──┐                             │
│  │  ├─ Visual Assessor (Gemini API)                         │
│  │  ├─ Acoustic Classifier                                  │
│  │  ├─ Sensor Fusion                                        │
│  │  ├─ Deterioration Oracle                                 │
│  │  ├─ Economic Cascade                                     │
│  │  ├─ Devil's Advocate                                     │
│  │  └─ Government Pipeline                                  │
└────────────────────┼───────────────────────────────────────┘
                     │ HTTP (localhost:5555)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  DPVO Service (WSL Ubuntu - Flask)                          │
│  └─ DPVO (conda env with CUDA)                              │
│     └─ Returns: Scale estimate for metric depth             │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. ✅ Create `dpvo_service.py` in WSL Ubuntu
2. ✅ Install Flask in conda environment
3. ✅ Start DPVO service: `python dpvo_service.py`
4. ✅ Update `slam_wrapper.py` with `DPVORemoteClient`
5. ✅ Add `DPVO_SERVICE_URL` to `backend/.env`
6. ✅ Test health endpoint: `curl http://localhost:5555/health`
7. ✅ Start backend and check logs for "DPVO remote service connected"
8. ✅ Record a segment and verify scale fusion in output JSON

---

## Alternative: Direct WSL Integration (Advanced)

If you want to run the entire backend in WSL Ubuntu instead:

```bash
# In WSL Ubuntu
cd /mnt/c/Users/YourName/Documents/Project/PULSE/backend
conda activate dpvo
pip install -r requirements.txt
pip install dpvo

# Run backend directly in WSL
python run_https.py
```

Then access from Windows at `http://172.x.x.x:8000` (use WSL IP).

This avoids the microservice bridge but requires all dependencies in WSL.

---

## Summary

You now have:
- ✅ DPVO running in WSL Ubuntu conda environment
- ✅ Flask microservice exposing DPVO via HTTP
- ✅ Windows backend connecting to DPVO service
- ✅ Automatic fallback if DPVO unavailable (2/3 anchors)
- ✅ Zero code changes to pipeline.py (clean integration)

The system will now use all 3 scale anchors:
1. **Anchor 1 (DPVO):** Visual odometry from WSL - weight 0.50
2. **Anchor 2 (Ground plane):** Camera height - weight 0.30  
3. **Anchor 3 (Optical flow):** GPS + motion - weight 0.20

This gives you the most accurate metric depth measurements! 🎉
