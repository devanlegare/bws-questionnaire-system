import { QuestionTemplate, AnswerOption, Question } from "@shared/schema";

export interface CSVRow {
  question_number: string;
  question_text: string;
  [key: string]: string;
}

// Function to normalize text and fix encoding issues - only handle smart quotes
function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes/apostrophes
    .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
    .replace(/\r\n/g, '\n'); // Normalize line endings
}

export function convertCSVToQuestionTemplate(
  csvData: CSVRow[],
  section: string = "riskTolerance"
): QuestionTemplate {
  const questions: Question[] = csvData.map((row) => {
    // Extract answer options from the row
    const options: AnswerOption[] = [];
    
    // Look for answer1_text, answer1_value, answer2_text, answer2_value, etc.
    for (let i = 1; i <= 5; i++) {
      const textKey = `answer${i}_text`;
      const valueKey = `answer${i}_value`;
      
      if (row[textKey] && row[valueKey]) {
        options.push({
          id: `answer-${row.question_number}-${i}`,
          text: normalizeText(row[textKey]),
          value: parseInt(row[valueKey], 10),
        });
      }
    }
    
    return {
      id: row.question_number,
      text: normalizeText(row.question_text),
      options,
    };
  });
  
  return {
    id: `${section}-template`,
    title: `${section.charAt(0).toUpperCase() + section.slice(1)} Questionnaire`,
    description: "Generated from CSV upload",
    questions,
  };
}

// Escape CSV values properly
function escapeCSV(value: string): string {
  // If the value contains a comma, newline, or double quote, it needs to be quoted
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    // Double quotes need to be escaped by doubling them
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Convert from QuestionTemplate format to CSV format for download
export function convertTemplateToCSV(template: QuestionTemplate): string {
  // Header row
  let csv = "question_number,question_text,answer1_text,answer1_value,answer2_text,answer2_value,answer3_text,answer3_value,answer4_text,answer4_value,answer5_text,answer5_value\n";
  
  // Data rows
  template.questions.forEach(question => {
    const row: string[] = [question.id, escapeCSV(question.text)];
    
    // Add answer options (up to 5)
    for (let i = 0; i < 5; i++) {
      if (question.options[i]) {
        row.push(escapeCSV(question.options[i].text));
        row.push(question.options[i].value.toString());
      } else {
        row.push('');
        row.push('');
      }
    }
    
    csv += row.join(',') + '\n';
  });
  
  return csv;
}