import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { AppTheme } from '@/components/theme/AppTheme';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { NotificationProvider } from '@/components/common/NotificationProvider';
import { AppLayout } from '@/components/layout/AppLayout';

// ページコンポーネント（Lazy Loading）
const HomePage = React.lazy(() => import('@/pages/HomePage'));
const CampaignSetupPage = React.lazy(() => import('@/pages/CampaignSetupPage'));
const CharacterManagementPage = React.lazy(() => import('@/pages/CharacterManagementPage'));
const LocationManagementPage = React.lazy(() => import('@/pages/LocationManagementPage'));
const TimelinePage = React.lazy(() => import('@/pages/TimelinePage'));
const TRPGSessionPage = React.lazy(() => import('@/pages/TRPGSessionPage'));
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage'));

function App() {
  return (
    <ErrorBoundary>
      <RecoilRoot>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <AppTheme>
            <CssBaseline />
            <NotificationProvider>
              <Router>
                <AppLayout>
                  <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                    <Suspense fallback={<LoadingScreen />}>
                      <Routes>
                        {/* ホームページ */}
                        <Route path="/" element={<HomePage />} />
                        
                        {/* キャンペーン管理 */}
                        <Route path="/campaign/:id" element={<Navigate to="/campaign/:id/setup" replace />} />
                        <Route path="/campaign/:id/setup" element={<CampaignSetupPage />} />
                        <Route path="/campaign/:id/characters" element={<CharacterManagementPage />} />
                        <Route path="/campaign/:id/locations" element={<LocationManagementPage />} />
                        <Route path="/campaign/:id/timeline" element={<TimelinePage />} />
                        <Route path="/campaign/:id/session" element={<TRPGSessionPage />} />
                        <Route path="/campaign/:id/session/:sessionId" element={<TRPGSessionPage />} />
                        
                        {/* 設定 */}
                        <Route path="/settings" element={<SettingsPage />} />
                        
                        {/* 404 リダイレクト */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Suspense>
                  </Box>
                </AppLayout>
              </Router>
            </NotificationProvider>
          </AppTheme>
        </LocalizationProvider>
      </RecoilRoot>
    </ErrorBoundary>
  );
}

export default App;