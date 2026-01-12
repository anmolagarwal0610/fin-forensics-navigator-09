import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
        // Call edge function to get shared content
        const { data, error: fnError } = await supabase.functions.invoke('get-shared-fund-trail', {
          body: null,
          headers: {},
        });

        // The function returns HTML directly, but we need to pass the code as query param
        // So we'll make a direct fetch call instead
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL || 'https://rwzpffsaivgjuuthvkfa.supabase.co'}/functions/v1/get-shared-fund-trail?code=${code}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load shared content');
        }

        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('text/html')) {
          const html = await response.text();
          setHtmlContent(html);
        } else {
          const data = await response.json();
          if (data.error) {
            throw new Error(data.error);
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