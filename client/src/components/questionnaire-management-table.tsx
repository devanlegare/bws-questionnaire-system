import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { SectionType, sectionTypes } from "@shared/schema";
import { Loader2, Save, ChevronUp, ChevronDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ClientQuestionnaireState {
  id: number;
  clientNumber: string;
  name: string;
  sections: Record<SectionType, boolean>;
  changed: boolean;
}

interface QuestionnaireManagementTableProps {
  clients: any[];
}

export default function QuestionnaireManagementTable({ clients }: QuestionnaireManagementTableProps) {
  const { toast } = useToast();
  const [clientStates, setClientStates] = useState<ClientQuestionnaireState[]>([]);
  const [savingAll, setSavingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sortField, setSortField] = useState<'clientNumber' | 'name'>('clientNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Section display names
  const sectionLabels: Record<SectionType, string> = {
    riskTolerance: "Risk Tolerance",
    clientUpdate: "Client Update",
    investmentPolicy: "Investment Policy"
  };
  
  // Initialize client states from client data
  useEffect(() => {
    if (clients && clients.length > 0) {
      const states = clients.map(client => ({
        id: client.id,
        clientNumber: client.clientNumber,
        name: client.firstName || client.name,
        sections: sectionTypes.reduce((acc, section) => {
          acc[section] = client.availableSections && 
                         Array.isArray(client.availableSections) && 
                         client.availableSections.includes(section);
          return acc;
        }, {} as Record<SectionType, boolean>),
        changed: false
      }));
      setClientStates(states);
    }
  }, [clients]);

  // Update mutation for a single client
  const updateMutation = useMutation({
    mutationFn: async ({ clientId, sections }: { clientId: number, sections: SectionType[] }) => {
      const res = await apiRequest(
        "PUT", 
        `/api/client/${clientId}/questionnaires`,
        { availableSections: sections }
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Save changes for a specific client
  const saveChangesForClient = async (clientState: ClientQuestionnaireState) => {
    const sectionsToEnable = Object.entries(clientState.sections)
      .filter(([_, enabled]) => enabled)
      .map(([section]) => section as SectionType);
      
    try {
      await updateMutation.mutateAsync({ 
        clientId: clientState.id, 
        sections: sectionsToEnable 
      });
      
      // Mark as no longer changed
      setClientStates(prev => 
        prev.map(cs => 
          cs.id === clientState.id ? { ...cs, changed: false } : cs
        )
      );
      
      toast({
        title: "Questionnaires Updated",
        description: `Questionnaire access updated for client ${clientState.clientNumber}`,
      });
    } catch (error) {
      // Error is handled by mutation
    }
  };
  
  // Save all changed clients
  const saveAllChanges = async () => {
    setSavingAll(true);
    
    try {
      const changedClients = clientStates.filter(cs => cs.changed);
      
      for (const clientState of changedClients) {
        const sectionsToEnable = Object.entries(clientState.sections)
          .filter(([_, enabled]) => enabled)
          .map(([section]) => section as SectionType);
          
        await updateMutation.mutateAsync({ 
          clientId: clientState.id, 
          sections: sectionsToEnable 
        });
      }
      
      // Mark all as no longer changed
      setClientStates(prev => 
        prev.map(cs => ({ ...cs, changed: false }))
      );
      
      toast({
        title: "All Changes Saved",
        description: `Questionnaire access updated for ${changedClients.length} client(s)`,
      });
    } catch (error) {
      // Individual errors are handled by mutation
      toast({
        title: "Some Updates Failed",
        description: "Not all clients could be updated. Please check and try again.",
        variant: "destructive",
      });
    } finally {
      setSavingAll(false);
    }
  };
  
  // Toggle section for a client
  const toggleSection = (clientId: number, section: SectionType) => {
    setClientStates(prev => 
      prev.map(cs => {
        if (cs.id === clientId) {
          const updatedSections = { 
            ...cs.sections, 
            [section]: !cs.sections[section] 
          };
          return { ...cs, sections: updatedSections, changed: true };
        }
        return cs;
      })
    );
  };
  
  // Toggle selection of a client for bulk operations
  const toggleClientSelection = (clientId: number) => {
    setSelectedIds(prev => 
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };
  
  // Toggle selection of all clients
  const toggleAllSelection = () => {
    if (selectedIds.length === clientStates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(clientStates.map(cs => cs.id));
    }
  };
  
  // Toggle a section for all clients
  const bulkToggleSection = (section: SectionType, enabled: boolean) => {
    setClientStates(prev => 
      prev.map(cs => {
        // Skip if already matches desired state
        if (cs.sections[section] === enabled) return cs;
        
        const updatedSections = { 
          ...cs.sections, 
          [section]: enabled 
        };
        return { ...cs, sections: updatedSections, changed: true };
      })
    );
    
    toast({
      title: `${enabled ? 'Enabled' : 'Disabled'} ${sectionLabels[section]}`,
      description: `${sectionLabels[section]} questionnaires ${enabled ? 'enabled' : 'disabled'} for all clients. Click "Save All Changes" to apply.`,
    });
  };
  
  // Check if any clients have changes
  const hasChanges = clientStates.some(cs => cs.changed);
  
  // Calculate how many clients have each section enabled
  const sectionCounts = sectionTypes.reduce((acc, section) => {
    acc[section] = clientStates.filter(cs => cs.sections[section]).length;
    return acc;
  }, {} as Record<SectionType, number>);
  
  // Handle sort toggle
  const handleSortToggle = (field: 'clientNumber' | 'name') => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and reset to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Get sorted client states
  const getSortedClientStates = () => {
    return [...clientStates].sort((a, b) => {
      // Convert to numbers for client number comparison if they're numeric
      if (sortField === 'clientNumber') {
        const aNum = parseInt(a.clientNumber);
        const bNum = parseInt(b.clientNumber);
        
        // If both are valid numbers, compare them numerically
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === 'asc' 
            ? aNum - bNum 
            : bNum - aNum;
        }
        
        // Fall back to string comparison if not numbers
        return sortDirection === 'asc'
          ? a.clientNumber.localeCompare(b.clientNumber)
          : b.clientNumber.localeCompare(a.clientNumber);
      }
      
      // Compare names alphabetically
      return sortDirection === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    });
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Questionnaire Management</CardTitle>
        <CardDescription>
          Select which questionnaires each client can access. Check the boxes to enable questionnaires.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clientStates.length > 0 ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {clientStates.length} clients • Click on column headers to sort
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {sectionTypes.map(section => (
                  <div key={`header-buttons-${section}`} className="flex gap-1">
                    <Button 
                      key={`header-enable-${section}`}
                      size="sm" 
                      variant="outline"
                      className="text-xs flex-1"
                      onClick={() => bulkToggleSection(section, true)}
                    >
                      Enable All {sectionLabels[section]}
                    </Button>
                    <Button 
                      key={`header-disable-${section}`}
                      size="sm" 
                      variant="outline"
                      className="text-xs flex-1"
                      onClick={() => bulkToggleSection(section, false)}
                    >
                      Disable All
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border rounded-md overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 h-12">
                      {/* Removing leftmost checkbox as requested */}
                    </TableHead>
                    <TableHead 
                      className="w-24 cursor-pointer hover:text-primary"
                      onClick={() => handleSortToggle('clientNumber')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Client #</span>
                        {sortField === 'clientNumber' && (
                          sortDirection === 'asc' 
                            ? <ChevronUp className="h-4 w-4" /> 
                            : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-primary"
                      onClick={() => handleSortToggle('name')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Name</span>
                        {sortField === 'name' && (
                          sortDirection === 'asc' 
                            ? <ChevronUp className="h-4 w-4" /> 
                            : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    {sectionTypes.map(section => (
                      <TableHead key={section} className="text-center w-36">
                        {sectionLabels[section]}
                        <div className="text-xs text-muted-foreground">
                          ({sectionCounts[section]}/{clientStates.length})
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedClientStates().map(clientState => (
                    <TableRow key={clientState.id} className={clientState.changed ? "bg-primary/5" : ""}>
                      <TableCell className="h-12">
                        {/* Empty cell where checkbox used to be */}
                      </TableCell>
                      <TableCell className="font-medium">{clientState.clientNumber}</TableCell>
                      <TableCell>{clientState.name}</TableCell>
                      {sectionTypes.map(section => (
                        <TableCell key={`${clientState.id}-${section}`} className="text-center">
                          <Checkbox
                            checked={clientState.sections[section]}
                            onCheckedChange={() => toggleSection(clientState.id, section)}
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        {clientState.changed && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => saveChangesForClient(clientState)}
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {hasChanges && (
              <div className="flex justify-end">
                <Button 
                  onClick={saveAllChanges} 
                  disabled={savingAll}
                  className="min-w-32"
                >
                  {savingAll ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving All...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save All Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Alert>
            <AlertTitle>No Clients Found</AlertTitle>
            <AlertDescription>
              Please add clients to manage their questionnaire access.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}