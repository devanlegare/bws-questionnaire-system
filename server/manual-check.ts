import { parse } from 'csv-parse/sync';
import fs from 'fs';

export async function checkTemplateDirectly() {
  try {
    // Read the CSV file directly
    const csvContent = fs.readFileSync('example-risk-tolerance-template.csv', 'utf8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    // Find question 5
    const q5Record = records.find((record: any) => record.question_number === 'Q5');
    
    if (q5Record) {
      console.log('Question 5 from CSV:');
      console.log(`Question: ${q5Record.question_text}`);
      console.log('Options:');
      
      // Display answer options
      for (let i = 1; i <= 5; i++) {
        console.log(`  ${i}. "${q5Record[`answer${i}_text`]}" (${q5Record[`answer${i}_value`]} pts)`);
      }
    } else {
      console.log('Question 5 not found in CSV');
    }
    
  } catch (error) {
    console.error('Error checking CSV directly:', error);
  }
}

// Only run this if executed directly
if (require.main === module) {
  checkTemplateDirectly();
}