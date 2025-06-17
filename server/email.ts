import { MailService } from '@sendgrid/mail';
import { Client, Questionnaire } from '@shared/schema';

// Initialize SendGrid client
let mailService: MailService;

// Determine if SendGrid is configured
const isSendGridConfigured = () => {
  return !!process.env.SENDGRID_API_KEY;
};

// Setup SendGrid
export const setupSendGrid = () => {
  if (isSendGridConfigured()) {
    try {
      mailService = new MailService();
      mailService.setApiKey(process.env.SENDGRID_API_KEY!);
      console.log('SendGrid API initialized successfully.');
      return true;
    } catch (error) {
      console.error('Error initializing SendGrid:', error);
      return false;
    }
  } else {
    console.log('SendGrid API key not found. Email notifications disabled.');
    return false;
  }
};

// Send questionnaire completion notification
export const sendQuestionnaireCompletionEmail = async (
  client: Client,
  section: string,
  adminEmail: string = 'info@wealthconcierge.ca' // Northern Light Wealth contact email
): Promise<boolean> => {
  if (!isSendGridConfigured() || !mailService) {
    console.log('SendGrid not configured. Email notification skipped.');
    return false;
  }

  // Format the section name for display
  let sectionTitle = '';
  switch (section) {
    case 'riskTolerance':
      sectionTitle = 'Risk Tolerance Assessment';
      break;
    case 'clientUpdate':
      sectionTitle = 'Client Information Update';
      break;
    case 'investmentPolicy':
      sectionTitle = 'Investment Policy Statement';
      break;
    default:
      sectionTitle = section;
  }

  try {
    const msg = {
      to: adminEmail,
      from: 'info@wealthconcierge.ca', // Using the same address as the verified sender
      subject: `Questionnaire Completed: ${sectionTitle}`,
      text: `
Client ${client.name} (${client.clientNumber}) has completed the ${sectionTitle} questionnaire.

To view the submitted information, please log in to the admin dashboard.
      `,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #062d58; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Northern Light Wealth</h1>
  </div>
  <div style="padding: 20px;">
    <h2 style="color: #062d58;">Questionnaire Completion Notification</h2>
    <p>Client <strong>${client.name}</strong> (Client #: ${client.clientNumber}) has completed the <strong>${sectionTitle}</strong> questionnaire.</p>
    
    <p>To view the submitted information, please <a href="https://nlw-client-questionnaire.replit.app/admin" style="color: #062d58; text-decoration: underline;">log in to the admin dashboard</a>.</p>
  </div>
  
  <hr style="border: 1px solid #eee; margin: 20px 0;">
  
  <p style="color: #666; font-size: 12px; text-align: center; padding: 0 20px 20px 20px;">
    &copy; ${new Date().getFullYear()} Northern Light Wealth. All rights reserved.<br>
    This is an automated message. Please do not reply to this email.
  </p>
</div>
      `,
    };

    await mailService.send(msg);
    console.log(`Email notification sent to ${adminEmail} for client ${client.clientNumber}`);
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
};