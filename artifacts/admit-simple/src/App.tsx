import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import InquiriesList from "@/pages/inquiries/index";
import InquiryDetail from "@/pages/inquiries/detail";
import Pipeline from "@/pages/pipeline/index";
import AiInsights from "@/pages/ai-insights/index";
import Patients from "@/pages/patients/index";
import Referrals from "@/pages/referrals/index";
import Analytics from "@/pages/analytics/index";
import Reports from "@/pages/reports/index";
import Settings from "@/pages/settings/index";
import ReferralAccounts from "@/pages/referral-accounts/index";
import BDActivityFeed from "@/pages/referral-accounts/BDActivityFeed";
import BDReports from "@/pages/bd-reports/index";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 1000 * 60 * 2,
    }
  }
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/inquiries" component={InquiriesList} />
      <Route path="/inquiries/:id" component={InquiryDetail} />
      <Route path="/patients" component={Patients} />
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/referrals" component={Referrals} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/reports" component={Reports} />
      <Route path="/ai-insights" component={AiInsights} />
      <Route path="/settings" component={Settings} />
      <Route path="/referral-accounts" component={ReferralAccounts} />
      <Route path="/bd-activity-feed" component={BDActivityFeed} />
      <Route path="/bd-reports" component={BDReports} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
