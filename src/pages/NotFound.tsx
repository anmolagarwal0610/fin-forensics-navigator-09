import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-2xl font-semibold mb-4">Page not found</h2>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link to="/">
            <Button variant="cta" className="w-full sm:w-auto">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Link to="/contact">
            <Button variant="outline" className="w-full sm:w-auto ml-0 sm:ml-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
          </Link>
        </div>
        
        <div className="mt-12 text-sm text-muted-foreground">
          <Link to="/" className="font-semibold text-foreground hover:text-accent transition-colors">
            FinNavigator
          </Link>
          <span className="mx-2">—</span>
          <span>Your partner in financial forensics</span>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
