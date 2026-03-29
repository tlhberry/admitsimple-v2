import { 
  useCreatePatient,
  useUpdatePatient,
  useDeletePatient
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function usePatientsMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPatient = useCreatePatient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
        toast({ title: "Patient admitted successfully" });
      }
    }
  });

  const updatePatient = useUpdatePatient({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
        queryClient.invalidateQueries({ queryKey: ['/api/patients', data.id] });
        toast({ title: "Patient updated successfully" });
      }
    }
  });

  const deletePatient = useDeletePatient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
        toast({ title: "Patient deleted" });
      }
    }
  });

  return { createPatient, updatePatient, deletePatient };
}
