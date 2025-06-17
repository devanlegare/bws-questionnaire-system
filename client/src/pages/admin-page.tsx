import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { sectionTypes, QuestionTemplate, InsertClient } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Copy, UserPlus, LogOut, Link as LinkIcon, AlertCircle, History, Clock, Calendar, Upload, Search, Download, FileDown } from "lucide-react";
import { convertQuestionnaireToCSV, downloadCSV } from "@/lib/utils";
import CSVUpload from "@/components/csv-upload";
import ClientCSVUpload from "@/components/client-csv-upload";
import { convertCSVToQuestionTemplate, CSVRow } from "@/lib/csv-converter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import QuestionnaireDetails from "@/components/questionnaire-details";
import VersionInfo from "@/components/version-info";
import QuestionnaireActivator from "@/components/questionnaire-activator";
import QuestionnaireManagementTable from "@/components/questionnaire-management-table";

// Import schemas for client creation and admin management
import { clientFormSchema, adminFormSchema, changePasswordSchema } from "@shared/schema";

// Section link generation schema
const generateLinkSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  section: z.enum(["riskTolerance", "clientUpdate", "investmentPolicy"], {
    required_error: "Section is required",
  }),
});

export default function AdminPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [questionnairesHistory, setQuestionnairesHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState<'clientNumber' | 'firstName'>('clientNumber');
  // Client search state
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);
  
  // Latest questionnaire results by section
  const [latestQuestionnaires, setLatestQuestionnaires] = useState<Record<string, any>>({
    riskTolerance: null,
    clientUpdate: null,
    investmentPolicy: null,
  });
  const [latestQuestionnairesLoading, setLatestQuestionnairesLoading] = useState(false);
  
  // Get user data from the query
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  // Form for creating new clients
  const newClientForm = useForm<z.infer<typeof clientFormSchema>>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      clientNumber: "",
      firstName: "",
      availableSections: ["riskTolerance"],
    },
  });
  
  // Check if client number already exists
  const checkDuplicateClientNumber = (clientNumber: string) => {
    if (!clientNumber) return false;
    if (!clientsQuery.data) return false;
    
    // Ensure data is an array before using array methods
    const clients = Array.isArray(clientsQuery.data) ? clientsQuery.data : [];
    
    return clients.some((client: any) => 
      client && client.clientNumber === clientNumber
    );
  };

  // Form for generating section links
  const generateLinkForm = useForm<z.infer<typeof generateLinkSchema>>({
    resolver: zodResolver(generateLinkSchema),
    defaultValues: {
      clientId: "",
      section: "riskTolerance",
    },
  });

  // Fetch current user
  const userQuery = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (userQuery.isSuccess && (!userQuery.data || (userQuery.data as any)?.type !== "admin")) {
      navigate("/");
    }
  }, [userQuery.isSuccess, userQuery.data, navigate]);
  
  // Fetch latest questionnaires when a client is selected
  useEffect(() => {
    if (selectedClientId) {
      fetchLatestQuestionnaires(selectedClientId);
    } else {
      // Reset the latest questionnaires when no client is selected
      setLatestQuestionnaires({
        riskTolerance: null,
        clientUpdate: null,
        investmentPolicy: null,
      });
    }
  }, [selectedClientId]);

  // Fetch clients
  const clientsQuery = useQuery({
    queryKey: ["/api/client"],
    enabled: userQuery.isSuccess && (userQuery.data as any)?.type === "admin",
  });
  
  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const res = await apiRequest("DELETE", `/api/client/${clientId}`, null);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Client deleted",
        description: "Client has been deleted successfully",
      });
      // Clear selected client if it was the one deleted
      if (clientToDelete && selectedClientId === clientToDelete.toString()) {
        setSelectedClientId(null);
      }
      // Reset deletion state
      setClientToDelete(null);
      setDeleteConfirmDialogOpen(false);
      // Refresh client list
      queryClient.invalidateQueries({ queryKey: ["/api/client"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting client",
        description: error.message,
        variant: "destructive",
      });
      setDeleteConfirmDialogOpen(false);
    },
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: z.infer<typeof clientFormSchema>) => {
      // Generate name from first name and set default "riskTolerance" in availableSections
      const clientData = {
        ...data,
        name: data.firstName,
        availableSections: ["riskTolerance"]
      };
      const res = await apiRequest("POST", "/api/client", clientData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Client created",
        description: "New client has been created successfully",
      });
      newClientForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/client"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating client",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Bulk import clients mutation
  const bulkImportClientsMutation = useMutation({
    mutationFn: async (clients: InsertClient[]) => {
      const results = [];
      let successCount = 0;
      let failedCount = 0;
      const duplicateClientNumbers: string[] = [];
      const otherErrors: string[] = [];
      
      // Process clients sequentially to avoid race conditions
      for (const client of clients) {
        try {
          // Ensure each client has Risk Tolerance set by default
          const clientData = {
            ...client,
            availableSections: client.availableSections || ["riskTolerance"]
          };
          const res = await apiRequest("POST", "/api/client", clientData);
          
          if (!res.ok) {
            const errorData = await res.json();
            
            if (errorData.message === "Client number already exists") {
              duplicateClientNumbers.push(client.clientNumber);
            } else {
              otherErrors.push(`Client ${client.clientNumber}: ${errorData.message}`);
            }
            
            failedCount++;
            continue;
          }
          
          const result = await res.json();
          results.push(result);
          successCount++;
        } catch (error) {
          console.error("Failed to import client:", client, error);
          otherErrors.push(`Client ${client.clientNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failedCount++;
        }
      }
      
      return { 
        results, 
        successCount, 
        failedCount, 
        duplicateClientNumbers,
        otherErrors 
      };
    },
    onSuccess: (data) => {
      // Create detailed message
      let description = `Successfully imported ${data.successCount} clients.`;
      
      if (data.failedCount > 0) {
        description += ` Failed to import ${data.failedCount} clients.`;
        
        if (data.duplicateClientNumbers.length > 0) {
          const duplicateList = data.duplicateClientNumbers.join(', ');
          description += ` Duplicate client numbers: ${duplicateList}.`;
        }
        
        // Log other errors to console for debugging
        if (data.otherErrors.length > 0) {
          console.error("Import errors:", data.otherErrors);
        }
      }
      
      toast({
        title: "Clients imported",
        description,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/client"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error importing clients",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate link mutation
  const generateLinkMutation = useMutation({
    mutationFn: async (data: z.infer<typeof generateLinkSchema>) => {
      const res = await apiRequest("POST", "/api/generate-link", {
        clientId: parseInt(data.clientId),
        section: data.section,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setGeneratedLink(data.link);
      setLinkDialogOpen(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error generating link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout", {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error logging out",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form for creating admin accounts
  const createAdminForm = useForm<z.infer<typeof adminFormSchema>>({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  // Form for changing password
  const changePasswordForm = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Create admin mutation
  const createAdminMutation = useMutation({
    mutationFn: async (data: z.infer<typeof adminFormSchema>) => {
      const { confirmPassword, ...adminData } = data;
      const res = await apiRequest("POST", "/api/admin/register", adminData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Admin created",
        description: "New administrator account has been created successfully",
      });
      createAdminForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating admin",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof changePasswordSchema>) => {
      const res = await apiRequest("POST", "/api/admin/change-password", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully",
      });
      changePasswordForm.reset();
      // Refresh user data to update password expired status
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error changing password",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle creating a new admin
  const onCreateAdminSubmit = (data: z.infer<typeof adminFormSchema>) => {
    createAdminMutation.mutate(data);
  };
  
  // Handle changing password
  const onChangePasswordSubmit = (data: z.infer<typeof changePasswordSchema>) => {
    changePasswordMutation.mutate(data);
  };
  
  // Copy link to clipboard
  const copyLinkToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast({
        title: "Link copied",
        description: "The link has been copied to clipboard",
      });
    }
  };

  // Handle creating a new client
  const onNewClientSubmit = (data: z.infer<typeof clientFormSchema>) => {
    // Check for duplicate client number before submitting
    if (checkDuplicateClientNumber(data.clientNumber)) {
      toast({
        title: "Error",
        description: "Client number already exists. Please use a different client number.",
        variant: "destructive"
      });
      return;
    }
    
    createClientMutation.mutate(data);
  };

  // Handle generating a section link
  const onGenerateLinkSubmit = (data: z.infer<typeof generateLinkSchema>) => {
    generateLinkMutation.mutate(data);
  };

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Function to download questionnaire as CSV
  const downloadQuestionnaireCSV = async (questionnaire: any) => {
    if (!questionnaire || !questionnaire.data) {
      toast({
        title: "Error",
        description: "No questionnaire data available for download",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find client info if available
      let client;
      if (Array.isArray(clientsQuery.data)) {
        client = clientsQuery.data.find((c: any) => c.id === questionnaire.clientId);
      }
      
      // If it's a risk tolerance questionnaire, we need to fetch the template to format answers
      if (questionnaire.section === "riskTolerance") {
        // Show loading toast
        toast({
          title: "Preparing download",
          description: "Retrieving question template and formatting data...",
        });

        // Fetch the template to get the full questions and answer options
        const res = await apiRequest("GET", `/api/question-templates/${questionnaire.section}`);
        
        if (!res.ok) {
          throw new Error("Failed to load question template");
        }
        
        const template = await res.json();
        
        const formattedAnswers: Array<{ question: string; answer: string; value: number }> = [];
        
        // Process the questionnaire data with template
        if (template && template.questions && Array.isArray(template.questions) && questionnaire.data) {
          console.log("Template loaded successfully:", template);
          
          // Sort keys to ensure questions are in the correct order
          const sortedKeys = Object.keys(questionnaire.data).sort((a, b) => {
            if (a.startsWith('question_') && b.startsWith('question_')) {
              return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
            }
            return a.localeCompare(b);
          });
          
          console.log("Sorting questions for CSV export, keys:", sortedKeys);
          
          for (const key of sortedKeys) {
            // Skip metadata keys that shouldn't be included as questions
            if (key === 'completed' || 
                key === 'version' || 
                key === 'score' || 
                key === 'riskProfile') {
              continue;
            }

            // Find the selected option in the template
            const question = template.questions.find((q: any) => q.id === key);
            
            if (question) {
              // Find the selected option to get its text
              const selectedOption = question.options.find(
                (opt: any) => opt.id === questionnaire.data[key]
              );
              
              if (selectedOption) {
                // Use the question ID as is, but get the answer text from the template
                formattedAnswers.push({
                  question: key, // Keep as question1, question2, etc.
                  answer: selectedOption.text, // But use the full answer text
                  value: selectedOption.value || 0
                });
                console.log(`Processed ${key}, Answer: "${selectedOption.text}", Value: ${selectedOption.value || 0}`);
              } else {
                // Fallback case if somehow we can't find the selected option
                formattedAnswers.push({
                  question: key,
                  answer: questionnaire.data[key],
                  value: 0
                });
                console.log(`Processed ${key} with raw answer value: "${questionnaire.data[key]}"`);
              }
            } else {
              // If we can't find the question in the template, use the raw values
              console.warn(`No matching question found for key: ${key} with value: ${questionnaire.data[key]}`);
              formattedAnswers.push({
                question: key,
                answer: questionnaire.data[key],
                value: 0
              });
            }
          }
        } else {
          console.warn("Template structure is invalid or missing questions:", template);
          // If no template, use raw data
          Object.entries(questionnaire.data).forEach(([key, value]) => {
            if (key !== 'completed' && key !== 'version') {
              formattedAnswers.push({
                question: key,
                answer: value as string,
                value: 0
              });
            }
          });
        }
        
        // Generate the CSV
        const clientName = client ? (client.firstName || client.name || "Unknown") : "Unknown";
        const clientNumber = client ? client.clientNumber : "Unknown";
        
        const sectionNames = {
          riskTolerance: "Risk_Tolerance",
          clientUpdate: "Client_Update",
          investmentPolicy: "Investment_Policy"
        };
        
        const sectionName = sectionNames[questionnaire.section as keyof typeof sectionNames] || questionnaire.section;
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${sectionName}_Responses_${clientName}_${clientNumber}_${timestamp}.csv`;
        
        const csvContent = convertQuestionnaireToCSV(
          questionnaire,
          formattedAnswers,
          clientName,
          clientNumber,
          questionnaire.section,
          questionnaire.createdAt ? new Date(questionnaire.createdAt).toLocaleDateString() : undefined
        );
        
        downloadCSV(csvContent, filename);
      } else {
        // For other sections (clientUpdate, investmentPolicy)
        // Process structured form data
        const formattedAnswers = Object.entries(questionnaire.data).map(([key, value]) => {
          // Skip metadata fields
          if (key === 'completed' || key === 'version') {
            return null;
          }
          
          let formattedQuestion = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
          
          let formattedAnswer = value as string;
          
          // Format boolean values
          if (typeof value === 'boolean') {
            formattedAnswer = value ? 'Yes' : 'No';
          }
          
          // Format date values
          if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
            try {
              const date = new Date(value);
              formattedAnswer = date.toLocaleDateString();
            } catch (e) {
              // If date parsing fails, use the original value
            }
          }
          
          // Format percentage values for investment policy
          if (questionnaire.section === "investmentPolicy" && 
              (key.toLowerCase().includes('percent') || key.toLowerCase().includes('allocation'))) {
            const numValue = parseFloat(value as string);
            if (!isNaN(numValue)) {
              formattedAnswer = `${numValue}%`;
            }
          }
          
          return {
            question: formattedQuestion,
            answer: formattedAnswer,
            value: undefined
          };
        }).filter(item => item !== null) as Array<{ question: string; answer: string; value: undefined }>;
        
        // Generate the CSV
        const clientName = client ? (client.firstName || client.name || "Unknown") : "Unknown";
        const clientNumber = client ? client.clientNumber : "Unknown";
        
        const sectionNames = {
          riskTolerance: "Risk_Tolerance",
          clientUpdate: "Client_Update",
          investmentPolicy: "Investment_Policy"
        };
        
        const sectionName = sectionNames[questionnaire.section as keyof typeof sectionNames] || questionnaire.section;
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${sectionName}_Responses_${clientName}_${clientNumber}_${timestamp}.csv`;
        
        const csvContent = convertQuestionnaireToCSV(
          questionnaire,
          formattedAnswers,
          clientName,
          clientNumber,
          questionnaire.section,
          questionnaire.createdAt ? new Date(questionnaire.createdAt).toLocaleDateString() : undefined
        );
        
        downloadCSV(csvContent, filename);
      }
      
      toast({
        title: "CSV Downloaded",
        description: "Questionnaire data has been downloaded as CSV",
      });
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download questionnaire data",
        variant: "destructive",
      });
    }
  };
  
  // Fetch latest questionnaires for each section
  const fetchLatestQuestionnaires = async (clientId: string) => {
    if (!clientId) return;
    
    setLatestQuestionnairesLoading(true);
    
    try {
      const sections = ["riskTolerance", "clientUpdate", "investmentPolicy"];
      const results: Record<string, any> = {};
      
      // Fetch the latest questionnaire for each section in parallel
      await Promise.all(sections.map(async (section) => {
        try {
          const res = await apiRequest("GET", `/api/questionnaire/${section}?clientId=${clientId}`);
          const data = await res.json();
          
          // Only store if it's completed
          if (data && data.completed) {
            results[section] = data;
          } else {
            results[section] = null;
          }
        } catch (error) {
          console.error(`Error fetching ${section} questionnaire:`, error);
          results[section] = null;
        }
      }));
      
      setLatestQuestionnaires(results);
    } catch (error) {
      console.error("Error fetching latest questionnaires:", error);
    } finally {
      setLatestQuestionnairesLoading(false);
    }
  };
  
  // Fetch questionnaire history
  const fetchQuestionnaireHistory = async (clientId: string, section: string) => {
    if (!clientId || !section) return;
    
    setHistoryLoading(true);
    setSelectedSection(section);
    
    try {
      console.log(`Fetching questionnaire history for client ${clientId}, section ${section}`);
      const res = await apiRequest("GET", `/api/questionnaire/${section}/history?clientId=${clientId}`);
      const data = await res.json();
      console.log("History response data:", data);
      
      if (data.questionnaires && Array.isArray(data.questionnaires)) {
        console.log(`Found ${data.questionnaires.length} questionnaire entries`);
        setQuestionnairesHistory(data.questionnaires);
      } else {
        console.warn("No questionnaires array in response", data);
        // Try to handle different response formats
        if (Array.isArray(data)) {
          console.log("Data is an array, using directly");
          setQuestionnairesHistory(data);
        } else {
          setQuestionnairesHistory([]);
        }
      }
      
      setHistoryDialogOpen(true);
    } catch (error) {
      console.error("Error fetching questionnaire history:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch questionnaire history",
        variant: "destructive",
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  // Loading state
  if (userQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated or not admin
  if (!userQuery.isSuccess || !userQuery.data || (userQuery.data as any)?.type !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-800 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <img 
                src="/assets/images/nlw-logo.png" 
                alt="Northern Light Wealth Logo" 
                className="h-12 md:h-16" 
              />
              <h1 className="ml-3 text-xl md:text-2xl font-bold text-neutral-700 hidden sm:block">Admin Dashboard</h1>
            </div>
            <Button variant="ghost" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (clientToDelete) {
                  deleteClientMutation.mutate(clientToDelete);
                }
              }}
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Client"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs defaultValue="clients">
            <TabsList className="mb-6">
              <TabsTrigger value="clients">Add Clients</TabsTrigger>
              <TabsTrigger value="questionnaire-management">Questionnaire Management</TabsTrigger>
              <TabsTrigger value="questionnaires">Questionnaires</TabsTrigger>
              <TabsTrigger value="links">Generate Links</TabsTrigger>
              <TabsTrigger value="admin">Admin Management</TabsTrigger>
            </TabsList>

            {/* Clients Tab */}
            <TabsContent value="clients">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Client List */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Client List</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clientsQuery.isLoading ? (
                      <div className="flex justify-center p-6">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : clientsQuery.isError ? (
                      <div className="p-6 text-center text-red-500">
                        Error loading clients
                      </div>
                    ) : !clientsQuery.data || !Array.isArray(clientsQuery.data) || clientsQuery.data.length === 0 ? (
                      <div className="p-6 text-center text-neutral-500">
                        No clients found. Create your first client.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="mb-4 flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                          >
                            Sort {sortDirection === 'asc' ? '▲' : '▼'}
                          </Button>
                          <Select
                            value={sortField}
                            onValueChange={(value) => setSortField(value as 'clientNumber' | 'firstName')}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="clientNumber">Client Number</SelectItem>
                              <SelectItem value="firstName">First Name</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Client #</TableHead>
                              <TableHead>First Name</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {clientsQuery.data
                              ?.slice()
                              .sort((a: any, b: any) => {
                                // Apply sorting
                                if (sortDirection === 'asc') {
                                  return a[sortField].localeCompare(b[sortField]);
                                } else {
                                  return b[sortField].localeCompare(a[sortField]);
                                }
                              })
                              .map((client: any) => (
                                <TableRow key={client.id}>
                                  <TableCell 
                                    className="font-medium cursor-pointer"
                                    onClick={() => setSelectedClientId(client.id.toString())}
                                  >
                                    {client.clientNumber}
                                  </TableCell>
                                  <TableCell 
                                    className="cursor-pointer"
                                    onClick={() => setSelectedClientId(client.id.toString())}
                                  >
                                    {client.firstName}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setClientToDelete(client.id);
                                        setDeleteConfirmDialogOpen(true);
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </TableCell>
                                </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  {/* Create Client */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Add New Client</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Form {...newClientForm}>
                        <form onSubmit={newClientForm.handleSubmit(onNewClientSubmit)} className="space-y-4">
                          <FormField
                            control={newClientForm.control}
                            name="clientNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Client Number</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Enter 7-digit client number" 
                                    maxLength={7} 
                                    inputMode="numeric"
                                    onChange={e => {
                                      field.onChange(e);
                                      // Only check when the input is 7 digits
                                      if (e.target.value.length === 7 && checkDuplicateClientNumber(e.target.value)) {
                                        newClientForm.setError("clientNumber", {
                                          type: "manual",
                                          message: "This client number already exists"
                                        });
                                      } else {
                                        newClientForm.clearErrors("clientNumber");
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={newClientForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter client's first name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />


                          <Button
                            type="submit"
                            className="w-full"
                            disabled={createClientMutation.isPending}
                          >
                            {createClientMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              "Create Client"
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>

                  {/* Bulk Import Clients */}
                  <ClientCSVUpload 
                    onUpload={(clients) => bulkImportClientsMutation.mutate(clients)}
                    isLoading={bulkImportClientsMutation.isPending}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Questionnaire Management Tab */}
            <TabsContent value="questionnaire-management">
              <div className="grid grid-cols-1 gap-6">
                {/* Questionnaire Management Table */}
                <QuestionnaireManagementTable 
                  clients={Array.isArray(clientsQuery.data) ? clientsQuery.data : []}
                />
                
                {/* Individual Client Questionnaire Management (Legacy) */}
                <Card>
                  <CardHeader>
                    <CardTitle>Manage Individual Client</CardTitle>
                    <CardDescription>
                      Select a specific client to manage their questionnaires individually
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Search className="h-4 w-4 text-neutral-500" />
                          <Input 
                            placeholder="Search clients by name or number..." 
                            onChange={(e) => setClientSearchQuery(e.target.value)}
                            value={clientSearchQuery}
                            className="flex-1"
                          />
                        </div>
                        
                        <div className="max-h-48 overflow-y-auto border rounded-md bg-white">
                          {Array.isArray(clientsQuery.data) ? 
                            (clientsQuery.data
                              .filter((client: any) => {
                                const searchLower = clientSearchQuery.toLowerCase();
                                const firstName = (client.firstName || client.name || "").toLowerCase();
                                const clientNumber = (client.clientNumber || "").toLowerCase();
                                
                                return searchLower === "" || 
                                      firstName.includes(searchLower) || 
                                      clientNumber.includes(searchLower);
                              })
                              .map((client: any) => (
                                <div 
                                  key={client.id} 
                                  className={`
                                    p-2 cursor-pointer hover:bg-neutral-100 transition border-b last:border-b-0
                                    ${selectedClientId === client.id.toString() ? 'bg-primary-50 text-primary' : ''}
                                  `}
                                  onClick={() => setSelectedClientId(client.id.toString())}
                                >
                                  <div className="font-medium">{client.firstName || client.name}</div>
                                  <div className="text-xs text-neutral-500">Client #: {client.clientNumber}</div>
                                </div>
                              ))
                            ) : (
                              <div className="p-2 text-center text-neutral-500">No clients found</div>
                            )
                          }
                        </div>
                        
                        {selectedClientId && Array.isArray(clientsQuery.data) && (
                          <div className="bg-neutral-50 p-2 rounded-md">
                            <div className="text-sm font-medium">Selected Client:</div>
                            <div>
                              {(() => {
                                const client = clientsQuery.data.find((c: any) => c.id.toString() === selectedClientId);
                                return client ? 
                                  <span>
                                    {client.firstName || client.name} ({client.clientNumber})
                                  </span> : 
                                  "Client not found";
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

                      {!selectedClientId ? (
                        <div className="text-center py-8 text-neutral-500">
                          Select a client to manage their questionnaires
                        </div>
                      ) : (
                        <>
                          {/* Questionnaire Activator */}
                          <div>
                            <QuestionnaireActivator 
                              client={Array.isArray(clientsQuery.data) ? 
                                clientsQuery.data.find((c: any) => c.id.toString() === selectedClientId) : null}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>View Questionnaire History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {!selectedClientId ? (
                        <div className="text-center py-8 text-neutral-500">
                          Select a client to view their questionnaire history
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-white rounded-lg p-4 border">
                            <h3 className="font-medium mb-2">Risk Tolerance Questionnaire</h3>
                            
                            {/* Latest Risk Tolerance Data */}
                            {latestQuestionnairesLoading ? (
                              <div className="py-3 flex justify-center">
                                <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                              </div>
                            ) : latestQuestionnaires.riskTolerance ? (
                              <div className="bg-neutral-50 rounded-md p-3 mb-3 text-sm">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium">Latest Submission:</span>
                                  <span className="text-neutral-500 text-xs">
                                    {latestQuestionnaires.riskTolerance.createdAt 
                                      ? formatDate(new Date(latestQuestionnaires.riskTolerance.createdAt)) 
                                      : 'Unknown date'}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-neutral-500 text-xs">Risk Score:</span>
                                    <div className="font-medium">
                                      {latestQuestionnaires.riskTolerance.score ?? 'N/A'}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-neutral-500 text-xs">Risk Profile:</span>
                                    <div className="font-medium">
                                      {latestQuestionnaires.riskTolerance.riskProfile ?? 'N/A'}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="mt-3 pt-2 border-t border-neutral-200">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full flex items-center justify-center gap-2 text-xs"
                                    onClick={() => downloadQuestionnaireCSV(latestQuestionnaires.riskTolerance)}
                                  >
                                    <FileDown className="h-3.5 w-3.5" />
                                    Download CSV
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-neutral-50 rounded-md p-3 mb-3 text-sm text-neutral-500 text-center">
                                No completed submissions
                              </div>
                            )}
                            
                            <Button 
                              variant="outline" 
                              className="w-full flex items-center justify-center gap-2"
                              onClick={() => fetchQuestionnaireHistory(selectedClientId!, "riskTolerance")}
                              disabled={historyLoading}
                            >
                              {historyLoading && selectedSection === "riskTolerance" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <History className="h-4 w-4" />
                              )}
                              View Response History
                            </Button>
                          </div>
                          
                          <div className="bg-white rounded-lg p-4 border">
                            <h3 className="font-medium mb-2">Client Update Form</h3>
                            
                            {/* Latest Client Update Data */}
                            {latestQuestionnairesLoading ? (
                              <div className="py-3 flex justify-center">
                                <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                              </div>
                            ) : latestQuestionnaires.clientUpdate ? (
                              <div className="bg-neutral-50 rounded-md p-3 mb-3 text-sm">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium">Latest Submission:</span>
                                  <span className="text-neutral-500 text-xs">
                                    {latestQuestionnaires.clientUpdate.createdAt 
                                      ? formatDate(new Date(latestQuestionnaires.clientUpdate.createdAt)) 
                                      : 'Unknown date'}
                                  </span>
                                </div>
                                
                                <div className="text-neutral-700">
                                  Client information updated successfully
                                </div>
                                
                                <div className="mt-3 pt-2 border-t border-neutral-200">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full flex items-center justify-center gap-2 text-xs"
                                    onClick={() => downloadQuestionnaireCSV(latestQuestionnaires.clientUpdate)}
                                  >
                                    <FileDown className="h-3.5 w-3.5" />
                                    Download CSV
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-neutral-50 rounded-md p-3 mb-3 text-sm text-neutral-500 text-center">
                                No completed submissions
                              </div>
                            )}
                            
                            <Button 
                              variant="outline" 
                              className="w-full flex items-center justify-center gap-2"
                              onClick={() => fetchQuestionnaireHistory(selectedClientId!, "clientUpdate")}
                              disabled={historyLoading}
                            >
                              {historyLoading && selectedSection === "clientUpdate" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <History className="h-4 w-4" />
                              )}
                              View Response History
                            </Button>
                          </div>
                          
                          <div className="bg-white rounded-lg p-4 border">
                            <h3 className="font-medium mb-2">Investment Policy Statement</h3>
                            
                            {/* Latest Investment Policy Data */}
                            {latestQuestionnairesLoading ? (
                              <div className="py-3 flex justify-center">
                                <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                              </div>
                            ) : latestQuestionnaires.investmentPolicy ? (
                              <div className="bg-neutral-50 rounded-md p-3 mb-3 text-sm">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium">Latest Submission:</span>
                                  <span className="text-neutral-500 text-xs">
                                    {latestQuestionnaires.investmentPolicy.createdAt 
                                      ? formatDate(new Date(latestQuestionnaires.investmentPolicy.createdAt)) 
                                      : 'Unknown date'}
                                  </span>
                                </div>
                                
                                <div className="text-neutral-700">
                                  Investment policy completed
                                </div>
                                
                                <div className="mt-3 pt-2 border-t border-neutral-200">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full flex items-center justify-center gap-2 text-xs"
                                    onClick={() => downloadQuestionnaireCSV(latestQuestionnaires.investmentPolicy)}
                                  >
                                    <FileDown className="h-3.5 w-3.5" />
                                    Download CSV
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-neutral-50 rounded-md p-3 mb-3 text-sm text-neutral-500 text-center">
                                No completed submissions
                              </div>
                            )}
                            
                            <Button 
                              variant="outline" 
                              className="w-full flex items-center justify-center gap-2"
                              onClick={() => fetchQuestionnaireHistory(selectedClientId!, "investmentPolicy")}
                              disabled={historyLoading}
                            >
                              {historyLoading && selectedSection === "investmentPolicy" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <History className="h-4 w-4" />
                              )}
                              View Response History
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Questionnaires Tab */}
            <TabsContent value="questionnaires">
              <div className="grid grid-cols-1 gap-6">
                <h3 className="text-lg font-medium">Questionnaire Templates</h3>
                <p className="text-gray-500 mb-4">
                  Manage questionnaire templates that will be used for client assessments.
                </p>
                
                {/* CSV Upload for Risk Tolerance Questions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Tolerance Questionnaire</CardTitle>
                    <CardDescription>
                      Upload a CSV file with your custom risk tolerance questions and values.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <CSVUpload 
                        title="Upload Risk Tolerance Questions" 
                        description="Download the template, edit it, and upload it back. Make sure to include point values for each answer option."
                        onUpload={(data) => {
                          // Convert CSV data to question template format
                          const template = convertCSVToQuestionTemplate(data, "riskTolerance");
                          
                          // Save the template via API
                          fetch('/api/question-templates', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(template),
                          })
                          .then(response => {
                            if (!response.ok) {
                              throw new Error('Failed to save question template');
                            }
                            return response.json();
                          })
                          .then(() => {
                            toast({
                              title: "Success",
                              description: "Risk tolerance template has been updated successfully",
                            });
                            // Refresh any queries that rely on template data
                            queryClient.invalidateQueries({ queryKey: ['/api/question-templates/riskTolerance/versions'] });
                          })
                          .catch(error => {
                            toast({
                              title: "Error",
                              description: error.message,
                              variant: "destructive",
                            });
                          });
                        }}
                      />
                      
                      {/* Version tracking information */}
                      <VersionInfo section="riskTolerance" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Admin Management Tab */}
            <TabsContent value="admin">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Create Admin Account */}
                <Card>
                  <CardHeader>
                    <CardTitle>Create New Admin</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...createAdminForm}>
                      <form onSubmit={createAdminForm.handleSubmit(onCreateAdminSubmit)} className="space-y-4">
                        <FormField
                          control={createAdminForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="John Doe" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createAdminForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="johndoe" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createAdminForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} placeholder="********" />
                              </FormControl>
                              <FormDescription>
                                Password must be at least 8 characters long
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createAdminForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} placeholder="********" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={createAdminMutation.isPending}
                        >
                          {createAdminMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create Admin"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                {/* Change Password */}
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...changePasswordForm}>
                      <form onSubmit={changePasswordForm.handleSubmit(onChangePasswordSubmit)} className="space-y-4">
                        <FormField
                          control={changePasswordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} placeholder="********" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={changePasswordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} placeholder="********" />
                              </FormControl>
                              <FormDescription>
                                Password must be at least 8 characters long
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={changePasswordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} placeholder="********" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={changePasswordMutation.isPending}
                        >
                          {changePasswordMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            "Change Password"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
                
                {/* Password Expiration Notice */}
                {(user as any)?.passwordExpired && (
                  <div className="md:col-span-2">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Password Expired</AlertTitle>
                      <AlertDescription>
                        Your password has expired and needs to be changed. Northern Light Wealth requires password changes every 6 months for security purposes.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Generate Links Tab */}
            <TabsContent value="links">
              <Card>
                <CardHeader>
                  <CardTitle>Generate Section-Specific Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...generateLinkForm}>
                    <form onSubmit={generateLinkForm.handleSubmit(onGenerateLinkSubmit)} className="space-y-4">
                      <FormField
                        control={generateLinkForm.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Client</FormLabel>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a client" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.isArray(clientsQuery.data) ? 
                                  clientsQuery.data.map((client: any) => (
                                    <SelectItem key={client.id} value={client.id.toString()}>
                                      {client.firstName || client.name} ({client.clientNumber})
                                    </SelectItem>
                                  ))
                                 : []}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={generateLinkForm.control}
                        name="section"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section</FormLabel>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a section" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="riskTolerance">Risk Tolerance Questionnaire</SelectItem>
                                <SelectItem value="clientUpdate">Client Update Form</SelectItem>
                                <SelectItem value="investmentPolicy">Investment Policy Statement</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={generateLinkMutation.isPending}
                      >
                        {generateLinkMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Generate Link
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>

                  {/* Generated Link Dialog */}
                  <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Link Generated</DialogTitle>
                        <DialogDescription>
                          Send this link to your client for direct access to the questionnaire section
                        </DialogDescription>
                      </DialogHeader>
                      <div className="p-4 bg-neutral-50 rounded-md break-all">
                        {generatedLink}
                      </div>
                      <DialogFooter>
                        <Button onClick={copyLinkToClipboard} className="gap-2">
                          <Copy className="h-4 w-4" />
                          Copy to Clipboard
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Questionnaire History Dialog */}
                  <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <History className="h-5 w-5" />
                          Questionnaire History
                        </DialogTitle>
                        <DialogDescription>
                          {selectedSection === "riskTolerance" && "Risk Tolerance Questionnaire History"}
                          {selectedSection === "clientUpdate" && "Client Update Form History"}
                          {selectedSection === "investmentPolicy" && "Investment Policy Statement History"}
                        </DialogDescription>
                      </DialogHeader>
                      
                      {historyLoading ? (
                        <div className="flex justify-center p-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : questionnairesHistory.length === 0 ? (
                        <div className="text-center py-8 text-neutral-500">
                          No questionnaire history found for this client.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <pre className="text-xs text-gray-500 mb-4">Debug: Found {questionnairesHistory.length} entries</pre>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date Submitted</TableHead>
                                  <TableHead>Completion Status</TableHead>
                                  {selectedSection === "riskTolerance" && (
                                    <>
                                      <TableHead>Risk Score</TableHead>
                                      <TableHead>Risk Profile</TableHead>
                                    </>
                                  )}
                                  <TableHead>Details</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {questionnairesHistory.map((questionnaire: any, index: number) => (
                                  <TableRow key={questionnaire.id || `history-${index}`}>
                                    <TableCell className="whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-neutral-500" />
                                        {questionnaire.createdAt ? formatDate(new Date(questionnaire.createdAt)) : "-"}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {questionnaire.completed ? (
                                        <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>
                                      ) : (
                                        <Badge variant="outline" className="bg-amber-100 text-amber-800">In Progress</Badge>
                                      )}
                                    </TableCell>
                                    {selectedSection === "riskTolerance" && (
                                      <>
                                        <TableCell>
                                          {questionnaire.score !== null ? questionnaire.score : "-"}
                                        </TableCell>
                                        <TableCell>
                                          {questionnaire.riskProfile ? (
                                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                              {questionnaire.riskProfile}
                                            </Badge>
                                          ) : "-"}
                                        </TableCell>
                                      </>
                                    )}
                                    <TableCell>
                                      <div className="flex items-center space-x-2">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => {
                                            setSelectedQuestionnaire({
                                              ...questionnaire,
                                              section: selectedSection
                                            });
                                            setDetailsDialogOpen(true);
                                          }}
                                        >
                                          View Details
                                        </Button>
                                        
                                        {questionnaire.completed && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex items-center gap-1"
                                            onClick={() => downloadQuestionnaireCSV(
                                              { ...questionnaire, section: selectedSection }
                                            )}
                                          >
                                            <FileDown className="h-4 w-4" />
                                            <span className="hidden sm:inline">Download CSV</span>
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          
                          <div className="bg-neutral-50 p-4 rounded-md text-sm text-neutral-600">
                            <p className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Questionnaire responses are saved with timestamps to track changes over time.
                            </p>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Questionnaire Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Questionnaire Response Details
                </DialogTitle>
                <DialogDescription>
                  {selectedSection === "riskTolerance" && "Risk Tolerance Questionnaire Responses"}
                  {selectedSection === "clientUpdate" && "Client Update Form Responses"}
                  {selectedSection === "investmentPolicy" && "Investment Policy Statement Responses"}
                </DialogDescription>
              </div>
              
              {selectedQuestionnaire?.completed && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => selectedQuestionnaire && downloadQuestionnaireCSV(selectedQuestionnaire)}
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </Button>
              )}
            </div>
          </DialogHeader>
          
          {selectedQuestionnaire ? (
            <>
              <div className="bg-neutral-50 p-4 rounded-md mb-4">
                <div className="text-sm text-neutral-600">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">Submitted:</span> {
                          selectedQuestionnaire.createdAt 
                            ? formatDate(new Date(selectedQuestionnaire.createdAt))
                            : "Unknown date"
                        }
                      </p>
                    </div>
                    <div>
                      {selectedQuestionnaire.score !== null && selectedQuestionnaire.score !== undefined ? (
                        <p className="flex items-center gap-2 mb-2">
                          <span className="font-medium">Score:</span> {selectedQuestionnaire.score}
                        </p>
                      ) : selectedQuestionnaire.section === "riskTolerance" ? (
                        <p className="flex items-center gap-2 mb-2">
                          <span className="font-medium">Score:</span> No score calculated
                        </p>
                      ) : null}
                      {selectedQuestionnaire.riskProfile ? (
                        <p className="flex items-center gap-2 mb-2">
                          <span className="font-medium">Risk Profile:</span> {selectedQuestionnaire.riskProfile}
                        </p>
                      ) : selectedQuestionnaire.section === "riskTolerance" ? (
                        <p className="flex items-center gap-2 mb-2">
                          <span className="font-medium">Risk Profile:</span> Not calculated
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              
              <QuestionnaireDetails 
                questionnaireId={selectedQuestionnaire.id}
                section={selectedQuestionnaire.section}
                data={selectedQuestionnaire.data}
              />
            </>
          ) : (
            <div className="flex justify-center p-8">
              <p className="text-neutral-500">No questionnaire data available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-sm text-neutral-500">
              &copy; {new Date().getFullYear()} Northern Light Wealth. All rights reserved.
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Secure data transmission. Your information is protected.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
