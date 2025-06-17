import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formats a number as a currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Formats a number as a percentage
export function formatPercentage(value: number): string {
  return `${value}%`;
}

// Truncates a string to a maximum length and adds ellipsis if truncated
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

// Validates an email address format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validates a phone number format
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
  return phoneRegex.test(phone);
}

// Formats a date to a readable string
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

// Calculates age from date of birth
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Function to escape CSV values with quotes if necessary
function escapeCSV(value: string): string {
  // If value contains comma, newline or quotes, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Function to convert questionnaire data to CSV format
export function convertQuestionnaireToCSV(
  questionnaireData: any,
  formattedAnswers: Array<{
    question: string;
    answer: string;
    value?: number;
  }>,
  clientName: string,
  clientNumber: string,
  section: string,
  submittedDate?: string
): string {
  // Start with the CSV header and metadata
  let csv = '';
  
  // Add metadata as comments in CSV
  const formatDate = submittedDate || new Date().toLocaleDateString();
  csv += `# Client: ${clientName} (${clientNumber})\n`;
  csv += `# Questionnaire: ${section === 'riskTolerance' ? 'Risk Tolerance Questionnaire' : 
          section === 'clientUpdate' ? 'Client Update Form' : 
          section === 'investmentPolicy' ? 'Investment Policy Statement' : section}\n`;
  csv += `# Date: ${formatDate}\n`;
  if (section === 'riskTolerance' && questionnaireData.score) {
    csv += `# Total Score: ${questionnaireData.score}\n`;
    csv += `# Risk Profile: ${questionnaireData.riskProfile || 'N/A'}\n`;
  }
  csv += '#\n';
  
  // Add the actual CSV header - removed Score column as requested
  csv += 'Question,Answer\n';
  
  // Create the CSV content
  formattedAnswers.forEach(item => {
    const questionText = escapeCSV(item.question);
    const answerText = escapeCSV(item.answer);
    
    // Removed score value from the output as requested
    csv += `${questionText},${answerText}\n`;
  });
  
  return csv;
}

// Function to download content as a file
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
