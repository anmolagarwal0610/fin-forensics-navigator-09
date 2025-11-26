import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

const MobileMenu = () => {
  const [open, setOpen] = useState(false);

  const handleLinkClick = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <nav className="flex flex-col gap-4 mt-8" role="navigation">
          <Link 
            to="/pricing" 
            className="text-lg font-medium text-foreground hover:text-accent transition-colors py-2"
            onClick={handleLinkClick}
          >
            Pricing
          </Link>
          <Link 
            to="/security" 
            className="text-lg font-medium text-foreground hover:text-accent transition-colors py-2"
            onClick={handleLinkClick}
          >
            Security
          </Link>
          <Link 
            to="/about" 
            className="text-lg font-medium text-foreground hover:text-accent transition-colors py-2"
            onClick={handleLinkClick}
          >
            About
          </Link>
          <Link 
            to="/contact" 
            className="text-lg font-medium text-foreground hover:text-accent transition-colors py-2"
            onClick={handleLinkClick}
          >
            Contact
          </Link>
          <div className="pt-4 border-t border-border">
            <Link to="/signin" onClick={handleLinkClick}>
              <Button variant="default" className="w-full">
                Sign In
              </Button>
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
