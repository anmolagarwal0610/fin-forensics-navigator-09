
import AppLayout from "@/components/app/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Account() {
  return (
    <AppLayout>
      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Account settings coming soon.
        </CardContent>
      </Card>
    </AppLayout>
  );
}
