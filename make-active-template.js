// Script to make the current Risk Tolerance template the only active one
import fetch from 'node-fetch';

async function makeActiveTemplate() {
  try {
    console.log('Starting process to set the current template as the only active one...');

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

    // Get all versions
    console.log('Checking template versions...');
    const versionsResponse = await fetch('http://localhost:5000/api/question-templates/riskTolerance/versions', {
      headers: {
        'Cookie': cookies
      }
    });

    if (!versionsResponse.ok) {
      throw new Error('Failed to get template versions');
    }

    const versionsData = await versionsResponse.json();
    console.log('Template versions:', JSON.stringify(versionsData, null, 2));

    // Get the current version ID
    const currentId = versionsData.current.id;
    console.log('Current template ID:', currentId);

    // Get all templates
    console.log('Getting all templates...');
    const allTemplatesResponse = await fetch('http://localhost:5000/api/question-templates', {
      headers: {
        'Cookie': cookies
      }
    });

    if (!allTemplatesResponse.ok) {
      throw new Error('Failed to get all templates');
    }

    const allTemplates = await allTemplatesResponse.json();
    
    // Find all riskTolerance templates
    const riskToleranceTemplates = allTemplates.filter(template => 
      template.section === 'riskTolerance' && template.id !== currentId
    );
    
    console.log(`Found ${riskToleranceTemplates.length} other Risk Tolerance templates`);
    
    // Delete all other Risk Tolerance templates
    for (const template of riskToleranceTemplates) {
      console.log(`Deleting template with ID: ${template.id}`);
      
      const deleteResponse = await fetch(`http://localhost:5000/api/question-templates/${template.id}`, {
        method: 'DELETE',
        headers: {
          'Cookie': cookies
        }
      });
      
      if (!deleteResponse.ok) {
        console.warn(`Warning: Failed to delete template with ID: ${template.id}`);
      } else {
        console.log(`Successfully deleted template with ID: ${template.id}`);
      }
    }
    
    // Verify active template
    console.log('Verifying active template...');
    const activeTemplateResponse = await fetch('http://localhost:5000/api/question-templates/riskTolerance', {
      headers: {
        'Cookie': cookies
      }
    });
    
    if (!activeTemplateResponse.ok) {
      throw new Error('Failed to get active template');
    }
    
    const activeTemplate = await activeTemplateResponse.json();
    console.log('Active template:', JSON.stringify({
      id: activeTemplate.id,
      title: activeTemplate.title,
      version: activeTemplate.version,
      questions: activeTemplate.questions.length
    }, null, 2));
    
    console.log('Success! Your uploaded template is now the only active Risk Tolerance template.');

  } catch (error) {
    console.error('Error making template active:', error);
  }
}

// Run the function
makeActiveTemplate();