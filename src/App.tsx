import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useInterviewState } from './hooks/useInterviewState';
import { NotificationProvider } from './components/NotificationSystem';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { SupabaseConfigError } from './components/SupabaseConfigError';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthCallback } from './components/AuthCallback';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

// Screen imports
import { HomeScreen } from './components/screens/HomeScreen';
import { LoginScreen } from './components/screens/LoginScreen';
import { SignupScreen } from './components/screens/SignupScreen';
import { ResetPasswordScreen } from './components/screens/ResetPasswordScreen';
import { SetupScreen } from './components/screens/SetupScreen';
import { InterviewScreen } from './components/screens/InterviewScreen';
import { ResultScreen } from './components/screens/ResultScreen';
import { UserDashboardScreen } from './components/screens/UserDashboardScreen';
import { FeedbackScreen } from './components/screens/FeedbackScreen';
import { AdminStatsScreen } from './components/screens/AdminStatsScreen';
import { DataRetentionScreen } from './components/screens/DataRetentionScreen';
import { TermsScreen } from './components/screens/TermsScreen';
import { PrivacyScreen } from './components/screens/PrivacyScreen';
import { DebugScreen } from './components/screens/DebugScreen';

function AppContent() {
  const {
    currentScreen,
    interviewSettings,
    interviewQuestions,
    sessionRecovered,
    startInterview,
    goToHome,
    startInterviewWithSettings,
    completeInterview,
    startNewInterview
  } = useInterviewState();

  return (
    <div className="App">
      <Header />
      
      {currentScreen === 'home' && (
        <HomeScreen onStartInterview={startInterview} />
      )}
      
      {currentScreen === 'setup' && (
        <SetupScreen 
          onBack={goToHome}
          onStartInterview={startInterviewWithSettings}
        />
      )}
      
      {currentScreen === 'interview' && interviewSettings && (
        <InterviewScreen
          settings={interviewSettings}
          onBack={goToHome}
          onComplete={completeInterview}
          initialQuestions={interviewQuestions}
          sessionRecovered={sessionRecovered}
        />
      )}
      
      {currentScreen === 'result' && interviewSettings && (
        <ResultScreen
          settings={interviewSettings}
          questions={interviewQuestions}
          onNewInterview={startNewInterview}
        />
      )}
      
      <PerformanceMonitor />
    </div>
  );
}

function App() {
  const { user, loading, error } = useAuth();

  // Supabase設定エラーの場合は専用画面を表示
  if (error && error.includes('Supabase設定エラー')) {
    return (
      <SupabaseConfigError 
        error={error} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  // 認証状態の読み込み中
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center">
        <LoadingSpinner size="lg" message="アプリケーションを読み込み中..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <div className="min-h-screen flex flex-col">
          <Router>
            <main className="flex-grow">
              <Routes>
                {/* 認証不要な画面 */}
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/signup" element={<SignupScreen />} />
                <Route path="/reset-password" element={<ResetPasswordScreen />} />
                <Route path="/terms" element={<TermsScreen />} />
                <Route path="/privacy" element={<PrivacyScreen />} />
                
                {/* 認証コールバック */}
                <Route path="/auth/callback" element={<AuthCallback />} />
                
                {/* 開発環境のみ：デバッグ画面 */}
                {process.env.NODE_ENV === 'development' && (
                  <>
                    <Route path="/debug" element={<DebugScreen />} />
                    <Route path="/admin/stats" element={<AdminStatsScreen />} />
                  </>
                )}
                
                {/* 認証が必要な画面 */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <UserDashboardScreen />
                  </ProtectedRoute>
                } />
                
                <Route path="/feedback" element={
                  <ProtectedRoute>
                    <FeedbackScreen />
                  </ProtectedRoute>
                } />
                
                <Route path="/data-retention" element={
                  <ProtectedRoute>
                    <DataRetentionScreen />
                  </ProtectedRoute>
                } />
                
                <Route path="/*" element={
                  <ProtectedRoute>
                    <AppContent />
                  </ProtectedRoute>
                } />
              </Routes>
            </main>
            <Footer />
          </Router>
        </div>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;