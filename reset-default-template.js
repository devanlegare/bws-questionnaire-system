// Script to reset the Risk Tolerance questionnaire as the default template
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetRiskToleranceTemplate() {
  try {
    console.log('Starting reset of default Risk Tolerance template...');

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

    // Check if template exists and remove it
    console.log('Checking for existing template...');
    const existingResponse = await fetch('http://localhost:5000/api/question-templates/riskTolerance', {
      headers: {
        'Cookie': cookies
      }
    });

    // If template exists, delete it
    if (existingResponse.ok) {
      console.log('Deleting existing template...');
      const deleteResponse = await fetch('http://localhost:5000/api/question-templates/riskTolerance', {
        method: 'DELETE',
        headers: {
          'Cookie': cookies
        }
      });

      if (!deleteResponse.ok) {
        console.error('Warning: Failed to delete existing template');
      } else {
        console.log('Successfully deleted existing template');
      }
    }

    // Force a server restart to trigger default template creation
    console.log('Restarting server to trigger default template creation...');
    await fetch('http://localhost:5000/api/admin/restart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    }).catch(err => {
      // The request might fail as the server restarts, this is normal
      console.log('Server restart initiated');
    });

    console.log('Reset process completed. The default Risk Tolerance template has been reset.');
    console.log('Please wait a few moments for the server to restart and apply the changes.');

  } catch (error) {
    console.error('Error resetting template:', error);
  }
}

// Run the reset function
resetRiskToleranceTemplate();