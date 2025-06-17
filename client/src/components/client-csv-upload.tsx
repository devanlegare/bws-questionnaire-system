import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ClientCSVRow, convertCSVToClients, getClientCSVTemplate } from "@/lib/client-csv-converter";
import { InsertClient } from "@shared/schema";

interface ClientCSVUploadProps {
  onUpload: (data: InsertClient[]) => void;
  isLoading?: boolean;
}

export default function ClientCSVUpload({
  onUpload,
  isLoading = false,
}: ClientCSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const parseCSV = (text: string): ClientCSVRow[] => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(header => 
      header.trim().replace(/^"|"$/g, '')
    );
    
    const results: ClientCSVRow[] = [];
    
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
      const obj: ClientCSVRow = {
        client_number: '',
        first_name: '',
      };
      
      headers.forEach((header, index) => {
        obj[header] = cleanRow[index] || '';
      });
      
      // Validate required fields and client number format
      if (obj.client_number && obj.first_name) {
        // Check if client number is exactly 7 digits
        if (obj.client_number.length === 7 && /^\d+$/.test(obj.client_number)) {
          results.push(obj);
        } else {
          console.warn('Skipping row due to invalid client number format (must be exactly 7 digits):', obj);
        }
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
      
      const csvRows = parseCSV(text);
      
      if (csvRows.length === 0) {
        toast({
          title: "Error",
          description: "No valid client data found in the CSV file. Make sure client_number is 7 digits and includes the first_name column.",
          variant: "destructive"
        });
        return;
      }
      
      // Check for duplicate client numbers within the CSV file
      const clientNumbers = csvRows.map(row => row.client_number);
      const duplicateClientNumbers = clientNumbers.filter(
        (number, index) => clientNumbers.indexOf(number) !== index
      );
      
      if (duplicateClientNumbers.length > 0) {
        const uniqueDuplicates = [...new Set(duplicateClientNumbers)];
        toast({
          title: "Error",
          description: `Duplicate client numbers found in CSV: ${uniqueDuplicates.join(', ')}. Please remove duplicates before uploading.`,
          variant: "destructive"
        });
        return;
      }
      
      // Convert to client objects
      const clients = convertCSVToClients(csvRows);
      
      // Pass to parent component
      onUpload(clients);
      
      toast({
        title: "CSV Parsed",
        description: `Successfully parsed ${clients.length} client records, attempting to import...`,
      });
      
      // Reset form
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('client-csv-file') as HTMLInputElement;
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
    const template = getClientCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'client-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Import Clients</CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload a CSV file with client information. Required columns: client_number (7 digits) and first_name
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="client-csv-file" className="text-sm font-medium leading-none">
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
                id="client-csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: client_number (7 digits), first_name
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={!file || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Clients
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}