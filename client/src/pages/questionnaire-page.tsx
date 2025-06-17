import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useQuestionnaire } from "@/hooks/use-questionnaire";
import SectionNav from "@/components/section-nav";
import DynamicRiskToleranceForm from "@/components/dynamic-risk-tolerance-form";
import ClientUpdateForm from "@/components/client-update-form";
import InvestmentPolicyForm from "@/components/investment-policy-form";
import Notification from "@/components/notification";
import { LogOut } from "lucide-react";
import { SectionType, sectionTypes, Client, Questionnaire } from "@shared/schema";

// Define user type that combines properties from both client and admin
interface User {
  id: number;
  type: "client" | "admin";
  clientNumber?: string;
  name?: string;
  availableSections?: string[];
  [key: string]: any;
}

interface QuestionnairePageProps {
  section: string;
  initialToken?: string | null;
}

export default function QuestionnairePage({ section, initialToken }: QuestionnairePageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<SectionType>(section as SectionType || "riskTolerance");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [tokenVerified, setTokenVerified] = useState<boolean>(false);

  // Verify token if provided
  useEffect(() => {
    if (initialToken && !tokenVerified) {
      verifyToken(initialToken);
    }
  }, [initialToken, tokenVerified]);

  // Fetch current user with explicit retry and cache settings
  const userQuery = useQuery<User | null>({
    queryKey: ["/api/user"],
    refetchOnWindowFocus: true,
    retry: 3,
    refetchInterval: 2000, // Retry every 2 seconds if needed
    staleTime: 1000, // Consider data stale after 1 second
  });
  
  // Debug logged-in user data
  useEffect(() => {
    console.log("User query state:", {
      isLoading: userQuery.isLoading,
      isError: userQuery.isError,
      error: userQuery.error,
      isFetched: userQuery.isFetched,
      data: userQuery.data
    });
    
    if (userQuery.data) {
      console.log("Client logged in with data:", JSON.stringify(userQuery.data, null, 2));
      console.log("User type:", userQuery.data.type);
      console.log("User ID:", userQuery.data.id);
      console.log("Available sections:", 
        userQuery.data.availableSections 
          ? JSON.stringify(userQuery.data.availableSections) 
          : "None found");
    }
  }, [userQuery.data, userQuery.isLoading, userQuery.isError]);

  // Redirect if not authenticated
  useEffect(() => {
    if (userQuery.isSuccess && !userQuery.data) {
      navigate("/");
    }
  }, [userQuery.isSuccess, userQuery.data, navigate]);

  // Handle section change from URL
  useEffect(() => {
    if (section && ["riskTolerance", "clientUpdate", "investmentPolicy"].includes(section)) {
      setActiveSection(section as SectionType);
    }
  }, [section]);

  // Questionnaire context
  const { questionnaire, isLoading, error, submitQuestionnaire } = useQuestionnaire(activeSection);

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

  // Verify token function
  const verifyToken = async (token: string) => {
    try {
      const res = await fetch("/api/verify-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setTokenVerified(true);
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        
        // Check if client has any available sections
        if (data.hasAvailableSections === false) {
          toast({
            title: "No questionnaires available",
            description: "You don't have any questionnaires assigned to complete",
          });
        }
        
        // Navigate to the correct section
        if (data.section) {
          setActiveSection(data.section as SectionType);
          navigate(`/questionnaire/${data.section}`);
        }
        
        toast({
          title: "Access granted",
          description: "Welcome to your questionnaire",
        });
      } else {
        toast({
          title: "Invalid link",
          description: data.message || "Unable to verify access",
          variant: "destructive",
        });
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Error verifying link",
        description: "There was an issue with your access link",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  // Handle section change
  const handleSectionChange = (section: SectionType) => {
    setActiveSection(section);
    navigate(`/questionnaire/${section}`);
  };

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Show notification
  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Client number from user data
  const clientData = userQuery.data;

  // Not authenticated
  if (userQuery.isSuccess && !userQuery.data && !initialToken) {
    navigate("/");
    return null;
  }
  
  // Log full client data for debugging
  console.log("Full client data:", JSON.stringify(clientData, null, 2));
  
  // Handle admin users who shouldn't see questionnaires
  const isClient = clientData?.type === "client";
  
  // Add more detailed checks for available sections
  let availableSectionsArray: SectionType[] = [];
  
  // Safe check for client data and available sections
  if (isClient && clientData) {
    console.log("Client type check passed. Checking available sections...");
    
    // Check for availableSections in different formats
    if (clientData.availableSections) {
      console.log("Raw available sections:", clientData.availableSections);
      
      // Case 1: It's already an array
      if (Array.isArray(clientData.availableSections)) {
        console.log("availableSections is an array");
        availableSectionsArray = clientData.availableSections
          .filter(section => sectionTypes.includes(section as SectionType))
          .map(section => section as SectionType);
      } 
      // Case 2: It's a string representation of an array
      else if (typeof clientData.availableSections === 'string') {
        console.log("availableSections is a string, trying to parse");
        try {
          const parsed = JSON.parse(clientData.availableSections);
          if (Array.isArray(parsed)) {
            availableSectionsArray = parsed
              .filter(section => sectionTypes.includes(section as SectionType))
              .map(section => section as SectionType);
          }
        } catch (e) {
          console.error("Error parsing availableSections:", e);
        }
      }
    } else {
      console.log("No availableSections found in client data");
    }
  } else {
    console.log("Client type check failed or no client data");
  }
  
  console.log("Final processed available sections:", availableSectionsArray);
  
  // Only show questionnaires if:
  // 1. The user is a client
  // 2. They have available sections assigned
  const hasQuestionnaires = isClient && availableSectionsArray.length > 0;

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
            </div>
            {clientData && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-neutral-500">
                  {clientData.type === "client" ? (
                    <>Client #{clientData.clientNumber || clientData.id}</>
                  ) : (
                    <>Admin: {clientData.name || "Administrator"}</>
                  )}
                </span>
                <Button variant="ghost" onClick={handleLogout} size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Check if client has any questionnaires assigned */}
          {!hasQuestionnaires ? (
            <div className="bg-white shadow-sm rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-neutral-800 mb-4">Thank you for filling out your questionnaire(s)</h2>
              <p className="text-neutral-600 mb-6">
                You have no more questionnaires left to fill. Please contact your advisor if you are expecting to see a questionnaire here or if you received a link to fill out a questionnaire. - Thanks! - Northern Light Wealth
              </p>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          ) : (
            <>
              {/* Section Navigation */}
              <SectionNav
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
                availableSections={availableSectionsArray}
              />

              {/* Form Sections */}
              <div className="mt-8 space-y-10">
                {activeSection === "riskTolerance" && (
                  <DynamicRiskToleranceForm
                    initialData={questionnaire?.data}
                    isLoading={isLoading}
                    onSubmit={(data) => {
                      submitQuestionnaire(data, {
                        onSuccess: () => {
                          showNotification("Risk assessment completed successfully.");
                        },
                        onError: (error) => {
                          showNotification(error.message, "error");
                        },
                      });
                    }}
                    riskScore={questionnaire?.score}
                    riskProfile={questionnaire?.riskProfile}
                  />
                )}

                {activeSection === "clientUpdate" && (
                  <ClientUpdateForm
                    initialData={questionnaire?.data}
                    isLoading={isLoading}
                    onSubmit={(data) => {
                      submitQuestionnaire(data, {
                        onSuccess: () => {
                          showNotification("Client information updated successfully.");
                        },
                        onError: (error) => {
                          showNotification(error.message, "error");
                        },
                      });
                    }}
                  />
                )}

                {activeSection === "investmentPolicy" && (
                  <InvestmentPolicyForm
                    initialData={questionnaire?.data}
                    isLoading={isLoading}
                    onSubmit={(data) => {
                      submitQuestionnaire(data, {
                        onSuccess: () => {
                          showNotification("Investment policy statement confirmed.");
                        },
                        onError: (error) => {
                          showNotification(error.message, "error");
                        },
                      });
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

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
