import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { riskToleranceResponseSchema, RiskToleranceData, QuestionTemplate } from "@shared/schema";

interface RiskToleranceFormProps {
  initialData?: any;
  isLoading?: boolean;
  onSubmit: (data: RiskToleranceData) => void;
  riskScore?: number;
  riskProfile?: string;
}

export default function DynamicRiskToleranceForm({ 
  initialData, 
  isLoading, 
  onSubmit,
  riskScore,
  riskProfile
}: RiskToleranceFormProps) {
  const [answeredQuestions, setAnsweredQuestions] = useState<number>(0);
  const [template, setTemplate] = useState<QuestionTemplate | null>(null);
  
  // Fetch the question template from the server
  const templateQuery = useQuery<QuestionTemplate>({
    queryKey: ["/api/question-templates/riskTolerance"],
  });

  // Handle template loading success
  useEffect(() => {
    if (templateQuery.data) {
      setTemplate(templateQuery.data);
      console.log("Loaded template:", templateQuery.data.title, "with", templateQuery.data.questions.length, "questions");
    }
  }, [templateQuery.data]);

  // Handle template loading error
  useEffect(() => {
    if (templateQuery.error) {
      console.error("Failed to load risk tolerance template:", templateQuery.error);
    }
  }, [templateQuery.error]);

  // Generate default values for the form
  const generateDefaultValues = () => {
    if (initialData) return initialData;
    
    const defaults: Record<string, string> = {};
    
    // Create empty defaults for 15 questions
    for (let i = 1; i <= 15; i++) {
      defaults[`question${i}`] = "";
    }
    
    return defaults;
  };

  // Form setup
  const form = useForm<RiskToleranceData>({
    resolver: zodResolver(riskToleranceResponseSchema),
    defaultValues: generateDefaultValues(),
  });

  // Update form values when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  // Count answered questions
  useEffect(() => {
    const watchAllFields = form.watch();
    let count = 0;
    
    // Count how many questions have answers
    for (let i = 1; i <= 15; i++) {
      if (watchAllFields[`question${i}`]) count++;
    }
    
    setAnsweredQuestions(count);
  }, [form.watch()]);

  // Handle form submission
  const handleSubmit = (data: RiskToleranceData) => {
    console.log("Submitting risk tolerance data:", data);
    onSubmit(data);
  };

  return (
    <Card className="shadow-sm">
      <div className="px-6 py-5 bg-neutral-50 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium leading-6 text-neutral-900">Risk Tolerance Assessment</h3>
            <p className="mt-1 text-sm text-neutral-500">Please answer all questions to determine your investment risk profile</p>
          </div>
          <div className="rounded-full bg-neutral-200 px-3 py-1">
            <span className="text-sm font-medium text-neutral-800">
              {answeredQuestions} of 15 complete
            </span>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="divide-y divide-neutral-200">
          {templateQuery.isLoading ? (
            <div className="p-8 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
              <span className="ml-2">Loading questions...</span>
            </div>
          ) : templateQuery.error ? (
            <div className="p-8 text-center text-red-500">
              <p>Error loading questions. Please try again later.</p>
            </div>
          ) : template && template.questions ? (
            // Render questions dynamically from the template
            template.questions.map((question, index) => (
              <div key={question.id} className="px-6 py-5">
                <FormField
                  control={form.control}
                  name={`question${index + 1}`}
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-medium text-neutral-900">
                        {index + 1}. {question.text}
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="space-y-3"
                        >
                          {question.options.map(option => (
                            <FormItem key={option.id} className="flex items-start space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={option.id} />
                              </FormControl>
                              <FormLabel className="font-medium text-neutral-700">
                                {option.text}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-orange-500">
              <p>No questions found in the template. Please contact an administrator.</p>
            </div>
          )}

          {/* Completed questionnaire result */}
          {riskProfile && (
            <div className="px-6 py-5 bg-green-50 border-t">
              <div className="flex flex-col md:flex-row items-start justify-between">
                <div>
                  <h4 className="text-base font-semibold text-green-800">Your Risk Profile: {riskProfile}</h4>
                  <p className="mt-1 text-sm text-green-700">
                    Based on your answers, your risk tolerance assessment is complete.
                  </p>
                </div>
                {riskScore !== undefined && (
                  <div className="mt-2 md:mt-0">
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Score: {riskScore}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form submission */}
          <div className="px-6 py-5 bg-neutral-50 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-500">
                {answeredQuestions} of {template?.questions.length || 15} questions answered
              </span>
              <Button 
                type="submit" 
                disabled={isLoading || templateQuery.isLoading || answeredQuestions < (template?.questions.length || 15)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Assessment'
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </Card>
  );
}