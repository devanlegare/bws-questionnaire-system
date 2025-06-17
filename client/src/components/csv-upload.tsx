import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CSVRow } from "@/lib/csv-converter";

interface CSVUploadProps {
  onUpload: (data: CSVRow[]) => void;
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export default function CSVUpload({
  onUpload,
  isLoading = false,
  title = "Upload CSV",
  description = "Upload a CSV file with questions and answers"
}: CSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(header => 
      header.trim().replace(/^"|"$/g, '')
    );
    
    const results: CSVRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      // Handle commas within quoted fields
      const row: string[] = [];
      let inQuotes = false;
      let currentValue = '';
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(currentValue);
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      // Add the last value
      row.push(currentValue);
      
      // Clean up any quotation marks
      const cleanRow = row.map(value => value.trim().replace(/^"|"$/g, ''));
      
      // Create object from headers and row values
      const obj: CSVRow = {
        question_number: '',
        question_text: '',
      };
      
      headers.forEach((header, index) => {
        obj[header] = cleanRow[index] || '';
      });
      
      // Ensure required CSVRow properties are present
      if (obj.question_number && obj.question_text) {
        results.push(obj);
      } else {
        console.warn('Skipping row due to missing required fields:', obj);
      }
    }
    
    return results;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }
    
    try {
      let text = await file.text();
      
      // Fix smart quotes and apostrophes before parsing
      text = text
        .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes/apostrophes
        .replace(/[\u201C\u201D]/g, '"'); // Replace smart double quotes
      
      const data = parseCSV(text);
      
      if (data.length === 0) {
        toast({
          title: "Error",
          description: "No data found in the CSV file",
          variant: "destructive"
        });
        return;
      }
      
      onUpload(data);
      
      toast({
        title: "Success",
        description: `Successfully parsed ${data.length} questions`,
      });
      
      // Reset form
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('csv-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error("CSV parsing error:", error);
      toast({
        title: "Error",
        description: "Failed to parse the CSV file. Please check the format.",
        variant: "destructive"
      });
    }
  };

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/example-risk-tolerance-template.csv';
    link.download = 'risk-tolerance-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="csv-file" className="text-sm font-medium leading-none">
                  CSV File
                </label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={downloadTemplate}
                  className="text-xs"
                >
                  Download Template
                </Button>
              </div>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: question_number, question_text, answer1_text, answer1_value, etc.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={!file || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload CSV
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}