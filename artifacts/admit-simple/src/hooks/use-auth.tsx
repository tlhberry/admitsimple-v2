import { createContext, useContext, ReactNode, useEffect } from "react";
import { useGetMe, useLogin, useLogout, UserSession } from "@workspace/api-client-react";
import { useLocation, useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: ReturnType<typeof useLogin>["mutateAsync"];
  logout: ReturnType<typeof useLogout>["mutateAsync"];
  isLoggingIn: boolean;
  isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isLoginPage] = useRoute("/login");
  const isPublicPage = isLoginPage || location.startsWith("/forgot-password") || location.startsWith("/reset-password");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading, isError, error: authError } = useGetMe({
    query: {
      retry: (failureCount, error: any) => {
        // Never retry on 401 (not authenticated) — retry once on network errors
        if (error?.status === 401) return false;
        return failureCount < 1;
      },
      retryDelay: 800,
      staleTime: 1000 * 60 * 5, // 5 mins
      refetchOnWindowFocus: false, // prevents Sheet/modal close events from triggering auth refetch on mobile
    }
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(["/api/auth/me"], data);
        setLocation("/");
        toast({ title: "Welcome back!", description: `Logged in as ${data.name}` });
      },
      onError: () => {
        toast({ title: "Login failed", description: "Invalid username or password", variant: "destructive" });
      }
    }
  });

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.setQueryData(["/api/auth/me"], null);
        queryClient.clear();
        setLocation("/login");
        toast({ title: "Logged out successfully" });
      }
    }
  });

  // Redirect to login only on a confirmed 401 (not authenticated), not transient network errors
  useEffect(() => {
    if (!isLoading && isError && !isPublicPage) {
      const is401 = (authError as any)?.status === 401;
      if (is401) setLocation("/login");
    }
  }, [isLoading, isError, authError, isPublicPage, setLocation]);

  return (
    <AuthContext.Provider 
      value={{ 
        user: user || null, 
        isLoading, 
        login: loginMutation.mutateAsync, 
        logout: logoutMutation.mutateAsync,
        isLoggingIn: loginMutation.isPending,
        isLoggingOut: logoutMutation.isPending
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
