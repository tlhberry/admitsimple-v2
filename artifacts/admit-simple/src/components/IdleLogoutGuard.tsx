import { useIdleLogout } from "@/hooks/useIdleLogout";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export function IdleLogoutGuard() {
  const { logout, user } = useAuth();
  const { showWarning, stayLoggedIn } = useIdleLogout(() => {
    if (user) void logout();
  });

  if (!user) return null;

  return (
    <Dialog open={showWarning}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <DialogTitle className="text-lg">Session expiring soon</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            You've been inactive for a while. For HIPAA compliance, you'll be
            automatically logged out in <strong>2 minutes 30 seconds</strong> unless
            you continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-2 mt-2">
          <Button
            variant="outline"
            onClick={() => void logout()}
            className="flex-1"
          >
            Log out now
          </Button>
          <Button onClick={stayLoggedIn} className="flex-1">
            Stay logged in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
