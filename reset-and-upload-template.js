// Script to reset and upload a new risk tolerance template with updated Q4
import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';

async function resetAndUploadTemplate() {
  try {
    console.log('Starting process to reset and upload updated Risk Tolerance template...');

    // First login as admin
    console.log('Logging in as admin...');
    const loginResponse = await fetch('http://localhost:5000/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'NLWAdmin',
        password: 'NLWAdmin2023!'
      }),
    });

    if (!loginResponse.ok) {
      throw new Error('Failed to login as admin');
    }

    // Get session cookie
    const cookies = loginResponse.headers.get('set-cookie');

    // First, get the current template to modify it
    console.log('Getting current template...');
    const templateResponse = await fetch('http://localhost:5000/api/question-templates/riskTolerance', {
      headers: {
        'Cookie': cookies
      }
    });

    if (!templateResponse.ok) {
      throw new Error('Failed to get current template');
    }

    const template = await templateResponse.json();
    console.log('Successfully retrieved current template');

    // Update Question 4 options
    console.log('Updating Question 4 with new income ranges...');
    const q4Index = template.questions.findIndex(q => q.id === 'Q4');
    
    if (q4Index === -1) {
      throw new Error('Question 4 not found in template');
    }
    
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

    // Convert the updated template to CSV format for upload
    console.log('Converting updated template to CSV format...');
    let csvContent = 'Question ID,Question Text,Answer ID,Answer Text,Answer Value\n';
    
    for (const question of template.questions) {
      for (const option of question.options) {
        const questionText = question.text.replace(/"/g, '""');
        const optionText = option.text.replace(/"/g, '""');
        csvContent += `${question.id},"${questionText}",${option.id},"${optionText}",${option.value}\n`;
      }
    }
    
    // Save the CSV file
    fs.writeFileSync('updated-q4-template.csv', csvContent);
    console.log('Updated template saved as updated-q4-template.csv');

    // Now delete the current template
    console.log('Deleting current template...');
    const deleteResponse = await fetch(`http://localhost:5000/api/question-templates/${template.id}`, {
      method: 'DELETE',
      headers: {
        'Cookie': cookies
      }
    });
    
    if (!deleteResponse.ok) {
      console.warn('Warning: Failed to delete current template');
    } else {
      console.log('Successfully deleted current template');
    }

    // Now upload the new template using the form data
    console.log('Uploading new template with updated Q4...');
    
    // Manually construct the curl command for better control
    const curlCommand = `curl -s -X POST http://localhost:5000/api/question-templates/upload -b cookies.txt -F "file=@updated-q4-template.csv" -F "section=riskTolerance" -F "title=Risk Tolerance Assessment" -F "description=This questionnaire helps us understand your attitude toward investment risk so we can tailor your portfolio accordingly."`;
    
    // Write the curl command to a bash script
    fs.writeFileSync('upload-template.sh', `#!/bin/bash\n${curlCommand}`);
    console.log('Created upload-template.sh script');
    
    console.log('Execute the following to upload the template:');
    console.log('chmod +x upload-template.sh && ./upload-template.sh');
    
  } catch (error) {
    console.error('Error in reset and upload process:', error);
  }
}

// Run the function
resetAndUploadTemplate();