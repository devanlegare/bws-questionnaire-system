import { storage } from './server/storage.js';
// For compatibility with our project setup
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function testVersionTracking() {
  try {
    // Step 1: Check current template version
    const template = await storage.getQuestionTemplateBySection('riskTolerance');
    if (!template) {
      console.log('No Risk Tolerance template found');
      return;
    }
    
    console.log('Current template:', {
      id: template.id,
      version: template.version,
      title: template.title,
      questionCount: template.questions.length
    });
    
    // Step 2: Update the template to create a new version
    if (template) {
      // Make a copy with one small change
      const updatedTemplate = { 
        ...template,
        title: template.title + ' (Updated)',
      };
      
      // Update the template (this should increment the version)
      const newVersion = await storage.updateQuestionTemplate('riskTolerance', updatedTemplate);
      console.log('Updated template:', {
        id: newVersion.id,
        version: newVersion.version,
        title: newVersion.title
      });
      
      // Step 3: Verify version history
      const history = await storage.getQuestionTemplateHistory('riskTolerance');
      console.log('Template version history:', history.map(t => ({
        version: t.version,
        title: t.title,
        createdAt: t.createdAt
      })));
      
      // Step 4: Get specific version
      const v1 = await storage.getQuestionTemplateVersion('riskTolerance', 1);
      console.log('Version 1:', v1 ? {
        version: v1.version,
        title: v1.title
      } : 'Not found');
      
      // Step 5: Get latest version number
      const latestVersion = await storage.getLatestTemplateVersion('riskTolerance');
      console.log('Latest version number:', latestVersion);
    }
  } catch (error) {
    console.error('Error testing version tracking:', error);
  }
}

testVersionTracking();