'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { SegmentResult } from '@/lib/store';

// Fix typical Leaflet icon issue in React
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface LiveMapProps {
  segments: SegmentResult[];
  currentGPS?: { lat: number; lng: number } | null;
}

const colorMap: Record<string, string> = {
  'Good': '#27AE60',
  'Fair': '#F39C12',
  'Poor': '#E74C3C',
  'Very Poor': '#8E44AD',
  'Unknown': '#7F8C8D',
};

// Component to dynamically fit bounds to segments
function MapBounds({ segments, currentGPS }: { segments: SegmentResult[], currentGPS: any }) {
  const map = useMap();
  useEffect(() => {
    const coords: [number, number][] = segments
      .filter((s) => s.gps && typeof s.gps.lat === 'number' && typeof s.gps.lng === 'number')
      .map((s) => [s.gps!.lat, s.gps!.lng]);

    if (currentGPS && typeof currentGPS.lat === 'number') {
      coords.push([currentGPS.lat, currentGPS.lng]);
    }

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [segments, currentGPS, map]);
  return null;
}

export default function LiveMap({ segments, currentGPS }: LiveMapProps) {
  const polylines = [];

  for (let i = 0; i < segments.length - 1; i++) {
    const s1 = segments[i];
    const s2 = segments[i + 1];

    if (s1.gps && s2.gps && typeof s1.gps.lat === 'number' && typeof s2.gps.lat === 'number') {
      const color = colorMap[s1.iri_condition || 'Unknown'] || '#7F8C8D';
      polylines.push(
        <Polyline
          key={`poly-${s1.segment_id || i}`}
          positions={[[s1.gps.lat, s1.gps.lng], [s2.gps.lat, s2.gps.lng]]}
          color={color}
          weight={6}
          opacity={0.8}
        >
          <Popup>
            <div className="text-sm text-black">
              <p className="font-bold">Segment: {s1.segment_id}</p>
              <p>Condition: {s1.iri_condition || 'Unknown'}</p>
              <p>IRI: {typeof s1.iri_value === 'number' ? s1.iri_value.toFixed(2) : 'N/A'}</p>
            </div>
          </Popup>
        </Polyline>
      );
    }
  }

  // Draw line from last segment to currentGPS
  if (segments.length > 0 && currentGPS && typeof currentGPS.lat === 'number') {
    const lastSeg = segments[segments.length - 1];
    if (lastSeg.gps && typeof lastSeg.gps.lat === 'number') {
      polylines.push(
        <Polyline
          key="poly-current"
          positions={[[lastSeg.gps.lat, lastSeg.gps.lng], [currentGPS.lat, currentGPS.lng]]}
          color="#3498DB"
          weight={4}
          dashArray="5, 10"
        />
      );
    }
  }

  // Default center if no data
  const center: [number, number] = (currentGPS && typeof currentGPS.lat === 'number')
    ? [currentGPS.lat, currentGPS.lng]
    : (segments[0]?.gps && typeof segments[0].gps.lat === 'number')
      ? [segments[0].gps!.lat, segments[0].gps!.lng]
      : [28.6139, 77.2090]; // New Delhi as default

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: '100%', width: '100%', minHeight: '400px', borderRadius: '12px', zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {polylines}

      {/* Current location marker */}
      {currentGPS && typeof currentGPS.lat === 'number' && (
        <Marker position={[currentGPS.lat, currentGPS.lng]}>
          <Popup><div className="text-black">Current Survey Location</div></Popup>
        </Marker>
      )}
      <MapBounds segments={segments} currentGPS={currentGPS} />
    </MapContainer>
  );
}
