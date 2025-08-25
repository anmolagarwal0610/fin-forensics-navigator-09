import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Header = () => {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-foreground hover:text-accent transition-colors">
              FinNavigator
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/pricing" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link 
              to="/security" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Security
            </Link>
            <Link 
              to="/about" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
            <Link 
              to="/contact" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </nav>
          
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Link to="/signin">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;