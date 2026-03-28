# DPVO Integration Checklist

## Prerequisites ✓

- [ ] WSL Ubuntu installed on Windows
- [ ] Conda environment with DPVO installed in WSL
- [ ] CUDA working in WSL (`nvidia-smi` shows GPU)
- [ ] Python 3.10+ in conda environment

## Installation Steps

### In WSL Ubuntu:

```bash
# 1. Navigate to project
cd /mnt/c/Users/YourUsername/Documents/Project/PULSE/backend

# 2. Activate conda environment
conda activate dpvo

# 3. Install Flask dependencies
pip install flask numpy opencv-python pillow

# 4. Verify DPVO is installed
python -c "import dpvo; print('DPVO OK')"

# 5. Make startup script executable
chmod +x start_dpvo_service.sh

# 6. Start DPVO service
./start_dpvo_service.sh
```

Expected output:
```
✓ DPVO initialized successfully
 * Running on http://0.0.0.0:5555
```

### In Windows PowerShell:

```powershell
# 1. Test DPVO service
curl http://localhost:5555/health

# Expected: {"status": "healthy", "dpvo_loaded": true, ...}

# 2. Start backend
cd backend
venv\Scripts\activate
python run_https.py

# Look for: "INFO: DPVO remote service (WSL) connected successfully."
```

## Verification Checklist

- [ ] DPVO service responds to health check
- [ ] Backend logs show "DPVO remote service connected"
- [ ] No errors in WSL terminal
- [ ] No errors in Windows backend terminal

## Testing Checklist

- [ ] Start PWA and begin recording
- [ ] Backend processes frames without errors
- [ ] Check `backend/output/debug/pulse_*/seg_0001/pipeline_result.json`
- [ ] Verify `scale_anchors.imu` has a value (not null)
- [ ] Verify `rut_depth_mm` is in reasonable range (10-50mm)

## Troubleshooting

### If health check fails:

```bash
# Check if service is running
ps aux | grep dpvo_service

# Check WSL IP
ip addr show eth0 | grep inet

# Try WSL IP instead of localhost
curl http://172.x.x.x:5555/health
```

### If backend can't connect:

1. Check `backend/.env` has:
   ```
   DPVO_ENABLED=true
   DPVO_SERVICE_URL=http://localhost:5555
   ```

2. Try WSL IP if localhost fails:
   ```
   DPVO_SERVICE_URL=http://172.x.x.x:5555
   ```

3. Check Windows Firewall isn't blocking port 5555

### If DPVO initialization fails:

```bash
# In WSL
conda activate dpvo
pip install --upgrade dpvo

# Test CUDA
python -c "import torch; print(torch.cuda.is_available())"
```

## Success Indicators

✅ WSL terminal shows:
```
✓ DPVO initialized successfully
INFO: DPVO scale estimate: 1.234
```

✅ Windows backend shows:
```
INFO: DPVO remote service (WSL) connected successfully.
DEBUG: DPVO scale estimate: 1.234
INFO: Segment seg_0001 processed | IRI=3.4
```

✅ Output JSON shows:
```json
{
  "scale_anchors": {
    "imu": 1.234,      // ← From DPVO!
    "ground": 1.189,
    "motion": 1.267
  }
}
```

## Quick Commands Reference

### Start DPVO Service (WSL):
```bash
cd /mnt/c/Users/YourUsername/Documents/Project/PULSE/backend
conda activate dpvo
python dpvo_service.py
```

### Test Health (Windows):
```powershell
curl http://localhost:5555/health
```

### Start Backend (Windows):
```powershell
cd backend
venv\Scripts\activate
python run_https.py
```

### View Logs (Windows):
```powershell
# Backend logs show in terminal
# Or check: backend/output/debug/pulse_*/logs/
```

## Performance Tips

- DPVO processes ~5-10 frames/second on GPU
- Network adds ~10-20ms overhead
- Consider processing every 3rd frame for speed
- Monitor GPU usage: `nvidia-smi` in WSL

## Done! 🎉

Once all checkboxes are ticked, you have:
- ✅ Agent 1 (Visual Odometry) fully operational
- ✅ 3/3 scale anchors for maximum depth accuracy
- ✅ Clean microservice architecture
- ✅ Graceful fallback if DPVO unavailable

See **DPVO_WSL_INTEGRATION.md** for detailed documentation.
