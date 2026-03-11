import { Link } from "react-router-dom";
import { Linkedin } from "lucide-react";

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/50 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="text-lg font-bold text-foreground mb-2">
              FinNavigator — by Promarma Technologies
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Professional financial forensics tools for investigations and compliance.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-sm text-muted-foreground">Socials:</span>
              <a
                href="https://x.com/finnavigatorai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="X (Twitter)"
              >
                <XIcon className="h-4 w-4" />
              </a>
              <a
                href="https://www.linkedin.com/company/finnavigatorai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Product</h3>
            <div className="space-y-3">
              <Link 
                to="/pricing" 
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </Link>
              <Link 
                to="/security" 
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Security
              </Link>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Company</h3>
            <div className="space-y-3">
              <Link 
                to="/about" 
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                About
              </Link>
              <Link 
                to="/contact" 
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </Link>
              <Link 
                to="/privacy" 
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
              <Link 
                to="/terms" 
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </Link>
              <Link 
                to="/blogs" 
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Blogs
              </Link>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © 2025 Promarma Technologies. All rights reserved.
          </p>
          <div className="mt-4 sm:mt-0">
            <p className="text-sm text-muted-foreground">
              Contact: hello@finnavigatorai.com
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;