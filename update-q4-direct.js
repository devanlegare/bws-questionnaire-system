// Script to directly update Question 4 in the Risk Tolerance template
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

async function updateQ4Direct() {
  try {
    // Read the current template
    console.log('Reading current template...');
    const templateData = fs.readFileSync('current-template.json', 'utf8');
    const template = JSON.parse(templateData);
    
    // Update Question 4 options with new income ranges
    const q4Index = template.questions.findIndex(q => q.id === 'Q4');
    
    if (q4Index === -1) {
      throw new Error('Question 4 not found in template');
    }
    
    console.log('Updating Question 4 options...');
    template.questions[q4Index].options = [
      {
        "id": "answer-Q4-1",
        "text": "Under $60,000",
        "value": 4
      },
      {
        "id": "answer-Q4-2",
        "text": "$60,000 to $100,000",
        "value": 6
      },
      {
        "id": "answer-Q4-3",
        "text": "$100,001 to $175,000",
        "value": 8
      },
      {
        "id": "answer-Q4-4",
        "text": "$175,001 to $250,000",
        "value": 10
      },
      {
        "id": "answer-Q4-5",
        "text": "More than $250,000",
        "value": 10
      }
    ];
    
    // Convert template to CSV format
    console.log('Converting template to CSV format...');
    let csvRows = [
      ['Question ID', 'Question Text', 'Answer ID', 'Answer Text', 'Answer Value']
    ];
    
    for (const question of template.questions) {
      for (const option of question.options) {
        csvRows.push([
          question.id,
          question.text,
          option.id,
          option.text,
          option.value
        ]);
      }
    }
    
    // Create CSV content
    const csvContent = csvRows.map(row => 
      row.map(cell => {
        // Escape quotes and wrap text in quotes
        if (typeof cell === 'string') {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ).join('\n');
    
    // Write updated CSV file
    fs.writeFileSync('temp-template.csv', csvContent);
    console.log('CSV file created at temp-template.csv');
    
    // Make sure the file has the correct format and content
    console.log('Verifying CSV file content...');
    const csvFile = fs.readFileSync('temp-template.csv', 'utf8');
    const records = parse(csvFile, {
      columns: true,
      skip_empty_lines: true
    });
    
    const q4Options = records.filter(record => record['Question ID'] === 'Q4');
    console.log('Q4 options in CSV:', q4Options);
    
    console.log('Ready to use file temp-template.csv for upload');
    console.log('To upload, use this command:');
    console.log('curl -s -X POST http://localhost:5000/api/admin/login -H "Content-Type: application/json" -d \'{"username":"NLWAdmin","password":"NLWAdmin2023!"}\' -c cookies.txt && curl -s -X POST http://localhost:5000/api/question-templates/upload -b cookies.txt -F "file=@temp-template.csv" -F "section=riskTolerance" -F "title=Risk Tolerance Assessment" -F "description=This questionnaire helps us understand your attitude toward investment risk so we can tailor your portfolio accordingly."');
  } catch (error) {
    console.error('Error updating Q4:', error);
  }
}

// Run the function
updateQ4Direct();