// Script to update Question 4 in the Risk Tolerance template
import fs from 'fs';

async function updateTemplate() {
  try {
    console.log('Reading current template...');
    const templateData = fs.readFileSync('current-template.json', 'utf8');
    const template = JSON.parse(templateData);
    
    // Find question 4
    const q4Index = template.questions.findIndex(q => q.id === 'Q4');
    
    if (q4Index === -1) {
      throw new Error('Question 4 not found in template');
    }
    
    console.log('Current Question 4 options:');
    console.log(JSON.stringify(template.questions[q4Index].options, null, 2));
    
    // Update with new options
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
    
    console.log('Updated Question 4 options:');
    console.log(JSON.stringify(template.questions[q4Index].options, null, 2));
    
    // Save the updated template
    fs.writeFileSync('updated-template.json', JSON.stringify(template, null, 2));
    console.log('Template updated and saved to updated-template.json');
    
    // Create a CSV format for upload
    console.log('Creating CSV for upload...');
    let csvContent = 'Question ID,Question Text,Answer ID,Answer Text,Answer Value\n';
    
    for (const question of template.questions) {
      for (const option of question.options) {
        csvContent += `${question.id},"${question.text}",${option.id},"${option.text}",${option.value}\n`;
      }
    }
    
    fs.writeFileSync('updated-template.csv', csvContent);
    console.log('CSV file created as updated-template.csv');
    
  } catch (error) {
    console.error('Error updating template:', error);
  }
}

// Run the function
updateTemplate();