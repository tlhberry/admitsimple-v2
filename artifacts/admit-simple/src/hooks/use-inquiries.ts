import { 
  useListInquiries, 
  useGetInquiry, 
  useCreateInquiry, 
  useUpdateInquiry, 
  useDeleteInquiry,
  useConvertInquiryToPatient,
  getListInquiriesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useInquiriesMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createInquiry = useCreateInquiry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/inquiries'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
        toast({ title: "Inquiry created successfully" });
      },
      onError: (err: any) => toast({ title: "Failed to create inquiry", description: err.message, variant: "destructive" })
    }
  });

  const updateInquiry = useUpdateInquiry({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['/api/inquiries'] });
        queryClient.invalidateQueries({ queryKey: ['/api/inquiries', data.id] });
        queryClient.invalidateQueries({ queryKey: ['/api/pipeline/inquiries'] });
        toast({ title: "Inquiry updated successfully" });
      },
      onError: (err: any) => toast({ title: "Failed to update inquiry", description: err.message, variant: "destructive" })
    }
  });

  const deleteInquiry = useDeleteInquiry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/inquiries'] });
        toast({ title: "Inquiry deleted" });
      }
    }
  });

  const convertToPatient = useConvertInquiryToPatient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/inquiries'] });
        queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
        toast({ title: "Successfully converted to patient!" });
      }
    }
  });

  return { createInquiry, updateInquiry, deleteInquiry, convertToPatient };
}
