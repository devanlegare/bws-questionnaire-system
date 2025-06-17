import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { storage } from './server/storage';
import { convertCSVToQuestionTemplate } from './client/src/lib/csv-converter';
import { exec } from 'child_process';
import { promisify } from 'util';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Convert exec to promise-based
const execPromise = promisify(exec);

// Function to normalize text and fix encoding issues - only handle smart quotes
function normalizeText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes/apostrophes
    .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
    .replace(/\r\n/g, '\n'); // Normalize line endings
}

async function resetRiskToleranceTemplate() {
  try {
    console.log("Starting Risk Tolerance template reset...");
    
    // Step 1: Delete the existing Risk Tolerance template
    const existingTemplate = await storage.getQuestionTemplate('riskTolerance');
    if (existingTemplate) {
      console.log("Deleting existing Risk Tolerance template...");
      await storage.deleteQuestionTemplate('riskTolerance');
      console.log("Existing template deleted successfully.");
    } else {
      console.log("No existing Risk Tolerance template found to delete.");
    }
    
    // Also clear any templates or versions with IDs that start with riskTolerance
    const allTemplates = await storage.getAllQuestionTemplates();
    for (const template of allTemplates) {
      if (template.id.startsWith('riskTolerance')) {
        await storage.deleteQuestionTemplate(template.id);
        console.log(`Deleted template with ID: ${template.id}`);
      }
    }
    
    // Step 2: Copy the uploaded template to the root directory (for future use)
    const sourcePath = path.join(__dirname, 'attached_assets/risk-tolerance-template12.csv');
    const destPath = path.join(__dirname, 'example-risk-tolerance-template.csv');
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Template file copied to ${destPath}`);
    } else {
      console.error("Source template file not found at:", sourcePath);
      return;
    }
    
    // Step 3: Load and parse the CSV file (using iconv to convert from Latin1 to UTF8)
    console.log("Converting CSV from Latin1 to UTF-8...");
    let csvContent = '';
    
    try {
      // Try using iconv to convert from Latin1 to UTF-8
      const { stdout } = await execPromise(`cat "${sourcePath}" | iconv -f latin1 -t utf-8`);
      csvContent = stdout;
      console.log("Successfully converted CSV using iconv");
    } catch (error) {
      // Fallback to direct reading if iconv fails
      console.log("Iconv conversion failed, falling back to direct reading");
      csvContent = fs.readFileSync(sourcePath, { encoding: 'latin1' });
    }
    
    // Normalize the text to fix any remaining encoding issues
    const cleanedCsvData = normalizeText(csvContent);
    
    // Write the cleaned data to a temporary file for debugging
    const cleanedPath = path.join(__dirname, 'cleaned-template.csv');
    fs.writeFileSync(cleanedPath, cleanedCsvData, 'utf8');
    console.log(`Wrote cleaned CSV to ${cleanedPath} for debugging`);
    
    const records = parse(cleanedCsvData, {
      columns: true,
      skip_empty_lines: true
    });
    
    // Step 4: Convert to template format with special character handling
    const template = convertCSVToQuestionTemplate(records, 'riskTolerance');
    
    // Additional cleanup for each question and answer text
    template.questions.forEach(question => {
      // Clean question text
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
    
    // Step 5: Set the template metadata and version to 1
    const finalTemplate = {
      ...template,
      id: 'riskTolerance',
      version: 1, // Explicitly set to version 1
      title: 'Risk Tolerance Assessment',
      description: 'This questionnaire helps us understand your attitude toward investment risk so we can tailor your portfolio accordingly.',
      createdAt: new Date() // Set current timestamp
    };
    
    // Step 6: Save the template as the new V1
    await storage.createQuestionTemplate(finalTemplate);
    console.log(`New Risk Tolerance template created with ${finalTemplate.questions.length} questions`);
    console.log("First question:", finalTemplate.questions[0].text);
    
    // Log a few answers to verify encoding
    if (finalTemplate.questions[0] && finalTemplate.questions[0].options.length > 0) {
      console.log("First question option:", finalTemplate.questions[0].options[0].text);
    }
    
    // Verify it's set correctly
    const newTemplate = await storage.getQuestionTemplateBySection('riskTolerance');
    console.log("Template reset complete. Current version:", newTemplate?.version);
    
  } catch (error) {
    console.error('Error resetting Risk Tolerance template:', error);
  }
}

// Run the reset function
resetRiskToleranceTemplate().then(() => {
  console.log("Reset process completed.");
}).catch(err => {
  console.error("Reset process failed:", err);
});