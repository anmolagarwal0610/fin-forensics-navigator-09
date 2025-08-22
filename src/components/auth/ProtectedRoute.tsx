
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthSession } from "@/hooks/useAuthSession";
import { Card } from "@/components/ui/card";
import AppLayout from "@/components/app/AppLayout";
import { Suspense } from "react";

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
  let user, loading;
  
  try {
    const authData = useAuthSession();
    user = authData.user;
    loading = authData.loading;
  } catch (error) {
    console.error('Error in useAuthSession:', error);
    // Fallback to redirect to sign in if hook fails
    return <Navigate to="/signin" replace />;
  }

  const location = useLocation();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
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
