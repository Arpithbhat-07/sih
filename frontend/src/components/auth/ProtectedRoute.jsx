import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-shell flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <div className="text-xs text-[#737987] font-mono tracking-wide">VERIFYING JURISDICTIONAL CREDENTIALS...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};