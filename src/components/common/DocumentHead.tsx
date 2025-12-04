import { useEffect } from "react";

interface DocumentHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  type?: "website" | "article" | "product";
  noIndex?: boolean;
}

const BASE_URL = "https://finnavigatorai.com";

export default function DocumentHead({ 
  title = "FinNavigator AI — Financial Forensics Software",
  description = "AI-powered analysis of bank statements and ledgers for actionable financial investigations. Transform complex financial data into clear insights.",
  canonicalPath = "/",
  type = "website",
  noIndex = false
}: DocumentHeadProps) {
  useEffect(() => {
    // Update document title
    document.title = title;
    
    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);
    
    // Update or create canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', `${BASE_URL}${canonicalPath}`);
    
    // Update Open Graph tags
    const updateMetaTag = (property: string, content: string, isProperty = true) => {
      const selector = isProperty ? `meta[property="${property}"]` : `meta[name="${property}"]`;
      let tag = document.querySelector(selector);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(isProperty ? 'property' : 'name', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };
    
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:url', `${BASE_URL}${canonicalPath}`);
    updateMetaTag('og:type', type);
    
    // Twitter tags
    updateMetaTag('twitter:title', title, false);
    updateMetaTag('twitter:description', description, false);
    
    // Robots meta
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute('content', noIndex ? 'noindex, nofollow' : 'index, follow');
    
    // Add JSON-LD structured data for SoftwareApplication (only on homepage)
    if (canonicalPath === "/") {
      let jsonLdScript = document.querySelector('script[data-type="json-ld-page"]');
      if (!jsonLdScript) {
        jsonLdScript = document.createElement('script');
        jsonLdScript.setAttribute('type', 'application/ld+json');
        jsonLdScript.setAttribute('data-type', 'json-ld-page');
        document.head.appendChild(jsonLdScript);
      }
      jsonLdScript.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "FinNavigator AI",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "AI-powered financial forensics software that transforms bank statements and ledgers into actionable investigation insights.",
        "url": BASE_URL,
        "author": {
          "@type": "Organization",
          "name": "Promarma Technologies"
        },
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "description": "Contact for enterprise pricing"
        },
        "featureList": [
          "Bank statement analysis",
          "Ledger processing",
          "Person of interest identification",
          "Money flow visualization",
          "AI-powered pattern recognition"
        ]
      });
    }
    
    // Cleanup function
    return () => {
      const pageJsonLd = document.querySelector('script[data-type="json-ld-page"]');
      if (pageJsonLd && canonicalPath === "/") {
        // Keep it for homepage, remove for other pages
      }
    };
  }, [title, description, canonicalPath, type, noIndex]);

  return null;
}
