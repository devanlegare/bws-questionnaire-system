import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage, 
  FormDescription
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { investmentPolicySchema, InvestmentPolicyData } from "@shared/schema";

interface InvestmentPolicyFormProps {
  initialData?: any;
  isLoading?: boolean;
  onSubmit: (data: InvestmentPolicyData) => void;
}

export default function InvestmentPolicyForm({
  initialData,
  isLoading,
  onSubmit
}: InvestmentPolicyFormProps) {
  const [totalAllocation, setTotalAllocation] = useState<number>(100);
  const [allocationError, setAllocationError] = useState<boolean>(false);

  // Form setup
  const form = useForm<InvestmentPolicyData>({
    resolver: zodResolver(investmentPolicySchema),
    defaultValues: initialData || {
      primaryObjective: "growth",
      timeHorizon: "long",
      riskFactors: ["liquidity", "taxConsiderations"],
      equities: "60",
      fixedIncome: "30",
      alternatives: "5",
      cash: "5",
      reviewFrequency: "quarterly",
      rebalancingStrategy: "threshold",
      additionalGuidelines: "",
    },
  });

  // Update form values when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  // Calculate total allocation whenever allocation fields change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "equities" || name === "fixedIncome" || name === "alternatives" || name === "cash") {
        const equities = parseInt(value.equities || "0") || 0;
        const fixedIncome = parseInt(value.fixedIncome || "0") || 0;
        const alternatives = parseInt(value.alternatives || "0") || 0;
        const cash = parseInt(value.cash || "0") || 0;
        
        const total = equities + fixedIncome + alternatives + cash;
        setTotalAllocation(total);
        setAllocationError(total !== 100);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Handle form submission
  const handleSubmit = (data: InvestmentPolicyData) => {
    // Check if allocation adds up to 100%
    const equities = parseInt(data.equities) || 0;
    const fixedIncome = parseInt(data.fixedIncome) || 0;
    const alternatives = parseInt(data.alternatives) || 0;
    const cash = parseInt(data.cash) || 0;
    
    const total = equities + fixedIncome + alternatives + cash;
    
    if (total !== 100) {
      setAllocationError(true);
      return;
    }
    
    onSubmit(data);
  };

  // Risk factors options
  const riskFactorOptions = [
    { id: "liquidity", label: "Liquidity needs", description: "Regular withdrawals or access to capital needed" },
    { id: "taxConsiderations", label: "Tax considerations", description: "Tax-efficient investment strategies important" },
    { id: "legalConstraints", label: "Legal or regulatory constraints", description: "Specific limitations on investment activities" }
  ];

  return (
    <Card className="shadow-sm">
      <div className="px-6 py-5 bg-neutral-50 border-b">
        <h3 className="text-lg font-medium leading-6 text-neutral-900">Investment Policy Statement</h3>
        <p className="mt-1 text-sm text-neutral-500">Review and confirm your investment guidelines</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="divide-y divide-neutral-200">
          {/* Investment Objectives */}
          <div className="px-6 py-5">
            <h4 className="text-base font-medium text-neutral-800 mb-4">Investment Objectives</h4>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="primaryObjective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Investment Objective</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an objective" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="income">Income Generation</SelectItem>
                        <SelectItem value="growth">Long-term Growth</SelectItem>
                        <SelectItem value="preservation">Capital Preservation</SelectItem>
                        <SelectItem value="balanced">Balanced Growth & Income</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeHorizon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investment Time Horizon</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time horizon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="short">Short-term (0-3 years)</SelectItem>
                        <SelectItem value="medium">Medium-term (3-7 years)</SelectItem>
                        <SelectItem value="long">Long-term (7+ years)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="riskFactors"
                render={() => (
                  <FormItem>
                    <div className="mb-2">
                      <FormLabel>Investor Risk Factors</FormLabel>
                    </div>
                    {riskFactorOptions.map((option) => (
                      <FormField
                        key={option.id}
                        control={form.control}
                        name="riskFactors"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={option.id}
                              className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-2"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(option.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    return checked
                                      ? field.onChange([...currentValue, option.id])
                                      : field.onChange(
                                          currentValue.filter(
                                            (value) => value !== option.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-medium text-neutral-700">
                                  {option.label}
                                </FormLabel>
                                <FormDescription className="text-neutral-500">
                                  {option.description}
                                </FormDescription>
                              </div>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Asset Allocation */}
          <div className="px-6 py-5">
            <h4 className="text-base font-medium text-neutral-800 mb-4">Asset Allocation Strategy</h4>
            <p className="text-sm text-neutral-600 mb-6">
              Based on your risk profile, below is the recommended asset allocation. 
              You can adjust these percentages if needed.
            </p>
            
            <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 gap-x-6 mb-6">
              <FormField
                control={form.control}
                name="equities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equities</FormLabel>
                    <FormControl>
                      <div className="flex rounded-md shadow-sm">
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="100"
                          className="rounded-r-none"
                        />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-neutral-300 bg-neutral-50 text-neutral-500 text-sm">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fixedIncome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fixed Income</FormLabel>
                    <FormControl>
                      <div className="flex rounded-md shadow-sm">
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="100"
                          className="rounded-r-none"
                        />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-neutral-300 bg-neutral-50 text-neutral-500 text-sm">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alternatives"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alternative Investments</FormLabel>
                    <FormControl>
                      <div className="flex rounded-md shadow-sm">
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="100"
                          className="rounded-r-none"
                        />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-neutral-300 bg-neutral-50 text-neutral-500 text-sm">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cash & Equivalents</FormLabel>
                    <FormControl>
                      <div className="flex rounded-md shadow-sm">
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="100"
                          className="rounded-r-none"
                        />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-neutral-300 bg-neutral-50 text-neutral-500 text-sm">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="mt-4">
              {allocationError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Total allocation must equal 100%. Current total: {totalAllocation}%
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="bg-neutral-50 p-4 rounded-md">
                  <div className="flex items-center">
                    <p className="text-sm text-neutral-500">
                      Total allocation: {totalAllocation}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Review and Monitoring */}
          <div className="px-6 py-5">
            <h4 className="text-base font-medium text-neutral-800 mb-4">Review and Monitoring</h4>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="reviewFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Review Frequency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="semiannually">Semi-annually</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rebalancingStrategy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rebalancing Strategy</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select strategy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="calendar">Calendar-based (scheduled)</SelectItem>
                        <SelectItem value="threshold">Threshold-based (when allocations drift)</SelectItem>
                        <SelectItem value="hybrid">Hybrid approach</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additionalGuidelines"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Guidelines or Restrictions</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter any additional investment guidelines or restrictions"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-6 py-5 flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || allocationError}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Confirm Investment Policy"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
