import { 
  useParseIntakeDocument,
  useGetAiInsights,
  useGetAiPipelineOptimization,
  useGetAiReferralInsights,
  useSummarizeInquiry,
  useGenerateAiReport,
  useAiCustomQuery
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function useAIFeatures() {
  const { toast } = useToast();

  const parseIntake = useParseIntakeDocument({
    mutation: {
      onSuccess: (data) => toast({ title: "AI Analysis Complete", description: `Extracted ${data.fieldsExtracted} fields.` }),
      onError: () => toast({ title: "AI Parsing Failed", variant: "destructive" })
    }
  });

  const getInsights = useGetAiInsights();
  const getPipelineOptimization = useGetAiPipelineOptimization();
  const getReferralInsights = useGetAiReferralInsights();
  
  const summarizeInquiry = useSummarizeInquiry({
    mutation: {
      onSuccess: () => toast({ title: "Summary generated" }),
      onError: () => toast({ title: "Failed to generate summary", variant: "destructive" })
    }
  });

  const generateReport = useGenerateAiReport();
  const customQuery = useAiCustomQuery();

  return { 
    parseIntake, 
    getInsights, 
    getPipelineOptimization, 
    getReferralInsights, 
    summarizeInquiry,
    generateReport,
    customQuery
  };
}
