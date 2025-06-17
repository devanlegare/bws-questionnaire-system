import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { convertCSVToQuestionTemplate } from '../client/src/lib/csv-converter';
import { storage } from './storage';
import { QuestionTemplate } from '@shared/schema';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Convert exec to promise-based
const execPromise = promisify(exec);

// Function to normalize text and fix encoding issues - only handle smart quotes
function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes/apostrophes
    .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
    .replace(/\r\n/g, '\n'); // Normalize line endings
}

export async function setupDefaultQuestionTemplates() {
  try {
    // Check if risk tolerance template already exists
    const existingTemplate = await storage.getQuestionTemplateBySection('riskTolerance');
    
    // Only create default template if one doesn't exist
    if (!existingTemplate) {
      console.log('Setting up default Risk Tolerance template...');
      
      let finalTemplate: QuestionTemplate;
      
      // First try to use the custom template from the project root
      let csvFilePath = path.join(__dirname, '../example-risk-tolerance-template.csv');
      
      // If not found, fall back to the original example in public folder
      if (!fs.existsSync(csvFilePath)) {
        csvFilePath = path.join(__dirname, '../client/public/example-risk-tolerance-template.csv');
      }
      
      // Try to load from CSV file first
      if (fs.existsSync(csvFilePath)) {
        // Try to read the CSV file with proper encoding handling
        let csvContent = '';
        
        try {
          // Try using iconv to convert from Latin1 to UTF-8
          const { stdout } = await execPromise(`cat "${csvFilePath}" | iconv -f latin1 -t utf-8`);
          csvContent = stdout;
        } catch (error) {
          // Fallback to direct reading with Latin1 encoding if iconv fails
          csvContent = fs.readFileSync(csvFilePath, { encoding: 'latin1' });
        }
        
        // Normalize the text to fix any encoding issues
        const cleanedCsvData = normalizeText(csvContent);
        
        const records = parse(cleanedCsvData, {
          columns: true,
          skip_empty_lines: true
        });
        
        // Convert to template format
        const template = convertCSVToQuestionTemplate(records, 'riskTolerance');
        
        // Additional cleanup for each question and answer text
        template.questions.forEach(question => {
          // Clean question text again to be extra sure
          question.text = normalizeText(question.text);
          
          // Clean each answer option text
          question.options.forEach(option => {
            option.text = normalizeText(option.text);
            
            // Ensure value is a number
            option.value = Number(option.value);
            
            // Ensure value is within range (0-30)
            if (option.value < 0) option.value = 0;
            if (option.value > 30) option.value = 30;
          });
        });
        
        // Customize the ID and metadata
        finalTemplate = {
          ...template,
          id: 'riskTolerance', // Use the section name directly as ID
          title: 'Risk Tolerance Assessment',
          description: 'This questionnaire helps us understand your attitude toward investment risk so we can tailor your portfolio accordingly.'
        };
        
        console.log(`Loaded template with ${finalTemplate.questions.length} questions from: ${path.basename(csvFilePath)}`);
      } 
      // If CSV file not found, try to load from JSON
      else {
        const jsonFilePath = path.join(__dirname, '../example-risk-tolerance-template.json');
        
        if (fs.existsSync(jsonFilePath)) {
          console.log(`Loading template from JSON file: ${path.basename(jsonFilePath)}`);
          // Read the JSON file containing the template
          const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
          finalTemplate = JSON.parse(jsonData);
          
          // Clean all text fields in the JSON template too
          finalTemplate.questions.forEach(question => {
            question.text = normalizeText(question.text);
            question.options.forEach(option => {
              option.text = normalizeText(option.text);
            });
          });
          
          console.log(`Loaded template with ${finalTemplate.questions.length} questions from JSON`);
        } else {
          console.error('No template files found. Cannot create default Risk Tolerance template.');
          return; // Exit the function
        }
      }
      
      // Save template
      await storage.createQuestionTemplate(finalTemplate);
      console.log('Default Risk Tolerance template created successfully');
    } else {
      console.log('Risk Tolerance template already exists - skipping creation');
    }
  } catch (error) {
    console.error('Error setting up default question templates:', error);
  }
}