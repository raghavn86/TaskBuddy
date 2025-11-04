import React, { useEffect, useState, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { usePartnership } from './context/PartnershipContext';

// Components
import AppLayout from './components/layout/AppLayout';
import Loading from './components/common/Loading';

// Pages
import Login from './pages/Login';
import Templates from './pages/Templates';
import TemplateDetail from './pages/TemplateDetail';
import ExecutionPlans from './pages/ExecutionPlans';
import ExecutionPlanDetail from './pages/ExecutionPlanDetail';
import Wellness from './pages/Wellness';
import Analytics from './pages/Analytics';
import Logs from './pages/Logs';
import NotFound from './pages/NotFound';

// Partnership Pages
import PartnershipsPage from './pages/partnerships';
import PartnershipDetail from './pages/partnerships/PartnershipDetail';
import CreatePartnership from './pages/partnerships/CreatePartnership';

// Private route wrapper
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <Loading />;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

// Partnership protected route
const PartnershipRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activePartnership, loading: partnershipLoading, userPartnerships } = usePartnership();
  const location = useLocation();
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  
  // If we're still loading, show loading indicator
  if (partnershipLoading) {
    return <Loading />;
  }
  
  // If we have partnerships but no active one is selected,
  // and we haven't tried redirecting yet, redirect once
  if (!activePartnership && userPartnerships.length > 0 && !redirectAttempted) {
    setRedirectAttempted(true);
    return <Navigate to="/partnerships" replace state={{ from: location }} />;
  }
  
  // If we still don't have an active partnership but not loading,
  // render the partnerships page component directly to prevent redirect loops
  if (!activePartnership && !partnershipLoading && redirectAttempted) {
    return <Navigate to="/partnerships" replace />;
  }
  
  // Everything is fine, render the children
  return <>{children}</>;
};

const App: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const { 
    loading: partnershipLoading, 
    userPartnerships, 
    activePartnership,
  } = usePartnership();
  const location = useLocation();

  // Memoize expensive calculations
  const validAppRoutes = useMemo(() => ['/templates', '/plans', '/wellness', '/analytics', '/logs'], []);
  
  const isOnValidRoute = useMemo(() => 
    validAppRoutes.some(route => location.pathname.startsWith(route)),
    [location.pathname, validAppRoutes]
  );
  
  const shouldRedirectToPartnerships = useMemo(() => 
    currentUser && 
    !partnershipLoading && 
    !isOnValidRoute &&
    (!activePartnership || userPartnerships.length === 0),
    [currentUser, partnershipLoading, isOnValidRoute, activePartnership, userPartnerships.length]
  );

  if (loading || partnershipLoading) {
    return <Loading />;
  }
  
  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />
      
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        {shouldRedirectToPartnerships ? (
          <>
            <Route index element={<Navigate to="/partnerships" />} />
            <Route path="templates" element={<Navigate to="/partnerships" />} />
            <Route path="plans" element={<Navigate to="/partnerships" />} />
            <Route path="wellness" element={<Navigate to="/partnerships" />} />
            <Route path="analytics" element={<Navigate to="/partnerships" />} />
            <Route path="logs" element={<Navigate to="/partnerships" />} />
          </>
        ) : (
          <>
            <Route index element={<Navigate to="/templates" />} />

            {/* Routes requiring active partnership protection */}
            <Route path="templates" element={<PartnershipRoute><Templates /></PartnershipRoute>} />
            <Route path="templates/:templateId" element={<PartnershipRoute><TemplateDetail /></PartnershipRoute>} />
            <Route path="plans" element={<PartnershipRoute><ExecutionPlans /></PartnershipRoute>} />
            <Route path="plans/:planId" element={<PartnershipRoute><ExecutionPlanDetail /></PartnershipRoute>} />
            <Route path="wellness" element={<PartnershipRoute><Wellness /></PartnershipRoute>} />
            <Route path="analytics" element={<PartnershipRoute><Analytics /></PartnershipRoute>} />
            <Route path="logs" element={<PartnershipRoute><Logs /></PartnershipRoute>} />
          </>
        )}
        
        <Route path="partnerships" element={<PartnershipsPage />} />
        <Route path="partnerships/new" element={<CreatePartnership />} />
        <Route path="partnerships/:partnershipId" element={<PartnershipDetail />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;