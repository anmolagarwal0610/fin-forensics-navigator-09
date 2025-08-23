
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function BackToLanding() {
  return (
    <div className="absolute top-6 left-6">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
        <Link to="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
      </Button>
    </div>
  );
}
