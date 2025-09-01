import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AMCLandingPage from './client/src/pages/Landing'
import LoginForm from './client/src/components/auth/sign_in/login-form'
import SignUpForm from './client/src/components/auth/create_account/sign-up-form'
import './public/globals.css'
import AuthRoute from './client/src/components/auth/AuthRoute'
import { firebaseConfig } from './client/src/components/auth/firebaseConfig'
import { initializeApp } from 'firebase/app'
import Dashboard from './client/src/pages/Dashboard/DashboardPage'
import ForgotPasswordForm from "./client/src/components/auth/sign_in/forgotPasswordform"
import MockExam from './client/src/pages/Dashboard/Practice'
import OnboardingPage from './client/src/pages/not-found.tsx'
import ErrorAnalyticsPage from './client/src/pages/ErrorJournalAnalytics.tsx'
import { XPProvider } from './client/src/hooks/contexts/XPContext'
import { ProblemAnalyticsProvider } from './client/src/hooks/contexts/ProblemContext'
import BookmarkedProblemsViewer from './client/src/pages/BookmarkedProblemsViewer.tsx'
import { getAuth, onAuthStateChanged, User } from 'firebase/auth'
import DropDownMenuWrapper from "./TestComponent.tsx"
import ProblemAnalyticsDashboard from './client/src/pages/ProblemAnalyticsPage.tsx'

initializeApp(firebaseConfig);

// Create an App component to handle user state
 const App = () => {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const auth = getAuth();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
          </div>
          <p className="text-slate-300 font-medium animate-pulse bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-lg">
            Loading application...
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <XPProvider user={user}>
        <ProblemAnalyticsProvider user={user}>
        <Routes>
          <Route path="/" element={<AMCLandingPage />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/sign-up" element={<SignUpForm />} />
          <Route path='*' element={<Navigate to='/'/>} />
          <Route path="/dashboard" element={<AuthRoute><Dashboard /></AuthRoute>} />
          <Route path="/forgot-password" element={<ForgotPasswordForm />} />
          <Route path="/mock-exams" element={<AuthRoute><MockExam /></AuthRoute>} />
          <Route path="/error-analytics" element={<AuthRoute><ErrorAnalyticsPage /></AuthRoute>} />
          <Route path="/bookmarked-problems" element={<AuthRoute><BookmarkedProblemsViewer /></AuthRoute>} />
          <Route path="/problem-data" element={<AuthRoute><ProblemAnalyticsDashboard /></AuthRoute>} />
        </Routes>
      </ProblemAnalyticsProvider>
      </XPProvider>
    </BrowserRouter>
  );
};

export default App;

