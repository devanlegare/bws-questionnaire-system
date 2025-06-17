// Script to check the current Risk Tolerance template in the database
import fetch from 'node-fetch';

async function checkTemplate() {
    try {
        // Fetch the current template from the API
        console.log('Fetching current Risk Tolerance template...');
        const response = await fetch('http://localhost:5000/api/question-templates/riskTolerance');
        const template = await response.json();
        
        // Check if the template exists
        if (!template || !template.questions) {
            console.error('Template not found or invalid format');
            return;
        }
        
        // Find question 5
        const question5 = template.questions.find(q => q.questionNumber === 'Q5');
        if (!question5) {
            console.error('Question 5 not found in template');
            return;
        }
        
        // Check the 5th answer
        if (question5.answerOptions && question5.answerOptions.length >= 5) {
            const answer5 = question5.answerOptions[4]; // 0-indexed, so 4 is the 5th answer
            console.log('Question 5, Answer 5:');
            console.log(`Text: ${answer5.text}`);
            console.log(`Value: ${answer5.value}`);
            
            if (answer5.text.includes("$10,000,000")) {
                console.log('SUCCESS: Template has been correctly updated with "$10,000,000" in Q5 Answer 5');
            } else {
                console.log('WARNING: Template does not have "$10,000,000" in Q5 Answer 5');
                console.log('Current text is:', answer5.text);
            }
        } else {
            console.error('Question 5 does not have enough answer options');
        }
    } catch (error) {
        console.error('Error checking template:', error);
    }
}

// Run the check
checkTemplate();