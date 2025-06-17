import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Lock, Shield } from "lucide-react";

// Client login schema
const clientLoginSchema = z.object({
  clientNumber: z.string()
    .length(7, "Client number must be exactly 7 digits")
    .regex(/^\d+$/, "Client number must contain only digits"),
});

// Admin login schema
const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Admin registration schema
const adminRegisterSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
});

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("client");

  // Client login form
  const clientForm = useForm<z.infer<typeof clientLoginSchema>>({
    resolver: zodResolver(clientLoginSchema),
    defaultValues: {
      clientNumber: "",
    },
  });

  // Admin login form
  const adminLoginForm = useForm<z.infer<typeof adminLoginSchema>>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Admin registration form
  const adminRegisterForm = useForm<z.infer<typeof adminRegisterSchema>>({
    resolver: zodResolver(adminRegisterSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
    },
  });

  // Client login mutation
  const clientLoginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof clientLoginSchema>) => {
      // For client authentication, we need to send the clientNumber as both username and password
      // as the passport local strategy requires both fields
      const res = await apiRequest("POST", "/api/client/login", {
        clientNumber: data.clientNumber,
        password: data.clientNumber // The clientNumber is also the password
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Login successful",
        description: "You are now logged in",
      });
      navigate("/questionnaire/riskTolerance");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Admin login mutation
  const adminLoginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof adminLoginSchema>) => {
      const res = await apiRequest("POST", "/api/admin/login", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Admin login successful",
        description: "Welcome to the admin panel",
      });
      navigate("/admin");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Admin registration mutation
  const adminRegisterMutation = useMutation({
    mutationFn: async (data: z.infer<typeof adminRegisterSchema>) => {
      const res = await apiRequest("POST", "/api/admin/register", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: "You can now log in with your credentials",
      });
      adminRegisterForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle client login submission
  const onClientSubmit = (data: z.infer<typeof clientLoginSchema>) => {
    clientLoginMutation.mutate(data);
  };

  // Handle admin login submission
  const onAdminLoginSubmit = (data: z.infer<typeof adminLoginSchema>) => {
    adminLoginMutation.mutate(data);
  };

  // Handle admin registration submission
  const onAdminRegisterSubmit = (data: z.infer<typeof adminRegisterSchema>) => {
    adminRegisterMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-800 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <img 
              src="/assets/images/nlw-logo.png" 
              alt="Northern Light Wealth Logo" 
              className="h-12 md:h-16"
            />
            <h1 className="ml-3 text-xl md:text-2xl font-bold text-neutral-700 hidden sm:block">Client Assessment Portal</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-md mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="client">Client Access</TabsTrigger>
              <TabsTrigger value="admin">Admin Access</TabsTrigger>
            </TabsList>

            {/* Client Login Tab */}
            <TabsContent value="client">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-neutral-800">Secure Access</h2>
                    <p className="mt-2 text-neutral-500">Enter your client number to access your assessment form</p>
                  </div>

                  <Form {...clientForm}>
                    <form onSubmit={clientForm.handleSubmit(onClientSubmit)} className="space-y-6">
                      <FormField
                        control={clientForm.control}
                        name="clientNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client Number</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                                <Input
                                  {...field}
                                  type="text"
                                  pattern="[0-9]*"
                                  inputMode="numeric" 
                                  placeholder="Enter your 7-digit client number"
                                  className="pl-10"
                                  maxLength={7}
                                  onKeyPress={(e) => {
                                    // Only allow digits
                                    if (!/[0-9]/.test(e.key)) {
                                      e.preventDefault();
                                    }
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary-600"
                        disabled={clientLoginMutation.isPending}
                      >
                        {clientLoginMutation.isPending ? "Logging in..." : "Continue"}
                      </Button>
                    </form>
                  </Form>

                  <div className="mt-6 text-center">
                    <p className="text-sm text-neutral-500">
                      If you don't know your client number, please contact your advisor.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Admin Access Tab */}
            <TabsContent value="admin">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-neutral-800">Admin Login</h2>
                    <p className="mt-2 text-neutral-500">Access admin features</p>
                  </div>

                  <Form {...adminLoginForm}>
                    <form onSubmit={adminLoginForm.handleSubmit(onAdminLoginSubmit)} className="space-y-4">
                      <FormField
                        control={adminLoginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your username" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={adminLoginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" placeholder="Enter your password" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary-600 mt-2"
                        disabled={adminLoginMutation.isPending}
                      >
                        {adminLoginMutation.isPending ? "Logging in..." : "Login"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-sm text-neutral-500">
              &copy; {new Date().getFullYear()} Northern Light Wealth Inc. All rights reserved.
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
