import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubscriptionBadge } from "@/components/app/SubscriptionBadge";
import { GrantAccessDialog } from "@/components/app/GrantAccessDialog";
import { RevokeAccessDialog } from "@/components/app/RevokeAccessDialog";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Search, UserPlus, Shield } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { TIER_LIMITS } from "@/hooks/useSubscription";

export default function AdminUsers() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: users, isLoading, refetch } = useAdminUsers(searchQuery);
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string } | null>(null);

  // Redirect non-admins
  if (!adminLoading && !isAdmin) {
    toast.error("Access Denied", { description: "You must be an admin to access this page." });
    navigate("/app/dashboard");
    return null;
  }

  const handleGrantAccess = (userId: string, email: string) => {
    setSelectedUser({ id: userId, email });
    setGrantDialogOpen(true);
  };

  const handleRevokeAccess = (userId: string, email: string) => {
    setSelectedUser({ id: userId, email });
    setRevokeDialogOpen(true);
  };

  if (adminLoading || isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user subscriptions and access</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Admin Panel</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users ({users?.length || 0})</CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Pages Used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users && users.length > 0 ? (
                  users.map((user) => {
                    const limit = TIER_LIMITS[user.subscription_tier as keyof typeof TIER_LIMITS] || 50;
                    const isExpired = user.subscription_expires_at 
                      ? new Date(user.subscription_expires_at) < new Date()
                      : false;

                    return (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.full_name}</TableCell>
                        <TableCell>{user.organization_name}</TableCell>
                        <TableCell>
                          <SubscriptionBadge 
                            tier={user.subscription_tier as any}
                            expiresAt={user.subscription_expires_at}
                            isActive={!isExpired}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {user.current_period_pages_used.toLocaleString()} / {limit.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.subscription_expires_at ? (
                            <span className={`text-sm ${isExpired ? 'text-red-500' : ''}`}>
                              {format(new Date(user.subscription_expires_at), 'MMM d, yyyy')}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGrantAccess(user.user_id, user.email)}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              {user.subscription_tier === 'free' ? 'Grant' : 'Extend'}
                            </Button>
                            {user.subscription_tier !== 'free' && (
                              <Button
                                variant="error"
                                size="sm"
                                onClick={() => handleRevokeAccess(user.user_id, user.email)}
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {searchQuery ? 'No users found matching your search' : 'No users yet'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedUser && (
        <>
          <GrantAccessDialog
            open={grantDialogOpen}
            onOpenChange={setGrantDialogOpen}
            userId={selectedUser.id}
            userEmail={selectedUser.email}
            onSuccess={() => {
              refetch();
              setSelectedUser(null);
            }}
          />
          <RevokeAccessDialog
            open={revokeDialogOpen}
            onOpenChange={setRevokeDialogOpen}
            userId={selectedUser.id}
            userEmail={selectedUser.email}
            onSuccess={() => {
              refetch();
              setSelectedUser(null);
            }}
          />
        </>
      )}
    </div>
  );
}
