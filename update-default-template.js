// Script to update the default Risk Tolerance template
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy the updated template to the main template file
console.log('Updating default Risk Tolerance template...');
fs.copyFileSync(
  path.join(__dirname, 'updated-risk-tolerance-template.csv'),
  path.join(__dirname, 'example-risk-tolerance-template.csv')
);
console.log('Default template updated successfully');

// Create a timestamp for the version
const timestamp = new Date().toISOString();
console.log(`Template updated at: ${timestamp}`);