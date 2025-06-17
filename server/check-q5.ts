import { storage } from './storage';

async function checkQuestionFive() {
  try {
    const template = await storage.getQuestionTemplateBySection('riskTolerance');
    
    if (!template) {
      console.log('Risk tolerance template not found');
      return;
    }
    
    // Find question 5 (index 4)
    const q5 = template.questions[4];
    
    console.log('Question 5:');
    console.log(`Text: ${q5.text}`);
    console.log('Options:');
    
    q5.options.forEach((option, index) => {
      console.log(`  ${index + 1}. "${option.text}" (${option.value} pts)`);
    });
    
  } catch (error) {
    console.error('Error checking question 5:', error);
  }
}

checkQuestionFive();