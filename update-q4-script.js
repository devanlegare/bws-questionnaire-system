// Script to update Question 4 in the Risk Tolerance template
import fetch from 'node-fetch';

async function updateQuestionFour() {
  try {
    console.log('Starting process to update Question 4 in the Risk Tolerance template...');

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

    // Get current template
    console.log('Getting current Risk Tolerance template...');
    const templateResponse = await fetch('http://localhost:5000/api/question-templates/riskTolerance', {
      headers: {
        'Cookie': cookies
      }
    });

    if (!templateResponse.ok) {
      throw new Error('Failed to get template');
    }

    const template = await templateResponse.json();
    console.log('Retrieved template successfully');

    // Update Question 4 answers
    const questionIndex = template.questions.findIndex(q => q.id === 'Q4');
    
    if (questionIndex === -1) {
      throw new Error('Question 4 not found in template');
    }

    console.log('Updating Question 4 answers...');
    
    // New answer options as specified
    const newOptions = [
      {
        id: "answer-Q4-1",
        text: "Under $60,000",
        value: 4
      },
      {
        id: "answer-Q4-2",
        text: "$60,000 to $100,000",
        value: 6
      },
      {
        id: "answer-Q4-3",
        text: "$100,001 to $175,000",
        value: 8
      },
      {
        id: "answer-Q4-4",
        text: "$175,001 to $250,000",
        value: 10
      },
      {
        id: "answer-Q4-5",
        text: "More than $250,000",
        value: 10
      }
    ];

    // Update the options for Question 4
    template.questions[questionIndex].options = newOptions;

    // Save updated template
    console.log('Saving updated template...');
    const updateResponse = await fetch(`http://localhost:5000/api/question-templates/${template.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(template)
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update template');
    }

    console.log('Template updated successfully. Question 4 now has the new income ranges.');
    
    // Verify the update
    console.log('Verifying update...');
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
    console.error('Error updating template:', error);
  }
}

// Run the function
updateQuestionFour();