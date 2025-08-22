
import { useEffect } from "react";

interface DocumentHeadProps {
  title?: string;
  description?: string;
}

export default function DocumentHead({ 
  title = "FinNavigator — Your partner in financial forensics",
  description = "ML-powered analysis of bank statements and ledgers for actionable investigations"
}: DocumentHeadProps) {
  useEffect(() => {
    document.title = title;
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }
    
    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', title);
    }
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', description);
    }
  }, [title, description]);

  return null;
}
