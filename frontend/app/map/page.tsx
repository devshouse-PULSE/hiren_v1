'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { usePulseStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { motion } from 'framer-motion';

// Dynamically import LiveMap with no SSR, since leafley uses window
const LiveMap = dynamic(
  () => import('@/components/dashboard/live-map'),
  {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-[600px] text-gray-500">Loading Map...</div>
  }
);

export default function MapPage() {
  const { segments, currentGPS, isConnected } = usePulseStore();


  return (
    <ProtectedRoute>
      <MainLayout title="Live Survey Map" description="Real-time map visualizing survey progress and road conditions">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full h-[700px]"
        >
          <Card className="h-full flex flex-col border-white/10 overflow-hidden">
            <CardHeader className="bg-black/20 pb-4">
              <CardTitle className="flex items-center justify-between">
                <span>Infrastructure Condition</span>
                <div className="flex gap-4 text-xs font-normal">
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#27AE60]"></div> Good</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#F39C12]"></div> Fair</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#E74C3C]"></div> Poor</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#8E44AD]"></div> Very Poor</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative">
              {segments.length === 0 && (!currentGPS || !currentGPS?.lat) ? (
                <div className="h-full flex items-center justify-center text-gray-400 p-8 text-center flex-col gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center text-2xl">
                    🗺️
                  </div>
                  <p>No map data available. Start a survey or connect to the backend.</p>
                </div>
              ) : (
                <LiveMap segments={segments} currentGPS={currentGPS} />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </MainLayout>
    </ProtectedRoute>
  );
}
