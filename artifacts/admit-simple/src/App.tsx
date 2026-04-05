import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { TwilioVoiceProvider } from "@/contexts/TwilioVoiceContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import InquiriesList from "@/pages/inquiries/index";
import InquiryDetail from "@/pages/inquiries/detail";
import Pipeline from "@/pages/pipeline/index";
import AiInsights from "@/pages/ai-insights/index";
import Patients from "@/pages/patients/index";
import PatientDetail from "@/pages/patients/detail";
import Referrals from "@/pages/referrals/index";
import Analytics from "@/pages/analytics/index";
import Reports from "@/pages/reports/index";
import Settings from "@/pages/settings/index";
import ReferralAccounts from "@/pages/referral-accounts/index";
import BDActivityFeed from "@/pages/referral-accounts/BDActivityFeed";
import BDReports from "@/pages/bd-reports/index";
import BedBoard from "@/pages/bed-board/index";
import ActiveCalls from "@/pages/calls/ActiveCalls";
import NotFound from "@/pages/not-found";
import ChatbotWidget from "@/pages/chatbot-widget";
import ChatbotDemo from "@/pages/chatbot-demo";
import LiveChat from "@/pages/live-chat";

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
      <Route path="/patients/:id" component={PatientDetail} />
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/referrals" component={Referrals} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/reports" component={Reports} />
      <Route path="/ai-insights" component={AiInsights} />
      <Route path="/settings" component={Settings} />
      <Route path="/referral-accounts" component={ReferralAccounts} />
      <Route path="/bd-activity-feed" component={BDActivityFeed} />
      <Route path="/bd-reports" component={BDReports} />
      <Route path="/bed-board" component={BedBoard} />
      <Route path="/calls/active" component={ActiveCalls} />
      <Route path="/live-chat/:sessionId" component={LiveChat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            {/* Public routes — no auth required */}
            <Route path="/chatbot-widget" component={ChatbotWidget} />
            <Route path="/chatbot-demo" component={ChatbotDemo} />
            {/* All other routes require authentication */}
            <Route>
              <ErrorBoundary>
                <AuthProvider>
                  <TwilioVoiceProvider>
                    <Router />
                  </TwilioVoiceProvider>
                </AuthProvider>
              </ErrorBoundary>
            </Route>
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
