# PULSE Backend — Complete Reference Documentation

> **Project:** PULSE (Pavement Understanding through Live Sensor Evaluation)
> **Stack:** FastAPI · Python 3.11 · NumPy · PyTorch · HuggingFace Transformers · Open3D · Gemini API · Overpass/OSM
> **Generated:** 2026-03-28

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Architecture & Data Flow](#2-architecture--data-flow)
3. [What is Actually Done vs Simulated](#3-what-is-actually-done-vs-simulated)
4. [Parameters — Hardcoded vs Live](#4-parameters--hardcoded-vs-live)
5. [Agents & Sensors — Detailed Breakdown](#5-agents--sensors--detailed-breakdown)
6. [API Reference — All Endpoints](#6-api-reference--all-endpoints)
7. [WebSocket Message Schema](#7-websocket-message-schema)
8. [External Integrations](#8-external-integrations)
9. [Debug Output Layout](#9-debug-output-layout)
10. [Simulation Script](#10-simulation-script)

---

## 1. System Overview

PULSE is a road quality assessment backend. A smartphone mounted in a vehicle sends real-time sensor data (GPS, IMU, camera frames, IRI) over a WebSocket. The backend groups this data into 100-metre physical road **segments** and runs a multi-agent ML pipeline on each one:

```
Smartphone  ──WebSocket──►  Segment Manager (100m buffers)
                                     │
                                     ▼
   ┌─────────────────────────────────────────────────────────┐
   │                    PULSEPipeline                        │
   │   Sensor A: IRI (edge-computed on PWA, received here)  │
   │   Sensor B: Depth Pipeline (Depth-Anything-V2 + SLAM)  │
   │   Agent 2: Visual Assessor (Gemini Flash API / OpenCV) │
   │   Agent 0: Sensor Fusion                               │
   │   Agent 4: Deterioration Oracle (HDM-4 model)          │
   │   Agent 5: Economic Cascade Engine                     │
   │   Agent 6: Devil's Advocate (QA / challenge rules)     │
   │   Agent 7: Government Pipeline (PMGSY draft)           │
   └─────────────────────────────────────────────────────────┘
                                     │
                          WebSocket response + REST API
```

---

## 2. Architecture & Data Flow

### 2.1 Segment Manager (`segment_manager.py`)

Groups incoming packets into 100m physical segments using **Haversine distance** between consecutive GPS coordinates.

**Packet types accepted:**

| Type | What it does |
|------|-------------|
| `gps` | Records GPS point; triggers segment boundary check |
| `imu` | Appends `{ax, ay, az, rx, ry, rz}` to `imu_buffer` |
| `camera` | Decodes base64 JPEG → OpenCV numpy array, appends to `frames` |
| `iri` | Stores the PWA-computed IRI value at `buffer["iri_value"]` |
| `session_end` | Flushes partial segment and begins pipeline finalization |

**Segment finalization produces:**
```json
{
  "segment_id": "seg_0001",
  "gps_buffer": [...],
  "imu_buffer": [...],
  "frames": [<numpy arrays>],
  "iri_value": 3.7,
  "gps": {"lat": 28.614, "lng": 77.209},
  "avg_speed_ms": 10.0,
  "avg_speed_kmh": 36.0,
  "timestamp": 1711000000,
  "length_km": 0.1
}
```

### 2.2 Processing Order in `PULSEPipeline.process_segment()`

```
1. IRI extraction      → result["iri"]
2. Depth pipeline      → result["depth_3d"]
3. Visual assessor     → result["visual"]
4. Sensor fusion       → merges all channels → result[*]
5. Deterioration Oracle→ result["deterioration"]
6. Economic Cascade    → result["economic"]
7. Devil's Advocate    → result["devils_advocate_challenges"] + final_confidence
8. Graduation logic    → result["status"] = CONFIRMED | PROVISIONAL
9. Government Pipeline → result["pmgsy_application"]
```

---

## 3. What is Actually Done vs Simulated

### ✅ Actually Done (Real computation / real data)

| Component | What is real |
|-----------|-------------|
| **GPS segmentation** | Haversine distance computed on real GPS coordinates from the phone |
| **IRI value** | Computed on the **PWA (frontend)** using a quarter-car accelerometer model, then received here as-is |
| **Depth Anything V2** | Real HuggingFace model (`depth-anything/Depth-Anything-V2-Small-hf`) run on actual camera frames |
| **Scale Anchor 2 (ground plane)** | Real RANSAC fit of road plane using known camera height vs depth map median |
| **Scale Anchor 3 (optical flow)** | Real OpenCV Farneback dense optical flow between consecutive frames |
| **Scale Anchor 1 (IMU/SLAM)** | Real scipy high-pass filtered double-integration of raw IMU `az` stream |
| **Point cloud generation** | Real Open3D pinhole back-projection from metric depth map |
| **Rut depth extraction** | Real algorithm on 3D point cloud — 20 longitudinal slices, 90th-percentile baseline |
| **IRI → condition classification** | Deterministic thresholds against IRC:SP:20 standard (real thresholds) |
| **Visual assessment (primary path)** | Real Gemini Flash API call with actual JPEG frames |
| **Visual fallback (offline)** | OpenCV Canny edge density heuristic on actual frames |
| **Sensor fusion conflicts** | Deterministic rule engine on real computed values |
| **Devil's Advocate challenges** | Fully deterministic rule-based engine — no LLM |
| **Deterioration trajectory** | HDM-4 exponential IRI growth model with real traffic + climate inputs |
| **Economic VOC calculation** | Deterministic formula: AADT × VOC_baseline × IRI-based % increase |
| **PMGSY budget calculation** | Deterministic: MoRTH SOR 2024 unit costs × length_km |
| **Economic narrative** | Real Gemini API call (falls back to deterministic template) |
| **PMGSY application text** | Real Gemini API call (falls back to deterministic template) |
| **Debug file logging** | Saves raw frames, VLM prompt, parsed JSON — all real pipeline I/O |

---

### 🔴 Simulated / Faked / Not Real

| Component | What is faked | Details |
|-----------|--------------|---------|
| **OSM context (schools, PHCs, farms)** | **Fully simulated** | `fetch_osm_context()` generates deterministic fake data from a GPS hash. No live Overpass API call is made. Schools are always "Government Primary School", PHCs are always "Primary Health Centre". Population is `280 + (hash × 15)` — not real census data. |
| **AADT (traffic count)** | **Simulated from regional lookup file** | `india_rainfall.json` bounding-box lookup. If no region matches the GPS, **default AADT = 300 vehicles/day** hardcoded. Not measured from any live source. |
| **Rainfall data** | **Simulated from regional lookup file** | Same JSON file. Default = **1190 mm/year** if GPS falls outside known regions. |
| **District / state info in PMGSY** | **Hardcoded placeholder** | In `pipeline.py` L253-258: `"district": "Unknown District"`, `"state": "India"`, `"village": ""`, `"block": ""` — not looked up from any geocoder. |
| **DPVO / stella_vslam (SLAM)** | **Not installed — falls back** | Both visual odometry backends are optional; in practice the system always uses the IMU double-integration fallback (Anchor 1 via `get_imu_scale_estimate()`). |
| **Acoustic (audio) classification** | **Partially dead code** | `_run_acoustic()` exists in `pipeline.py` but is **never called** in `process_segment()`. An `_acoustic_clf` attribute is referenced but never initialized. The method synthesizes a waveform from RMS values if raw samples aren't available — a fallback for a fallback that doesn't run. |
| **`simulate_survey.py` — all sensor data** | **100% synthetic** | Fake GPS route moving due north from Delhi. IMU `az` is a sine wave + Gaussian noise. Camera frames are OpenCV-drawn grey rectangles with fake lane markings. Audio is a single RMS float (~0.07). IRI is computed from the synthetic IMU signal. |
| **Pass count (multi-vehicle averaging)** | **Always 1** | `pass_count` hardcoded to `1` in `iri_result`. Multi-pass statistical validation was designed for a fleet scenario — prototype uses single-vehicle. |
| **PCI live estimation** | **From VLM only** | PCI is not independently computed from sensor data — it's extracted from the Gemini VLM response or the OpenCV heuristic. There is no dedicated PCI sensor. |

---

## 4. Parameters — Hardcoded vs Live

### 4.1 Hardcoded Constants

#### Pipeline Config (`pipeline.py` `_default_config()`)

| Parameter | Value | Description |
|-----------|-------|-------------|
| `aadt_default` | `500` | Fallback AADT if region not in `india_rainfall.json` |
| `rainfall_default_mm` | `1200` | Fallback annual rainfall (mm) |
| `generate_gov_app` | `True` | Always attempt PMGSY draft |

#### Segment Manager (`main.py`)
| Parameter | Value | Description |
|-----------|-------|-------------|
| `segment_length_m` | `100.0` | Physical segment length triggering pipeline |

#### IRI Thresholds (`sensor_fusion.py`, `deterioration_oracle.py`)
| IRI (m/km) | Condition | Action |
|-----------|-----------|--------|
| ≤ 2.0 | Good | Routine maintenance |
| ≤ 4.0 | Fair | Preventive treatment |
| ≤ 6.0 | Poor | Rehabilitation |
| > 6.0 | Very Poor | Reconstruction |

#### Devil's Advocate Rules (`devils_advocate.py`)
| Rule | Threshold | Action |
|------|-----------|--------|
| `speed_too_low` | < 20 km/h | FLAG_IRI_INVALID |
| `extreme_iri` | > 12.0 m/km | REQUEST_HUMAN_REVIEW |
| `iri_visual_conflict` | IRI=Good, PCI<40 | DOWNGRADE_CONFIDENCE |
| `low_data_quality` | data_quality=="Low" | DOWNGRADE_CONFIDENCE |
| `granular_iri_suspiciously_low` | Granular/WBM + IRI<1.5 | DOWNGRADE_CONFIDENCE |
| `rut_visual_mismatch` | rut_depth>20mm + condition Good/Fair | DOWNGRADE_CONFIDENCE |
| `single_pass` | pass_count == 0 | DOWNGRADE_CONFIDENCE |

#### HDM-4 Deterioration Model (`deterioration_oracle.py`)
| Surface | a0 (initial IRI) | kge (env factor) | kgp (traffic factor) |
|---------|----------------|-----------------|---------------------|
| BC | 1.6 | 0.025 | 0.35 |
| WBM | 3.5 | 0.045 | 0.55 |
| Granular | 4.0 | 0.065 | 0.75 |
| Concrete | 1.2 | 0.015 | 0.20 |

Trajectory formula: `IRI(t) = IRI_0 × exp(a × t)` where `a = kge×climate_factor + kgp×traffic_factor`

#### MoRTH SOR 2024 Unit Costs (`deterioration_oracle.py`, `government_pipeline.py`) — ₹/km
| Intervention | BC | WBM | Granular | Concrete |
|-------------|-----|-----|---------|---------|
| Routine | 3,00,000 | 1,50,000 | 80,000 | 2,00,000 |
| Preventive | 12,00,000 | 6,00,000 | 3,00,000 | 8,00,000 |
| Rehabilitation | 50,00,000 | 30,00,000 | 15,00,000 | 40,00,000 |
| Reconstruction | 1,20,00,000 | 80,00,000 | 50,00,000 | 1,00,00,000 |

#### Economic Cascade Constants (`economic_cascade.py`)
| Constant | Value | Source |
|---------|-------|--------|
| `VOC_BASELINE_INR_PER_KM` | ₹12/km | HDM-4 India calibration |
| `VOC_INCREASE_PCT_PER_IRI` | 2.5% per IRI unit | World Bank HDM-4 |
| `ASSUMED_DAILY_VEHICLES` | 200 | Typical rural road |
| `IRI_BASELINE` | 2.0 m/km | Good condition threshold |
| `AVG_PRODUCE_VALUE_PER_HA_INR` | ₹80,000/ha/yr | NABARD 2024 |
| `POST_HARVEST_LOSS_SLOPE` | 1.5%/IRI unit | Internal estimate |
| `IRI_AGRICULTURAL_THRESHOLD` | 3.0 m/km | Above this, crop damage begins |
| `CYCLING_SPEED_GOOD_KMH` | 12.0 km/h | Assumed student travel speed |
| `ATTENDANCE_DROP_PER_10MIN` | 5% per 10 min | Internal model |
| `AMBULANCE_BASE_SPEED_KMH` | 40.0 km/h | PHC road speed |

#### Simulated OSM Context (`economic_cascade.py fetch_osm_context()`)
| Field | Formula | Range |
|-------|---------|-------|
| `population` | `280 + (hash × 15)` | 280–1780 persons |
| `agricultural_land_ha` | `30 + (hash % 8 × 6)` | 30–72 ha |
| `schools_count` | `1 + (hash % 3)` | 1–3 schools |
| `phcs_count` | 1 always; +1 if `hash % 5 == 0` | 1–2 PHCs |
| `school_distance_km` | `0.8 + (hash % 5 × 0.15)` | 0.8–1.45 km |
| `phc_distance_km` | `3.5 + (hash % 7 × 0.4)` | 3.5–6.3 km |

The `hash` is computed as: `int(abs(round(lat, 3) × 1000) + abs(round(lng, 3) × 1000)) % 100`

#### Depth Pipeline (`depth_pipeline.py`)
| Parameter | Value | Description |
|-----------|-------|-------------|
| Scale weight: IMU | 0.50 | Weight for SLAM/IMU anchor |
| Scale weight: Ground | 0.30 | Weight for camera-height anchor |
| Scale weight: Motion | 0.20 | Weight for GPS+flow anchor |
| `SCALE_VALID_MIN` | 0.1 | Metres per depth unit minimum |
| `SCALE_VALID_MAX` | 100.0 | Metres per depth unit maximum |
| `MAX_RUT_DEPTH_MM` | 100.0 mm | Sanity clamp |
| Road depth filter | 0.3–8.0 m | Point cloud valid range |
| Road corridor | ±2m lateral, 0.5–5m ahead | Point cloud ROI |
| Rut severity: None/Slight | < 10mm | IRC:SP:20 |
| Rut severity: Moderate | 10–20mm | IRC:SP:20 |
| Rut severity: Severe | > 20mm | IRC:SP:20 |

#### Visual Assessor (`visual_assessor.py`)
| Parameter | Value |
|-----------|-------|
| Gemini temperature | 0.1 |
| Max frames per assessment | 3 (adjustable) |
| Canny edge density: Good | < 0.02 → PCI=85 |
| Canny edge density: Fair | 0.02–0.04 → PCI=65 |
| Canny edge density: Poor | 0.04–0.06 → PCI=42 |
| Canny edge density: Very Poor | > 0.06 → PCI=25 |

#### SLAM/IMU Wrapper (`slam_wrapper.py`)
| Parameter | Value |
|-----------|-------|
| IMU high-pass cutoff | 1.5 Hz |
| Filter order | Butterworth 6th order |
| IMU `dt` | 1/200 s (assumed 200 Hz) |
| IMU min buffer | 40 readings |
| IMU scale formula | `(camera_height × 0.05) / max(rms_disp, 1e-4)` clipped to [0.1, 50.0] |

---

### 4.2 Live / Environment-Provided Parameters

| Parameter | Source | How set |
|-----------|--------|---------|
| `GEMINI_API_KEY` | `.env` file | Real API key; required for VLM + narrative + PMGSY text |
| `DEVICE` | `.env` → `DEVICE=cuda/cpu` | Selects PyTorch device |
| `CAMERA_HEIGHT_M` | `.env` → `CAMERA_HEIGHT_M=1.20` | Physical measurement with a ruler; critical for Anchor 2 |
| `VLM_OLLAMA_MODEL` | `.env` → `qwen3-vl:4b` | Ollama model (not used — migrated to Gemini) |
| `DEPTH_MODEL` | `.env` → `depth-anything/Depth-Anything-V2-Small-hf` | HuggingFace model ID |
| `GEMINI_MODEL` | `.env` → `gemini-3-flash-preview` | Google Gemini model name |
| `GPS lat/lng` | WebSocket `gps` packet | Real phone GPS |
| `GPS speed` | WebSocket `gps` packet (`speed` field in m/s) | Real phone GPS speed |
| `IMU ax/ay/az, rx/ry/rz` | WebSocket `imu` packet | Real phone accelerometer + gyroscope |
| `Camera frames` | WebSocket `camera` packet (base64 JPEG) | Real phone camera |
| `iri_value` | WebSocket `iri` packet | PWA-computed from real IMU using quarter-car model |
| `BACKEND_HOST/PORT` | `.env` → `0.0.0.0:8000` | Server bind address |

---

## 5. Agents & Sensors — Detailed Breakdown

### Sensor A: IRI (International Roughness Index)

- **Where computed:** PWA frontend (`iriComputer.js` quarter-car model)
- **What backend receives:** a single float in the `iri` WebSocket packet
- **Backend role:** passes it through; applies thresholds; feeds downstream agents
- **Formula (in `simulate_survey.py`):** `IRI = std(az_detrended) / avg_speed * 12.0`

---

### Sensor B: Depth Pipeline (`sensors/depth_pipeline.py`)

**Step-by-step:**
1. `get_relative_depth(frame)` — Runs HuggingFace `depth-estimation` pipeline → normalized [0,1] depth map
2. `_recover_scale_ground_plane()` — RANSAC: `scale = camera_height / median(road_depth_relative)`, uses lower 60% of frame as road region
3. `_recover_scale_optical_flow()` — OpenCV Farneback flow on consecutive frames + GPS speed: `scale = (gps_speed/fps) / (median_pixel_disp/frame_width)`
4. `get_imu_scale_estimate()` — SLAMWrapper: butterworth high-pass → double-integrate az → RMS → scale
5. `fuse_scales()` — Weighted average of available anchors (weights: IMU 0.50, ground 0.30, motion 0.20)
6. `depth_to_pointcloud()` — Pinhole back-projection with intrinsics (defaults: `fx=fy=0.8×width`)
7. `extract_rut_depth()` — 20 longitudinal slices → transverse profile → 90th-percentile baseline → max depression

**Output:**
```json
{
  "rut_depth_mm": 15.3,
  "rut_severity": "Moderate",
  "rut_confidence": "medium",
  "scale_used": 2.4,
  "scale_anchors": { "imu": 2.1, "ground": 2.5, "motion": null },
  "frames_used": 3
}
```

---

### Agent 0: Sensor Fusion (`agents/sensor_fusion.py`)

Merges IRI, visual, and depth-3D results. Deterministic rules:
- **IRI overrides visual** when they conflict (`iri_visual_mismatch`)
- **Rut depth > 20mm** downgrades visual confidence if visual said Good/Fair
- **No depth data** → caps visual confidence at "60%"

**Output adds to segment dict:**
```json
{
  "iri_value": 3.7,
  "iri_condition": "Fair",
  "iri_color": "#F39C12",
  "final_condition": "Fair",
  "pci_estimate": 65,
  "surface_type": "WBM",
  "distresses": [...],
  "drainage_adequacy": "Adequate",
  "rut_depth_mm": 15.3,
  "rut_severity": "Moderate",
  "slam_status": "SLAM_UNAVAILABLE",
  "conflicts": [...],
  "data_quality": "Medium"
}
```

---

### Agent 2: Visual Assessor (`agents/visual_assessor.py`)

**Primary path (Gemini available):**
- Selects up to 3 frames evenly spaced from segment
- Builds prompt with sensor telemetry context (IRI, speed, gyro)
- Sends JPEG images + prompt to `gemini-2.5-flash` (or configured model)
- Response forced as `application/json` via `response_mime_type`
- Temperature: `0.1`

**Fallback (no Gemini API key):**
- OpenCV Canny edge density on lower 50% of up to 5 frames
- Maps density to fixed PCI/condition buckets

**Output:**
```json
{
  "surface_type": "WBM",
  "overall_condition": "Fair",
  "pci_estimate": 65,
  "distresses": [
    {
      "type": "longitudinal_crack",
      "severity": "Medium",
      "extent_percent": 30,
      "notes": "..."
    }
  ],
  "drainage_adequacy": "Adequate",
  "recommended_intervention": "Preventive",
  "confidence": "High",
  "limiting_factor": "",
  "frames_analysed": 3,
  "model_used": "gemini-3-flash-preview",
  "inference_time_s": 2.4,
  "raw_response": "..."
}
```

---

### Agent 4: Deterioration Oracle (`agents/deterioration_oracle.py`)

Predicts 5-year IRI trajectory using India-calibrated HDM-4 exponential model.

**Inputs (live):** current IRI, surface type  
**Inputs (simulated):** AADT and rainfall from regional lookup JSON (falls back to defaults if GPS is outside known regions)

**Output:**
```json
{
  "current_iri": 3.7,
  "surface_type": "WBM",
  "trajectory": [
    {"year": 0, "iri": 3.7, "condition": "Fair"},
    {"year": 1, "iri": 4.12, "condition": "Poor"},
    ...
  ],
  "failure_year": 3,
  "weeks_to_failure": 156,
  "annual_deterioration_rate": 0.42,
  "recommended_intervention": "Preventive",
  "cost_now_lakh": 6.0,
  "cost_if_delayed_lakh": 80.0,
  "potential_savings_lakh": 74.0,
  "decision_urgency": "HIGH",
  "hdm4_growth_rate": 0.11472,
  "inputs": {"aadt": 300, "rainfall_mm_year": 1190, "length_km": 0.1}
}
```

---

### Agent 5: Economic Cascade Engine (`agents/economic_cascade.py`)

**All four components in `compute_cascade()`:**

| Component | Formula |
|-----------|---------|
| VOC | `AADT × VOC_base × ((IRI - 2.0) × 2.5%) × length × 365` |
| Agriculture | `farm_ha × ₹80k × ((IRI - 3.0) × 1.5%)` |
| School attendance | Per school: speed_reduction = `max(0.4, 1 - (IRI-2)×0.12)`, extra_time = journey difference, drop = `extra_min × 0.5%` |
| Ambulance delay | Per PHC: speed_reduction = `max(0.3, 1-(IRI-2)×0.15)`, compare base vs actual travel time |

**OSM context** is **always simulated** (hash-based deterministic — no live Overpass query).

**Narrative**: Gemini API call (3 sentences); template fallback.

**Output:**
```json
{
  "segment_id": "seg_0001",
  "iri": 3.7,
  "population_affected": 730,
  "length_km": 0.1,
  "voc_increase_pct": 4.25,
  "annual_voc_cost_lakh": 0.01,
  "agricultural_loss_pct": 1.05,
  "agricultural_loss_annual_lakh": 0.38,
  "agricultural_loss_lakh": 0.38,
  "schools_affected": [
    {
      "school": "Government Primary School",
      "students_affected": 200,
      "extra_travel_minutes": 1.8,
      "attendance_drop_pct": 0.9,
      "distance_km": 1.05
    }
  ],
  "total_students_affected": 400,
  "health_facilities_nearby": 1,
  "ambulance_delay_minutes": 0.5,
  "total_annual_economic_loss_lakh": 0.39,
  "monthly_loss_lakh": 0.03,
  "repair_cost_inr": 39000.0,
  "narrative": "This road segment (IRI 3.7 m/km)..."
}
```

---

### Agent 6: Devil's Advocate (`agents/devils_advocate.py`)

Fully deterministic — no LLM. Runs 7 challenge rules. Returns:
```json
{
  "devils_advocate_challenges": [
    {
      "rule_id": "speed_too_low",
      "challenge": "Average speed during this segment was below 20 km/h...",
      "action": "FLAG_IRI_INVALID"
    }
  ],
  "final_confidence": "High",
  "cleared_for_report": true,
  "challenge_count": 0,
  "highest_action": null
}
```

Action priority: `REQUEST_HUMAN_REVIEW (3) > FLAG_IRI_INVALID (2) > DOWNGRADE_CONFIDENCE (1)`

---

### Agent 7: Government Pipeline (`agents/government_pipeline.py`)

**Only runs if:** `config["generate_gov_app"] == True` AND `result["cleared_for_report"] == True`

Drafts a formal PMGSY funding application.
- **Budget**: `MoRTH SOR 2024 unit_cost × length_km`
- **Text**: Gemini API (4-paragraph formal English); deterministic template fallback
- **District info**: Always `"Unknown District"`, `"India"`, `""` for village/block (hardcoded in `pipeline.py`)

**Output:**
```json
{
  "application_text": "BACKGROUND AND CURRENT CONDITION: Road Segment seg_0001...",
  "intervention_type": "Preventive",
  "surface_type": "WBM",
  "road_length_km": 0.1,
  "iri_value": 3.7,
  "iri_condition": "Fair",
  "unit_cost_per_km_lakh": 6.0,
  "total_budget_lakh": 0.6,
  "irc_standard_cited": "IRC:SP:20-2002",
  "sor_year": "MoRTH SOR 2024",
  "beneficiary_population": 730,
  "annual_economic_loss_lakh": 0.39,
  "district": "Unknown District",
  "state": "India",
  "road_name": "Road Segment seg_0001",
  "status": "DRAFT — Ready for Engineer Review",
  "generated_at": "2026-03-28T14:47:00",
  "model_used": "gemini-3-flash-preview"
}
```

---

## 6. API Reference — All Endpoints

### Base URL: `http://localhost:8000`

---

### `GET /health`

Health check.

**Response:**
```json
{ "status": "ok", "version": "1.0.0" }
```

---

### `WS /ws/{session_id}`

Main data ingestion WebSocket. One connection per driving session.

- **Path param:** `session_id` — arbitrary string identifier (e.g. `"SIM_DEMO_001"`)
- **Direction:** bidirectional
- See [Section 7](#7-websocket-message-schema) for full message schema.

---

### `GET /api/live`

Returns all currently active WebSocket sessions with live telemetry. Consumed by the dashboard every 5 seconds.

**No request body.**

**Response:**
```json
{
  "active": true,
  "sessions": [
    {
      "session_id": "SIM_DEMO_001",
      "status": "active",
      "current_gps": { "lat": 28.6148, "lng": 77.209 },
      "current_speed_kmh": 36.0,
      "current_iri": 3.7,
      "current_pci": null,
      "segment_count": 2
    }
  ]
}
```

> `current_pci` is always `null` — PCI is only available post-segment.

---

### `GET /api/sessions`

List all historical sessions (from debug output files) + any currently active sessions.

**No request body.**

**Response:**
```json
{
  "sessions": [
    {
      "session_id": "SIM_DEMO_001",
      "status": "completed",
      "segment_count": 2,
      "avg_iri": 3.85,
      "avg_pci": 62.5,
      "total_distance_km": 0.2
    },
    {
      "session_id": "SIM_DEMO_002",
      "status": "active",
      "segment_count": 1,
      "avg_iri": 4.1,
      "avg_pci": null,
      "total_distance_km": 0.1
    }
  ]
}
```

---

### `GET /api/stats`

Aggregate statistics across all historical sessions.

**No request body.**

**Response:**
```json
{
  "total_sessions": 3,
  "total_segments": 7,
  "total_distance_km": 0.7,
  "avg_iri": 3.92,
  "avg_pci": 61.4,
  "distress_count": 12
}
```

- `distress_count` = sum of individual distress items across all segment `distresses` arrays

---

### `GET /api/sessions/{session_id}/segments`

All segment results for a specific session. Checks in-memory first, then disk.

**Path param:** `session_id`

**Response (completed session):**
```json
{
  "session_id": "SIM_DEMO_001",
  "status": "completed",
  "segments": [
    {
      "segment_id": "seg_0001",
      "session_id": "SIM_DEMO_001",
      "gps": { "lat": 28.6144, "lng": 77.209 },
      "gps_start": { "lat": 28.6139, "lng": 77.209 },
      "gps_end": { "lat": 28.6148, "lng": 77.209 },
      "length_km": 0.1,
      "timestamp": 1711000000,
      "avg_speed_kmh": 36.0,
      "iri": { "iri_value": 3.7, "pass_count": 1 },
      "depth_3d": { "rut_depth_mm": 15.3, "rut_severity": "Moderate", "confidence": "medium", ... },
      "visual": { "overall_condition": "Fair", "pci_estimate": 65, "distresses": [...], ... },
      "iri_value": 3.7,
      "iri_condition": "Fair",
      "iri_color": "#F39C12",
      "final_condition": "Fair",
      "pci_estimate": 65,
      "surface_type": "WBM",
      "distresses": [...],
      "data_quality": "Medium",
      "conflicts": [...],
      "deterioration": { ... },
      "economic": { ... },
      "devils_advocate_challenges": [...],
      "final_confidence": "High",
      "cleared_for_report": true,
      "highest_action": null,
      "challenge_count": 0,
      "status": "CONFIRMED",
      "pmgsy_application": { ... },
      "processing_time_s": 4.2
    }
  ]
}
```

**Response (not found):**
```json
{ "error": "Session SIM_XXX not found", "segments": [] }
```

---

### `GET /api/frames/{session_id}`

Returns lists of captured/VLM-input frame filenames for each segment, used by the Visual Feed dashboard page.

**Path param:** `session_id`

**Response:**
```json
{
  "session_id": "SIM_DEMO_001",
  "segments": [
    {
      "segment_id": "seg_0001",
      "frame_source": "vlm_input_frames",
      "frames": ["vlm_frame_000.jpg", "vlm_frame_001.jpg", "vlm_frame_002.jpg"],
      "count": 3,
      "base_url": "/debug-files/SIM_DEMO_001/seg_0001/vlm_input_frames"
    }
  ]
}
```

> Images are served as static files via `GET /debug-files/{session_id}/{segment_id}/{frame_dir_name}/{filename}`

---

### `GET /session/{session_id}/summary`  *(legacy)*

Returns in-memory session summary. Only works for **active** sessions.

**Response (active):**
```json
{
  "session_id": "SIM_DEMO_001",
  "segments_processed": 2,
  "total_length_km": 0.2,
  "avg_iri": 3.85,
  "max_iri": 4.1,
  "total_economic_loss_lakh": 0.78,
  "session_duration_s": 65.0,
  "segments": [...]
}
```

**Response (not found):**
```json
{ "error": "Session not found or already closed." }
```

---

### `GET /debug/sessions`

List all debug session directories and their segment sub-directories.

**Response:**
```json
{
  "sessions": [
    {
      "session_id": "SIM_DEMO_001",
      "segments": ["seg_0001", "seg_0002"]
    }
  ]
}
```

---

### `GET /debug/{session_id}/{segment_id}`

Return all debug JSON and image files for a specific segment.

**Path params:** `session_id`, `segment_id`

**Response:**
```json
{
  "session_id": "SIM_DEMO_001",
  "segment_id": "seg_0001",
  "files": {
    "raw_sensor_stats.json": { ... },
    "iri_result.json": { ... },
    "depth_result.json": { ... },
    "fusion_result.json": { ... },
    "vlm_parsed.json": { ... },
    "pipeline_result.json": { ... },
    "vlm_raw_response.txt": "<raw model text>",
    "vlm_prompt.json": { ... },
    "captured_frames": {
      "type": "image_directory",
      "count": 5,
      "files": ["frame_000.jpg", "frame_001.jpg"],
      "base_url": "/debug-files/SIM_DEMO_001/seg_0001/captured_frames"
    },
    "vlm_input_frames": {
      "type": "image_directory",
      "count": 3,
      "files": ["vlm_frame_000.jpg", ...],
      "base_url": "/debug-files/SIM_DEMO_001/seg_0001/vlm_input_frames"
    }
  }
}
```

**Not found response:**
```json
{ "error": "Segment not found" }
```

---

### `GET /debug/viewer`

Serves `frontend/debug.html` as an HTML debug viewer page.

---

## 7. WebSocket Message Schema

### Client → Server (Inbound)

All messages follow:
```json
{ "type": "<type>", "data": { ... } }
```

#### `gps` — GPS location update
```json
{
  "type": "gps",
  "data": {
    "lat": 28.6144,
    "lng": 77.2090,
    "speed": 10.0,
    "heading": 0,
    "altitude": 210,
    "accuracy": 3,
    "timestamp": 1711000010
  }
}
```
> `speed` = speed in **m/s**. `heading` in degrees. `accuracy` in metres.

#### `imu` — Accelerometer + Gyroscope reading
```json
{
  "type": "imu",
  "data": {
    "ax": 0.02,
    "ay": -0.01,
    "az": 9.81,
    "rx": 0.001,
    "ry": 0.002,
    "rz": 0.0005
  }
}
```
> `ax/ay/az` = linear acceleration (m/s²). `rx/ry/rz` = rotation rate (rad/s).

#### `camera` — Single video frame
```json
{
  "type": "camera",
  "data": {
    "image": "<base64-encoded JPEG string, optionally with data:image/jpeg;base64, prefix>",
    "timestamp": 1711000010.5
  }
}
```

#### `iri` — Edge-computed IRI for current 100m segment
```json
{
  "type": "iri",
  "data": {
    "iri_value": 3.72
  }
}
```

#### `audio` — Audio RMS packet *(buffered but never processed in current build)*
```json
{
  "type": "audio",
  "data": {
    "rms": 0.07
  }
}
```
> Can also include `"base64": "<audio bytes>"` or `"samples": [0.01, 0.02, ...]`.

#### `session_end` — End of driving session
```json
{
  "type": "session_end",
  "data": {}
}
```

---

### Server → Client (Outbound)

#### `segment_result` — Full processed segment
```json
{
  "type": "segment_result",
  "data": {
    "segment_id": "seg_0001",
    "session_id": "SIM_DEMO_001",
    "gps": { "lat": 28.6144, "lng": 77.209 },
    "gps_start": { "lat": 28.6139, "lng": 77.209 },
    "gps_end": { "lat": 28.6148, "lng": 77.209 },
    "length_km": 0.1,
    "timestamp": 1711000010,
    "avg_speed_kmh": 36.0,
    "iri": { "iri_value": 3.7, "pass_count": 1 },
    "depth_3d": {
      "rut_depth_mm": 15.3,
      "severity": "Moderate",
      "confidence": "medium",
      "frames_used": 3,
      "scale_used": 2.41,
      "scale_anchors": { "imu": 2.1, "ground": 2.5, "motion": null }
    },
    "visual": {
      "surface_type": "WBM",
      "overall_condition": "Fair",
      "pci_estimate": 65,
      "distresses": [
        {
          "type": "longitudinal_crack",
          "severity": "Medium",
          "extent_percent": 30,
          "notes": "Observed in wheel paths"
        }
      ],
      "drainage_adequacy": "Adequate",
      "recommended_intervention": "Preventive",
      "confidence": "High",
      "limiting_factor": "",
      "frames_analysed": 3,
      "model_used": "gemini-3-flash-preview",
      "inference_time_s": 2.4
    },
    "iri_value": 3.7,
    "iri_condition": "Fair",
    "iri_color": "#F39C12",
    "avg_speed_kmh": 36.0,
    "pass_count": 1,
    "pci_estimate": 65,
    "surface_type": "WBM",
    "distresses": [ ... ],
    "drainage_adequacy": "Adequate",
    "visual_confidence": "High",
    "rut_depth_mm": 15.3,
    "rut_severity": "Moderate",
    "rut_confidence": "medium",
    "slam_status": "SLAM_UNAVAILABLE",
    "final_condition": "Fair",
    "conflicts": [
      {
        "type": "slam_unavailable_fallback",
        "resolution": "SLAM failed or unavailable...",
        "final": "Visual confidence capped at 60%"
      }
    ],
    "data_quality": "Medium",
    "deterioration": {
      "current_iri": 3.7,
      "trajectory": [ ... ],
      "failure_year": 3,
      "weeks_to_failure": 156,
      "annual_deterioration_rate": 0.42,
      "recommended_intervention": "Preventive",
      "cost_now_lakh": 6.0,
      "cost_if_delayed_lakh": 80.0,
      "potential_savings_lakh": 74.0,
      "decision_urgency": "HIGH",
      "hdm4_growth_rate": 0.11472
    },
    "economic": {
      "iri": 3.7,
      "population_affected": 730,
      "voc_increase_pct": 4.25,
      "annual_voc_cost_lakh": 0.01,
      "agricultural_loss_pct": 1.05,
      "agricultural_loss_annual_lakh": 0.38,
      "agricultural_loss_lakh": 0.38,
      "schools_affected": [ ... ],
      "total_students_affected": 400,
      "health_facilities_nearby": 1,
      "ambulance_delay_minutes": 0.5,
      "total_annual_economic_loss_lakh": 0.39,
      "monthly_loss_lakh": 0.03,
      "narrative": "This road segment (IRI 3.7 m/km)..."
    },
    "devils_advocate_challenges": [],
    "final_confidence": "High",
    "cleared_for_report": true,
    "challenge_count": 0,
    "highest_action": null,
    "status": "CONFIRMED",
    "pmgsy_application": {
      "application_text": "BACKGROUND AND CURRENT CONDITION...",
      "intervention_type": "Preventive",
      "surface_type": "WBM",
      "road_length_km": 0.1,
      "iri_value": 3.7,
      "iri_condition": "Fair",
      "unit_cost_per_km_lakh": 6.0,
      "total_budget_lakh": 0.6,
      "irc_standard_cited": "IRC:SP:20-2002",
      "sor_year": "MoRTH SOR 2024",
      "beneficiary_population": 730,
      "annual_economic_loss_lakh": 0.39,
      "district": "Unknown District",
      "state": "India",
      "road_name": "Road Segment seg_0001",
      "status": "DRAFT — Ready for Engineer Review",
      "generated_at": "2026-03-28T14:47:00",
      "model_used": "gemini-3-flash-preview"
    },
    "processing_time_s": 4.2
  }
}
```

#### `error` — Pipeline error
```json
{
  "type": "error",
  "message": "Depth pipeline failed: CUDA out of memory"
}
```

---

## 8. External Integrations

| Service | Usage | Real or Simulated | Auth |
|---------|-------|-----------------|------|
| **Gemini Flash API** (`generativelanguage.googleapis.com`) | Visual assessment, economic narrative, PMGSY text | **Real** (API call) | `GEMINI_API_KEY` in `.env` |
| **HuggingFace Hub** | `depth-anything/Depth-Anything-V2-Small-hf` model download on first load | **Real** (download on init) | No key needed |
| **Ollama** (`localhost:11434`) | Originally planned for VLM (Qwen3-VL) — **migrated to Gemini** | **Not used** in current build | None |
| **Overpass API** (`overpass-api.de`) | OSM context (schools, PHCs) | **Never called** — replaced by hash-based simulation | None needed |
| **DPVO / stella_vslam** | Visual odometry Scale Anchor 1 | **Never installed** — falls back to IMU double-integration | None |

---

## 9. Debug Output Layout

Written to `output/debug/<session_id>/<segment_id>/` when `DEBUG_MODE=1` (default ON).

```
output/debug/
└── SIM_DEMO_001/
    └── seg_0001/
        ├── raw_sensor_stats.json      # IMU count, frame count, GPS points, speed stats
        ├── iri_result.json            # IRI value + pass_count
        ├── depth_result.json          # Rut depth, scale, anchors
        ├── fusion_result.json         # Sensor fusion output
        ├── vlm_prompt.json            # System prompt + assessment prompt + image sizes
        ├── vlm_raw_response.txt       # Exact raw text back from Gemini
        ├── vlm_parsed.json            # Parsed assessment + inference time
        ├── pipeline_result.json       # Full final segment result (frames stripped)
        ├── captured_frames/
        │   ├── frame_000.jpg          # Raw OpenCV frames from phone
        │   └── ...
        └── vlm_input_frames/
            ├── vlm_frame_000.jpg      # Frames actually sent to Gemini VLM
            └── ...
```

Served as static files via `GET /debug-files/<session_id>/<segment_id>/<dir>/<file>`.

---

## 10. Simulation Script (`simulate_survey.py`)

**Purpose:** End-to-end testing without a real smartphone.

**What it simulates (all fake):**

| Sensor | Fake data |
|--------|----------|
| GPS | Due-north route from Delhi (28.6139°N, 77.2090°E) at 36 km/h (10 m/s) |
| IMU az | `9.81 + 0.35·sin(dist×1.5) + pothole_spike + N(0,0.08)` |
| IMU ax/ay | `N(0, 0.05)` |
| IMU rx/ry/rz | `N(0,0.01)` and `N(0,0.005)` |
| Camera | OpenCV grey rectangle (640×480), fake lane lines, polyline cracks after 50m |
| Audio | `{"rms": 0.07 + N(0,0.01)}` |
| IRI | `std(az) / avg_speed × 12.0`, clamped [0.5, 20.0] |

**Packet timing:**
- GPS: every 1s
- IMU: 20 Hz
- Camera: every 2s
- Audio: every 2s
- IRI: at each 100m boundary

**Connection:** `ws://localhost:8000/ws/SIM_DEMO_001`

**Expected output**: at least 1 `segment_result` message after 150m of simulated driving.

---

## Summary: Real vs Simulated — Quick Reference

| What | Real ✅ | Simulated 🔴 |
|------|---------|------------|
| GPS coordinates | ✅ From phone | 🔴 Fake in simulator |
| IMU data | ✅ From phone | 🔴 Sine wave in simulator |
| Camera frames | ✅ From phone | 🔴 OpenCV drawings in simulator |
| IRI value | ✅ PWA quarter-car model | 🔴 Simplified formula in simulator |
| Depth model inference | ✅ Real HuggingFace model | — |
| SLAM / visual odometry | 🔴 Not installed | — |
| Rut depth extraction | ✅ Real Open3D algorithm | — |
| Visual assessment | ✅ Real Gemini API | Fallback: OpenCV heuristic |
| OSM schools/PHCs/farms | 🔴 Hash-derived fake data | — |
| AADT traffic count | 🔴 Regional lookup / default=300 | — |
| Rainfall data | 🔴 Regional lookup / default=1190mm | — |
| District/village info | 🔴 Hardcoded "Unknown District" | — |
| Economic narrative | ✅ Real Gemini API | Fallback: template string |
| PMGSY application text | ✅ Real Gemini API | Fallback: template string |
| Devil's Advocate | ✅ Deterministic rules | — |
| HDM-4 deterioration | ✅ Real model (simulated inputs) | — |
| Acoustic classification | 🔴 Code exists but never called | — |
