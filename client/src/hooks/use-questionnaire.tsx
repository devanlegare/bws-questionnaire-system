import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  SectionType, 
  RiskToleranceData, 
  ClientUpdateData, 
  InvestmentPolicyData 
} from "@shared/schema";

type QuestionnaireData = RiskToleranceData | ClientUpdateData | InvestmentPolicyData;

interface SubmitOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useQuestionnaire(section: SectionType) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch questionnaire data for the current section
  const { 
    data: questionnaire, 
    isLoading,
    error,
    refetch 
  } = useQuery({
    queryKey: [`/api/questionnaire/${section}`],
    enabled: !!section,
  });

  // Mutation for submitting questionnaire data
  const submitMutation = useMutation({
    mutationFn: async ({ data }: { data: QuestionnaireData }) => {
      const res = await apiRequest("POST", `/api/questionnaire/${section}`, {
        data,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/questionnaire/${section}`] });
    },
  });

  // Submit the questionnaire
  const submitQuestionnaire = async (
    data: QuestionnaireData,
    options?: SubmitOptions
  ) => {
    try {
      setIsSubmitting(true);
      await submitMutation.mutateAsync({ data });
      if (options?.onSuccess) {
        options.onSuccess();
      }
    } catch (error) {
      if (options?.onError && error instanceof Error) {
        options.onError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refetch questionnaire when section changes
  useEffect(() => {
    if (section) {
      refetch();
    }
  }, [section, refetch]);

  return {
    questionnaire,
    isLoading: isLoading || isSubmitting,
    error,
    submitQuestionnaire,
  };
}
