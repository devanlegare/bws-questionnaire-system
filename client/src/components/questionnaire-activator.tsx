import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { SectionType, sectionTypes } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Loader2, Save, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface QuestionnaireActivatorProps {
  client: any;
}

export default function QuestionnaireActivator({ client }: QuestionnaireActivatorProps) {
  const { toast } = useToast();
  const [selectedSections, setSelectedSections] = useState<SectionType[]>([]);
  const [changed, setChanged] = useState(false);
  const [completedSections, setCompletedSections] = useState<Record<string, boolean>>({});
  
  // Get completed questionnaires for this client
  const { data: questionnaires } = useQuery({
    queryKey: ["/api/client", client?.id, "questionnaires"],
    queryFn: async () => {
      if (!client?.id) return [];
      const res = await apiRequest("GET", `/api/client/${client.id}/questionnaires`);
      return await res.json();
    },
    enabled: !!client?.id,
  });
  
  // Initialize selected sections from client data
  useEffect(() => {
    if (client && client.availableSections && Array.isArray(client.availableSections)) {
      setSelectedSections(client.availableSections as SectionType[]);
      setChanged(false);
    } else {
      // Default to empty array if nothing is set
      setSelectedSections([]);
      setChanged(true);
    }
  }, [client]);
  
  // Process questionnaires to determine which sections have been completed
  useEffect(() => {
    if (questionnaires && Array.isArray(questionnaires)) {
      const completed: Record<string, boolean> = {};
      
      // Group by section and find the most recent for each
      const sectionGroups: Record<string, any[]> = {};
      questionnaires.forEach(q => {
        if (!sectionGroups[q.section]) {
          sectionGroups[q.section] = [];
        }
        sectionGroups[q.section].push(q);
      });
      
      // Find latest questionnaire for each section
      Object.keys(sectionGroups).forEach(section => {
        // Sort by date (assuming createdAt is a date string or timestamp)
        const sorted = sectionGroups[section].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        // Mark section as completed if most recent questionnaire is completed
        if (sorted.length > 0 && sorted[0].completed) {
          completed[section] = true;
        }
      });
      
      setCompletedSections(completed);
    }
  }, [questionnaires]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (sections: SectionType[]) => {
      const res = await apiRequest(
        "PUT", 
        `/api/client/${client.id}/questionnaires`,
        { availableSections: sections }
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Questionnaires Updated",
        description: "Client questionnaire access has been updated successfully.",
      });
      // Invalidate the client query to get updated data
      queryClient.invalidateQueries({ queryKey: ["/api/client"] });
      setChanged(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle section toggle
  const toggleSection = (section: SectionType) => {
    setSelectedSections(prev => {
      const newSections = prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section];
      setChanged(true);
      return newSections;
    });
  };

  // Labels for section types
  const sectionLabels: Record<SectionType, string> = {
    riskTolerance: "Risk Tolerance Assessment",
    clientUpdate: "Client Information Update",
    investmentPolicy: "Investment Policy Statement"
  };

  // Save changes
  const saveChanges = () => {
    updateMutation.mutate(selectedSections);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Activate Questionnaires</CardTitle>
        <CardDescription>
          Manage which questionnaires are available to the client. Completed questionnaires are automatically deactivated.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {client ? (
          <div className="space-y-6">
            <div className="space-y-4">
              {sectionTypes.map((section) => (
                <div key={section} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`section-${section}`}
                    checked={selectedSections.includes(section)}
                    onCheckedChange={() => toggleSection(section)}
                  />
                  <Label htmlFor={`section-${section}`} className="flex items-center gap-2">
                    {sectionLabels[section]}
                    
                    {/* Show completed status */}
                    {completedSections[section] && !selectedSections.includes(section) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="ml-2 gap-1 text-green-600 border-green-200 bg-green-50">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>This questionnaire was completed and automatically deactivated.</p>
                            <p>Check the box to reactivate it for the client.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {/* Show reactivated status */}
                    {completedSections[section] && selectedSections.includes(section) && (
                      <Badge variant="secondary" className="ml-2 gap-1">
                        Reactivated
                      </Badge>
                    )}
                  </Label>
                </div>
              ))}
            </div>
            
            <Button 
              onClick={saveChanges} 
              disabled={!changed || updateMutation.isPending}
              className="w-full"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        ) : (
          <Alert>
            <AlertTitle>No Client Selected</AlertTitle>
            <AlertDescription>
              Please select a client to manage their questionnaire access.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}