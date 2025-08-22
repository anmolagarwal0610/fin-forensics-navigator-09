
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthSession } from "@/hooks/useAuthSession";
import { Card } from "@/components/ui/card";

const ProtectedRoute = () => {
  const { user, loading } = useAuthSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6">Loading…</Card>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
