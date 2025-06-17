import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type VersionHistoryItem = {
  version: number;
  title: string;
  createdAt: string;
};

type VersionInfo = {
  current: {
    id: string;
    version: number;
    title: string;
    createdAt: string;
  };
  history: VersionHistoryItem[];
  latestVersion: number;
};

interface VersionInfoProps {
  section: string;
}

export default function VersionInfo({ section }: VersionInfoProps) {
  const { toast } = useToast();
  const [showHistory, setShowHistory] = useState(false);
  
  // Fetch version info
  const { data, isLoading, isError } = useQuery<VersionInfo>({
    queryKey: [`/api/question-templates/${section}/versions`],
    refetchOnWindowFocus: false,
  });
  
  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/question-templates/${section}/test-update`
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Updated",
        description: "A new version of the template has been created.",
      });
      // Invalidate version info query to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/question-templates/${section}/versions`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Version Information</CardTitle>
          <CardDescription>Loading version information...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }
  
  if (isError || !data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Version Information</CardTitle>
          <CardDescription>Failed to load version information</CardDescription>
        </CardHeader>
        <CardContent className="text-destructive">
          Error loading version data.
        </CardContent>
      </Card>
    );
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Template Version</CardTitle>
            <CardDescription>
              Information about the current questionnaire template
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            v{data.current.version}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium">Current Template</h3>
            <p className="text-base">{data.current.title}</p>
            <p className="text-sm text-muted-foreground">
              Created: {formatDate(data.current.createdAt)}
            </p>
          </div>
          
          {showHistory && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-2">Version History</h3>
                <div className="space-y-2">
                  {data.history.map((item) => (
                    <div 
                      key={item.version}
                      className={`p-2 rounded-md ${item.version === data.current.version ? 'bg-accent/50' : ''}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Version {item.version}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm">{item.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowHistory(!showHistory)}
        >
          <History className="h-4 w-4 mr-2" />
          {showHistory ? "Hide History" : "Show History"}
        </Button>
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Create New Version
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}