import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login-page";
import AdminPage from "@/pages/admin-page";
import QuestionnairePage from "@/pages/questionnaire-page";
import { useEffect, useState } from "react";

function Router() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for token in URL params for direct questionnaire access
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      // Remove token from URL to avoid accidental sharing
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/questionnaire/:section">
        {(params) => <QuestionnairePage section={params.section} initialToken={token} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
