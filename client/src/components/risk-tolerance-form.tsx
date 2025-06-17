import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { riskToleranceResponseSchema, RiskToleranceData } from "@shared/schema";

interface RiskToleranceFormProps {
  initialData?: any;
  isLoading?: boolean;
  onSubmit: (data: RiskToleranceData) => void;
  riskScore?: number;
  riskProfile?: string;
}

export default function RiskToleranceForm({ 
  initialData, 
  isLoading, 
  onSubmit,
  riskScore,
  riskProfile
}: RiskToleranceFormProps) {
  const [answeredQuestions, setAnsweredQuestions] = useState<number>(0);

  // Form setup
  const form = useForm<RiskToleranceData>({
    resolver: zodResolver(riskToleranceResponseSchema),
    defaultValues: initialData || {
      question1: "",
      question2: "",
      question3: "",
      question4: "",
      question5: "",
      question6: "",
      question7: "",
      question8: "",
      question9: "",
      question10: "",
      question11: "",
      question12: "",
      question13: "",
      question14: "",
      question15: "",
    },
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
    
    if (watchAllFields.question1) count++;
    if (watchAllFields.question2) count++;
    if (watchAllFields.question3) count++;
    if (watchAllFields.question4) count++;
    if (watchAllFields.question5) count++;
    if (watchAllFields.question6) count++;
    if (watchAllFields.question7) count++;
    if (watchAllFields.question8) count++;
    if (watchAllFields.question9) count++;
    if (watchAllFields.question10) count++;
    if (watchAllFields.question11) count++;
    if (watchAllFields.question12) count++;
    if (watchAllFields.question13) count++;
    if (watchAllFields.question14) count++;
    if (watchAllFields.question15) count++;
    
    setAnsweredQuestions(count);
  }, [form.watch()]);

  // Handle form submission
  const handleSubmit = (data: RiskToleranceData) => {
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
          {/* Question 1 */}
          <div className="px-6 py-5">
            <FormField
              control={form.control}
              name="question1"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium text-neutral-900">
                    1. When do you expect to begin withdrawing money from your investment account?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="1" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Less than 1 year
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="3" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          1 to 3 years
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="5" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          3 to 5 years
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="7" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          5 to 10 years
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="10" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          More than 10 years
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Question 2 */}
          <div className="px-6 py-5">
            <FormField
              control={form.control}
              name="question2"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium text-neutral-900">
                    2. Which of the following best describes your investment objectives?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="1" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Preservation of capital with minimal risk
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="3" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Income with moderate risk
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="7" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Growth with higher risk
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="10" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Maximum growth with significantly higher risk
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Question 3 */}
          <div className="px-6 py-5">
            <FormField
              control={form.control}
              name="question3"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium text-neutral-900">
                    3. If your investment portfolio decreased in value by 20% in one year, how would you react?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="1" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Sell all remaining investments and move to cash
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="3" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Sell some investments to reduce risk
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="7" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Hold your investments and wait for recovery
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="10" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Buy more investments at the lower price
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Question 4 */}
          <div className="px-6 py-5">
            <FormField
              control={form.control}
              name="question4"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium text-neutral-900">
                    4. How would you characterize your investment knowledge?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="1" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          None or minimal
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="3" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Basic understanding
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="7" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Good understanding
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="10" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Extensive knowledge
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Question 5 */}
          <div className="px-6 py-5">
            <FormField
              control={form.control}
              name="question5"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium text-neutral-900">
                    5. Which statement best describes your attitude toward investment risk?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="1" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          I avoid risk and prefer security
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="4" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          I accept some risk for potentially higher returns
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="7" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          I embrace moderate risk for moderate growth
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="10" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          I seek maximum returns and accept significant risk
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Question 6 */}
          <div className="px-6 py-5">
            <FormField
              control={form.control}
              name="question6"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium text-neutral-900">
                    6. What is the intent of your portfolio? Please select the most appropriate one.
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="0" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          To generate income for today
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="5" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          To generate income at a later date
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="10" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          To provide for my dependents (I do not anticipate using these funds)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="7" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          To fund a large purchase in the future
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Question 7 */}
          <div className="px-6 py-5">
            <FormField
              control={form.control}
              name="question7"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium text-neutral-900">
                    7. What would your ideal portfolio experience be? Please select the most appropriate one.
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="2" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          To ensure my portfolio remains secure
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="5" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          To see my portfolio grow and to avoid fluctuating returns
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="7" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          To balance growth and security, and to keep pace with inflation
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="10" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          To maximize the growth potential of my portfolio
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Question 8 */}
          <div className="px-6 py-5">
            <FormField
              control={form.control}
              name="question8"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium text-neutral-900">
                    8. How would you describe your investing experience?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="1" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          I'm a novice investor with little or no experience
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="4" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          I have some experience but still learning the basics
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="7" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          I have several years of investment experience
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="10" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          I have extensive investment experience across multiple asset classes
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Question 9 */}
          <div className="px-6 py-5">
            <FormField
              control={form.control}
              name="question9"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium text-neutral-900">
                    9. What percentage of your income do you currently save or invest?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="1" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Less than 5% of my income
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="4" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          5% to 10% of my income
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="7" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          10% to 20% of my income
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="10" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          More than 20% of my income
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Question 10 */}
          <div className="px-6 py-5">
            <FormField
              control={form.control}
              name="question10"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium text-neutral-900">
                    10. How important is liquidity to you?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="1" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Very important - I need immediate access to my investments
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="3" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Important - I may need to access a portion of my investments within a year
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="7" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Somewhat important - I have other sources of funds for most needs
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="10" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Not important - I have adequate cash reserves elsewhere
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Question 11 */}
          <div className="px-6 py-5">
            <FormField
              control={form.control}
              name="question11"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium text-neutral-900">
                    11. Which investment approach most appeals to you?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="1" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Conservative investments with guaranteed returns
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="4" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Mostly safe investments with some growth potential
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="7" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          A balanced mix of investments for moderate growth
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="10" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Aggressive growth investments, even if highly volatile
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Question 12 */}
          <div className="px-6 py-5">
            <FormField
              control={form.control}
              name="question12"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium text-neutral-900">
                    12. How do you react to financial news and market volatility?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="1" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          I get anxious and consider selling investments when I hear negative news
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="4" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          I pay attention to news but try not to overreact
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="7" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          I understand markets fluctuate and maintain my long-term strategy
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="10" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          I see market downturns as potential buying opportunities
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Question 13 */}
          <div className="px-6 py-5">
            <FormField
              control={form.control}
              name="question13"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium text-neutral-900">
                    13. How has your past investment experience shaped your risk tolerance?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="1" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Past losses have made me very cautious
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="4" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          I've had mixed experiences and prefer moderate risk
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="7" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          I've generally had positive experiences that encourage calculated risks
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="10" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          My experience has taught me that higher risk often leads to better returns
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Question 14 */}
          <div className="px-6 py-5">
            <FormField
              control={form.control}
              name="question14"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium text-neutral-900">
                    14. How stable is your current and future income?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="1" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Not stable - My income fluctuates significantly or is uncertain
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="4" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Somewhat stable - My income is generally reliable but not guaranteed
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="7" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Stable - I have a secure job/business with predictable income
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="10" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Very stable - I have multiple income sources and excellent job security
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Question 15 */}
          <div className="px-6 py-5">
            <FormField
              control={form.control}
              name="question15"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium text-neutral-900">
                    15. If you unexpectedly received $100,000, how would you invest it?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="1" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          In bank certificates of deposit or money market accounts
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="4" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Mostly in bonds with some dividend-paying stocks
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="7" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          In a diversified portfolio of stocks, bonds, and alternative investments
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="10" />
                        </FormControl>
                        <FormLabel className="font-medium text-neutral-700">
                          Primarily in growth stocks, emerging markets, or speculative investments
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Form Actions */}
          <div className="px-6 py-5 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            {/* Risk Score Result */}
            {riskScore !== undefined && riskProfile && (
              <div className="bg-neutral-100 rounded-md px-4 py-3">
                <p className="text-sm text-neutral-600">Your risk tolerance score:</p>
                <p className="text-xl font-semibold text-primary">{riskScore}</p>
                <p className="text-sm font-medium">{riskProfile}</p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
              <Button
                type="button"
                variant="outline"
                className="order-last sm:order-first"
              >
                Save & Exit
              </Button>
              <Button
                type="submit"
                disabled={isLoading || answeredQuestions < 15}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : riskScore !== undefined ? (
                  "Update Risk Profile"
                ) : (
                  "Calculate Risk Profile"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </Card>
  );
}
