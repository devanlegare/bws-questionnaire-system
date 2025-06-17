// Script to upload the updated template with the new income ranges for Q4
import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';

async function uploadUpdatedTemplate() {
  try {
    console.log('Starting process to upload the updated Risk Tolerance template...');

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

    // Upload the updated template
    console.log('Uploading the updated template...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream('updated-template.csv'));
    form.append('section', 'riskTolerance');
    form.append('title', 'Risk Tolerance Assessment');
    
    const uploadResponse = await fetch('http://localhost:5000/api/question-templates/upload', {
      method: 'POST',
      headers: {
        'Cookie': cookies
      },
      body: form
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload template: ${errorText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    console.log('Template uploaded successfully:', uploadResult);
    
    // Verify the update
    console.log('Verifying the update...');
    const verifyResponse = await fetch('http://localhost:5000/api/question-templates/riskTolerance', {
      headers: {
        'Cookie': cookies
      }
    });
    
    if (!verifyResponse.ok) {
      throw new Error('Failed to verify update');
    }
    
    const updatedTemplate = await verifyResponse.json();
    const updatedQ4 = updatedTemplate.questions.find(q => q.id === 'Q4');
    
    console.log('Updated Question 4:');
    console.log(JSON.stringify(updatedQ4, null, 2));
    
    console.log('Success! Question 4 has been permanently updated with the new income ranges.');

  } catch (error) {
    console.error('Error uploading template:', error);
  }
}

// Run the function
uploadUpdatedTemplate();