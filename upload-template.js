// Script to upload Risk Tolerance template from file to database
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadTemplate(filePath) {
    try {
        // Read the CSV file
        console.log(`Reading template from ${filePath}...`);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        // Parse the CSV data
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });
        
        // Convert to question template format
        const questionTemplate = {
            id: 'riskTolerance-template',
            title: 'Risk Tolerance Questionnaire V1',
            section: 'riskTolerance',
            version: 1,
            description: 'Official Risk Tolerance Questionnaire Version 1',
            questions: []
        };
        
        // Process each row in the CSV
        records.forEach(record => {
            const question = {
                questionNumber: record.question_number,
                questionText: record.question_text,
                answerOptions: [
                    {
                        text: record.answer1_text,
                        value: parseInt(record.answer1_value, 10)
                    },
                    {
                        text: record.answer2_text,
                        value: parseInt(record.answer2_value, 10)
                    },
                    {
                        text: record.answer3_text,
                        value: parseInt(record.answer3_value, 10)
                    },
                    {
                        text: record.answer4_text,
                        value: parseInt(record.answer4_value, 10)
                    },
                    {
                        text: record.answer5_text,
                        value: parseInt(record.answer5_value, 10)
                    }
                ]
            };
            questionTemplate.questions.push(question);
        });
        
        // Log critical info about Q5 for verification
        const q5 = questionTemplate.questions.find(q => q.questionNumber === 'Q5');
        if (q5) {
            console.log('Question 5, Answer 5:');
            console.log(`Text: ${q5.answerOptions[4].text}`);
            console.log(`Value: ${q5.answerOptions[4].value}`);
        }
        
        // Upload the template via the API
        console.log('Uploading template to database...');
        
        // First we need to log in as admin
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
        
        // Upload the template
        const response = await fetch('http://localhost:5000/api/question-templates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies
            },
            body: JSON.stringify(questionTemplate),
        });
        
        if (!response.ok) {
            const errorResponse = await response.text();
            console.error('Server responded with error:', errorResponse);
            throw new Error('Failed to upload template');
        }
        
        const result = await response.json();
        console.log('Template uploaded successfully!');
        console.log('Template details:', result);
        
    } catch (error) {
        console.error('Error uploading template:', error);
    }
}

// Run the script with the path to the template file
uploadTemplate(path.join(__dirname, 'risk-tolerance-v1.csv'));