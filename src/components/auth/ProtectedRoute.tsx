
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthSession } from "@/hooks/useAuthSession";
import { Card } from "@/components/ui/card";
import AppLayout from "@/components/app/AppLayout";
import { Suspense, useEffect, useState } from "react";

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Card className="p-6">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span>Loading...</span>
      </div>
    </Card>
  </div>
);

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [routerReady, setRouterReady] = useState(false);
  
  // Wait for router to be ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setRouterReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  let user, loading, authError = false;
  
  try {
    const authData = useAuthSession();
    user = authData.user;
    loading = authData.loading;
  } catch (error) {
    console.error('Error in useAuthSession:', error);
    authError = true;
  }

  // Show loading while router is initializing
  if (!routerReady) {
    return <LoadingFallback />;
  }

  let location;
  try {
    location = useLocation();
  } catch (error) {
    console.error('Error getting location:', error);
    // If we can't get location, just show loading
    return <LoadingFallback />;
  }

  if (loading) {
    return <LoadingFallback />;
  }

  if (authError || !user) {
    try {
      return <Navigate to="/signin" replace state={{ from: location }} />;
    } catch (error) {
      console.error('Error navigating:', error);
      // Fallback: redirect using window.location
      window.location.href = '/signin';
      return <LoadingFallback />;
    }
  }

  if (children) {
    return (
      <AppLayout>
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Suspense fallback={<LoadingFallback />}>
        <Outlet />
      </Suspense>
    </AppLayout>
  );
};

export default ProtectedRoute;
