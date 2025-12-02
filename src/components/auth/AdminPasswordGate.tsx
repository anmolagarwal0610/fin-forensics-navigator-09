import { useEffect, useState } from "react";
import { useAdminPasswordStatus } from "@/hooks/useAdminPasswordStatus";
import { useAdminPasswordVerification } from "@/hooks/useAdminPasswordVerification";
import { Card } from "@/components/ui/card";
import AdminPasswordSetup from "./AdminPasswordSetup";
import AdminPasswordVerify from "./AdminPasswordVerify";

interface AdminPasswordGateProps {
  children: React.ReactNode;
}

const AdminPasswordGate = ({ children }: AdminPasswordGateProps) => {
  const { data: status, isLoading: statusLoading } = useAdminPasswordStatus();
  const { isSessionValid } = useAdminPasswordVerification();
  const [hasValidSession, setHasValidSession] = useState(false);

  useEffect(() => {
    setHasValidSession(isSessionValid());
  }, []);

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Loading...</span>
          </div>
        </Card>
      </div>
    );
  }

  // If session is valid, show admin content
  if (hasValidSession) {
    return <>{children}</>;
  }

  // If password not set, show setup screen
  if (status && !status.isSet) {
    return <AdminPasswordSetup onSuccess={() => setHasValidSession(true)} />;
  }

  // If password is set, show verification screen
  return <AdminPasswordVerify onSuccess={() => setHasValidSession(true)} isLocked={status?.isLocked || false} lockedUntil={status?.lockedUntil || null} />;
};

export default AdminPasswordGate;