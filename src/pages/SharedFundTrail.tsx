import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import DocumentHead from "@/components/common/DocumentHead";

export default function SharedFundTrail() {
  const { code } = useParams<{ code: string }>();
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadShare() {
      if (!code) {
        setError('Invalid share link');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `https://rwzpffsaivgjuuthvkfa.supabase.co/functions/v1/get-shared-fund-trail?code=${encodeURIComponent(code)}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'text/html, application/json',
            },
          }
        );

        const contentType = response.headers.get('content-type') || '';
        
        if (!response.ok) {
          // For error responses, try to parse as JSON
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load shared content');
          } else {
            throw new Error(`Failed to load: ${response.status} ${response.statusText}`);
          }
        }

        // For successful responses, check content type
        if (contentType.includes('text/html')) {
          const html = await response.text();
          setHtmlContent(html);
        } else if (contentType.includes('application/json')) {
          // Might be a JSON error response with 200 status
          const data = await response.json();
          if (data.error) {
            throw new Error(data.error);
          }
          throw new Error('Unexpected response format');
        } else {
          // Unknown content type, try as text
          const text = await response.text();
          if (text.startsWith('<!') || text.startsWith('<html')) {
            setHtmlContent(text);
          } else {
            throw new Error('Invalid response format');
          }
        }
      } catch (err) {
        console.error('Error loading shared fund trail:', err);
        setError(err instanceof Error ? err.message : 'Failed to load shared content');
      } finally {
        setIsLoading(false);
      }
    }

    loadShare();
  }, [code]);

  if (isLoading) {
    return (
      <>
        <DocumentHead title="Loading Shared Fund Trail - FinNavigator" />
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading shared Fund Trail...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <DocumentHead title="Share Error - FinNavigator" />
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Unable to Load Share</h2>
                  <p className="text-muted-foreground">{error}</p>
                </div>
                <div className="pt-4 space-y-2">
                  <Button 
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/'}
                    variant="ghost"
                    className="w-full"
                  >
                    Go to Homepage
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!htmlContent) {
    return (
      <>
        <DocumentHead title="Share Not Found - FinNavigator" />
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">Share not found or has been removed.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <DocumentHead title="Shared Fund Trail - FinNavigator" />
      <iframe
        srcDoc={htmlContent}
        className="w-full h-screen border-0"
        sandbox="allow-scripts allow-same-origin"
        title="Shared Fund Trail Analysis"
      />
    </>
  );
}