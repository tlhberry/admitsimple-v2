import { createContext, useContext, ReactNode, useEffect } from "react";
import { useGetMe, useLogin, useLogout, UserSession } from "@workspace/api-client-react";
import { useLocation } from "wouter";
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
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      retry: false, // Don't retry on 401
      staleTime: 1000 * 60 * 5, // 5 mins
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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && isError && window.location.pathname !== "/login") {
      setLocation("/login");
    }
  }, [isLoading, isError, setLocation]);

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
