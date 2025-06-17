import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Info, Download, FileDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { convertQuestionnaireToCSV, downloadCSV } from "@/lib/utils";

interface QuestionnaireDetailsProps {
  questionnaireId: number;
  section: string;
  data: any;
}

export default function QuestionnaireDetails({
  questionnaireId,
  section,
  data
}: QuestionnaireDetailsProps) {
  const [formattedAnswers, setFormattedAnswers] = useState<Array<{
    question: string;
    answer: string;
    value?: number;
    questionId?: string;
  }>>([]);

  // For risk tolerance, fetch the template to get question details
  const templateQuery = useQuery({
    queryKey: [`/api/question-templates/${section}`],
    enabled: section === "riskTolerance" && !!data,
  }) as { data: any, isLoading: boolean, error: Error | null };

  // Process the questionnaire data based on section type
  useEffect(() => {
    if (!data) return;

    if (section === "riskTolerance") {
      // For risk tolerance, we need to match question IDs with the template
      if (templateQuery.data) {
        const template = templateQuery.data;
        const answers: Array<{ question: string; answer: string; value: number; questionId: string }> = [];
        
        // Process risk tolerance answers
        if (data && typeof data === "object") {
          // Sort the keys if they are numeric to present questions in the correct order
          const sortedKeys = Object.keys(data).sort((a, b) => {
            // If keys are question_1, question_2, etc. sort numerically
            if (a.startsWith('question_') && b.startsWith('question_')) {
              return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
            }
            return a.localeCompare(b);
          });
          
          console.log("Processing questionnaire data with keys:", sortedKeys);
          
          sortedKeys.forEach(key => {
            // Skip metadata fields that aren't actual questions
            if (key === 'completed' || 
                key === 'version' || 
                key === 'score' || 
                key === 'riskProfile') {
              return;
            }
            
            // Find the matching question in the template
            const question = template.questions.find((q: any) => q.id === key);
            if (question) {
              // Find the selected option to get the text
              const selectedOption = question.options.find(
                (opt: any) => opt.id === data[key]
              );
              
              if (selectedOption) {
                // Keep the question ID, but use the answer text from the template
                answers.push({
                  question: key, // Keep as question1, question2, etc.
                  answer: selectedOption.text, // Get the answer text from the template
                  value: selectedOption.value || 0,
                  questionId: key
                });
              } else {
                // Fallback if we can't find the selected option
                answers.push({
                  question: key,
                  answer: data[key],
                  value: 0,
                  questionId: key
                });
              }
            } else {
              // If no matching question found, just use the raw values
              answers.push({
                question: key,
                answer: data[key],
                value: 0,
                questionId: key
              });
            }
          });
        }
        
        setFormattedAnswers(answers);
      } else if (!templateQuery.isLoading) {
        // If template isn't available, just display raw key/value pairs
        const answers = Object.entries(data).map(([key, value]) => ({
          question: key,
          answer: value as string,
          value: 0,
          questionId: key
        }));
        setFormattedAnswers(answers);
      }
    } else if (section === "clientUpdate") {
      // For client update, data is a structured form
      const answers = Object.entries(data).map(([key, value]) => {
        let formattedQuestion = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase());
        
        let formattedAnswer = value as string;
        
        // Format boolean values
        if (typeof value === 'boolean') {
          formattedAnswer = value ? 'Yes' : 'No';
        }
        
        // Format date values
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
          try {
            const date = new Date(value);
            formattedAnswer = date.toLocaleDateString();
          } catch (e) {
            // If date parsing fails, use the original value
          }
        }
        
        return {
          question: formattedQuestion,
          answer: formattedAnswer,
          questionId: key
        };
      });
      setFormattedAnswers(answers);
    } else if (section === "investmentPolicy") {
      // For investment policy, data is a structured form
      const answers = Object.entries(data).map(([key, value]) => {
        let formattedQuestion = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase());
        
        let formattedAnswer = value as string;
        
        // Format percentage values
        if (key.toLowerCase().includes('percent') || key.toLowerCase().includes('allocation')) {
          const numValue = parseFloat(value as string);
          if (!isNaN(numValue)) {
            formattedAnswer = `${numValue}%`;
          }
        }
        
        return {
          question: formattedQuestion,
          answer: formattedAnswer,
          questionId: key
        };
      });
      setFormattedAnswers(answers);
    }
  }, [data, section, templateQuery.data, templateQuery.isLoading]);

  if (!data) {
    return <div className="text-center py-4">No data available for this questionnaire.</div>;
  }

  if (section === "riskTolerance" && templateQuery.isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading question details...</span>
      </div>
    );
  }

  // Function to handle CSV download
  const handleDownloadCSV = () => {
    if (formattedAnswers.length === 0) return;
    
    const sectionNames = {
      riskTolerance: "Risk_Tolerance",
      clientUpdate: "Client_Update",
      investmentPolicy: "Investment_Policy"
    };
    
    const sectionName = sectionNames[section as keyof typeof sectionNames] || section;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${sectionName}_Responses_${questionnaireId}_${timestamp}.csv`;
    
    // Use data from the formatted answers we've already processed
    // This ensures we get the proper question texts and answer values
    const clientName = data.clientName || "Client";
    const clientNumber = data.clientNumber || "Unknown";
    
    const csvContent = convertQuestionnaireToCSV(
      data,
      formattedAnswers,
      clientName,
      clientNumber,
      section
    );
    
    downloadCSV(csvContent, filename);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>
            {section === "riskTolerance" && "Risk Tolerance Responses"}
            {section === "clientUpdate" && "Client Information Update"}
            {section === "investmentPolicy" && "Investment Policy Responses"}
          </span>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
            onClick={handleDownloadCSV}
          >
            <FileDown className="h-4 w-4" />
            <span>Download CSV</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {formattedAnswers.map((item, index) => (
            <div key={index} className="border-b pb-3 mb-3 last:border-0">
              <div className="font-medium text-neutral-800 flex items-center">
                {item.question}
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="ml-2 cursor-help">
                        <Info className="h-4 w-4 text-neutral-400" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Question ID: {item.questionId}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="text-neutral-600 mt-1 flex items-center justify-between">
                <div className="max-w-[80%]">{item.answer}</div>
                {item.value !== undefined && (
                  <Badge variant="outline" className="ml-2">{item.value} points</Badge>
                )}
              </div>
            </div>
          ))}

          {formattedAnswers.length === 0 && (
            <div className="text-center py-4 text-neutral-500">
              No detailed responses available for this submission.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}