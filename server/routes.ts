import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertClientSchema, 
  insertQuestionnaireSchema, 
  riskToleranceResponseSchema,
  clientUpdateSchema,
  investmentPolicySchema,
  riskProfiles,
  sectionTypes,
  SectionType,
  sectionLinkSchema,
  questionTemplateSchema
} from "@shared/schema";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import { sendQuestionnaireCompletionEmail } from "./email";

// Add submittedSections to Session type
declare module 'express-session' {
  interface SessionData {
    submittedSections?: Record<string, boolean>;
  }
}

// JWT secret for section-specific links
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);

  // Client routes
  app.get("/api/client", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.type === "client") {
      const client = await storage.getClient(req.user.id);
      return res.json(client);
    } else if (req.user.type === "admin") {
      const clients = await storage.getAllClients();
      return res.json(clients);
    }
    
    return res.status(403).json({ message: "Forbidden" });
  });

  // Update client questionnaire access
  app.put("/api/client/:id/questionnaires", async (req, res) => {
    if (!req.isAuthenticated() || req.user.type !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const { id } = req.params;
    const { availableSections } = req.body;
    
    try {
      // Validate input
      if (!Array.isArray(availableSections)) {
        return res.status(400).json({ message: "Available sections must be an array" });
      }
      
      // Validate that all section types are valid
      const validSections = sectionTypes;
      const allValid = availableSections.every(section => validSections.includes(section as SectionType));
      
      if (!allValid) {
        return res.status(400).json({ 
          message: `Invalid section type. Valid types are: ${validSections.join(', ')}` 
        });
      }
      
      // Get client
      const client = await storage.getClient(Number(id));
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Update client
      const updatedClient = await storage.updateClient(Number(id), { availableSections });
      
      return res.json(updatedClient);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Unknown error occurred" });
    }
  });

  app.get("/api/client/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.type !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
    
    const client = await storage.getClient(id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    
    return res.json(client);
  });
  
  // Get client's questionnaires
  app.get("/api/client/:id/questionnaires", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
    
    // Only allow clients to access their own questionnaires or admins to access any client's questionnaires
    if (req.user.type === "client" && req.user.id !== id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const questionnaires = await storage.getQuestionnairesByClientId(id);
      return res.json(questionnaires);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Unknown error occurred" });
    }
  });
  
  app.delete("/api/client/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.type !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
    
    const client = await storage.getClient(id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    
    const success = await storage.deleteClient(id);
    if (success) {
      return res.status(200).json({ message: "Client deleted successfully" });
    } else {
      return res.status(500).json({ message: "Failed to delete client" });
    }
  });

  app.post("/api/client", async (req, res) => {
    if (!req.isAuthenticated() || req.user.type !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const clientData = insertClientSchema.parse(req.body);
      const existingClient = await storage.getClientByClientNumber(clientData.clientNumber);
      
      if (existingClient) {
        return res.status(400).json({ message: "Client number already exists" });
      }
      
      const client = await storage.createClient(clientData);
      return res.status(201).json(client);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Unknown error occurred" });
    }
  });

  // Questionnaire routes
  app.get("/api/questionnaire", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let clientId: number;
    if (req.user.type === "client") {
      clientId = req.user.id;
    } else if (req.user.type === "admin" && req.query.clientId) {
      clientId = parseInt(req.query.clientId as string);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
    } else {
      return res.status(400).json({ message: "Client ID is required" });
    }

    const questionnaires = await storage.getQuestionnairesByClientId(clientId);
    return res.json(questionnaires);
  });

  app.get("/api/questionnaire/:section", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const { section } = req.params;
    if (!sectionTypes.includes(section as any)) {
      return res.status(400).json({ message: "Invalid section" });
    }
    
    let clientId: number;
    if (req.user.type === "client") {
      clientId = req.user.id;
      
      // Check if client has access to this section
      const client = await storage.getClient(clientId);
      if (client && client.availableSections && Array.isArray(client.availableSections) && 
          !client.availableSections.includes(section)) {
        return res.status(403).json({ message: "Section not available for this client" });
      }
    } else if (req.user.type === "admin" && req.query.clientId) {
      clientId = parseInt(req.query.clientId as string);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
    } else {
      return res.status(400).json({ message: "Client ID is required" });
    }
    
    let questionnaire = await storage.getQuestionnaireByClientAndSection(clientId, section);
    
    if (!questionnaire) {
      // If questionnaire doesn't exist, create a new one
      questionnaire = await storage.createQuestionnaire({
        clientId,
        section,
        completed: false,
        data: {},
      });
    }
    
    return res.json(questionnaire);
  });
  
  // Get questionnaire history for a client (admin only)
  app.get("/api/questionnaire/:section/history", async (req, res) => {
    console.log("Getting questionnaire history", {
      isAuthenticated: req.isAuthenticated(),
      userType: req.user?.type,
      section: req.params.section,
      clientId: req.query.clientId
    });
    
    if (!req.isAuthenticated()) {
      console.log("Access denied: Not authenticated");
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Check if user is admin (more safely)
    const userType = req.user?.type || '';
    console.log("User type:", userType);
    
    if (userType !== "admin") {
      console.log("Access denied: Not admin, user type is:", userType);
      return res.status(403).json({ message: "Forbidden - Admin access required" });
    }
    
    const { section } = req.params;
    if (!sectionTypes.includes(section as any)) {
      return res.status(400).json({ message: "Invalid section" });
    }
    
    const { clientId } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ message: "Client ID is required" });
    }
    
    try {
      const clientIdNum = parseInt(clientId as string);
      if (isNaN(clientIdNum)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      // Get all questionnaires for this client and section
      const questionnaires = await storage.getQuestionnaireHistoryByClientAndSection(clientIdNum, section);
      console.log("Found questionnaires:", questionnaires.length);
      
      // Get client details for context
      const client = await storage.getClient(clientIdNum);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      return res.json({
        client,
        questionnaires,
        section
      });
    } catch (error) {
      console.error("Error fetching questionnaire history:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Unknown error occurred" });
    }
  });

  app.post("/api/questionnaire/:section", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const { section } = req.params;
    if (!sectionTypes.includes(section as any)) {
      return res.status(400).json({ message: "Invalid section" });
    }
    
    let clientId: number;
    if (req.user.type === "client") {
      clientId = req.user.id;
      
      // Check if client has access to this section
      const client = await storage.getClient(clientId);
      if (client && client.availableSections && Array.isArray(client.availableSections) && 
          !client.availableSections.includes(section)) {
        return res.status(403).json({ message: "Section not available for this client" });
      }
      
      // Check if this section was already submitted in this session
      // Initialize the submitted sections tracking if it doesn't exist
      if (!req.session.submittedSections) {
        req.session.submittedSections = {};
      }
      
      // If this section was already submitted in this session, prevent resubmission
      if (req.session.submittedSections[section]) {
        return res.status(403).json({ 
          message: "This questionnaire has already been submitted in this session. Please log out and log back in to submit again."
        });
      }
      
    } else if (req.user.type === "admin" && req.body.clientId) {
      clientId = parseInt(req.body.clientId as string);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
    } else {
      return res.status(400).json({ message: "Client ID is required" });
    }
    
    try {
      // Validate data based on section type
      let validatedData: any;
      let score: number | undefined;
      let riskProfile: string | undefined;
      
      if (section === "riskTolerance") {
        validatedData = riskToleranceResponseSchema.parse(req.body.data);
        
        // Calculate risk score and profile
        try {
          // Try to fetch template for this section
          const template = await storage.getQuestionTemplateBySection(section);
          
          if (template) {
            // Calculate score using the template
            score = 0;
            console.log("Calculating score for data:", JSON.stringify(validatedData));
            
            for (const question of template.questions) {
              const questionIndex = parseInt(question.id.replace(/\D/g, ''), 10);
              const answerId = validatedData[`question${questionIndex}`];
              
              console.log(`Question ${question.id} (index ${questionIndex}):`, answerId);
              
              if (answerId) {
                const option = question.options.find(opt => opt.id === answerId);
                if (option) {
                  console.log(`Found option with value: ${option.value}`);
                  score += option.value;
                  console.log(`Running score: ${score}`);
                } else {
                  console.log(`Option not found for answer ID: ${answerId}`);
                }
              } else {
                console.log(`No answer found for question ${question.id}`);
              }
            }
          } else {
            // Fall back to simple calculation if no template exists
            score = calculateRiskScore(validatedData);
            console.log("Using fallback score calculation:", score);
          }
          
          console.log("Final risk score calculated:", score);
          riskProfile = determineRiskProfile(score);
          console.log("Risk profile determined:", riskProfile);
        } catch (error) {
          console.error("Error calculating risk score:", error);
          score = calculateRiskScore(validatedData);
          riskProfile = determineRiskProfile(score);
        }
      } else if (section === "clientUpdate") {
        validatedData = clientUpdateSchema.parse(req.body.data);
      } else if (section === "investmentPolicy") {
        validatedData = investmentPolicySchema.parse(req.body.data);
      }
      
      // Get current template version
      let templateVersion = 1;
      if (section === "riskTolerance") {
        const template = await storage.getQuestionTemplateBySection(section);
        if (template && template.version) {
          templateVersion = template.version;
        }
      }
      
      // Always create a new questionnaire to preserve history
      const questionnaire = await storage.createQuestionnaire({
        clientId,
        section,
        completed: true,
        data: validatedData,
        score,
        riskProfile,
        templateVersion
      });
      
      // Send notification when client completes questionnaire
      if (req.user.type === "client") {
        const client = await storage.getClient(clientId);
        if (client) {
          // Auto-deactivate this section for the client after completion
          if (client.availableSections && Array.isArray(client.availableSections)) {
            const updatedSections = client.availableSections.filter(s => s !== section);
            await storage.updateClient(clientId, { 
              availableSections: updatedSections 
            });
            console.log(`Auto-deactivated ${section} for client ${clientId} after completion`);
          }
          
          // Send notification asynchronously - don't wait for it to complete
          sendQuestionnaireCompletionNotification(client, section).catch(err => {
            console.error("Error sending notification:", err);
          });
          
          // Mark this section as submitted in this session
          if (!req.session.submittedSections) {
            req.session.submittedSections = {};
          }
          req.session.submittedSections[section] = true;
          
          // Save the session to ensure the submission status is persisted
          req.session.save();
        }
      }
      
      return res.json(questionnaire);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Unknown error occurred" });
    }
  });

  // Generate section-specific links for admin to send to clients
  app.post("/api/generate-link", async (req, res) => {
    if (!req.isAuthenticated() || req.user.type !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const { clientId, section } = sectionLinkSchema.parse(req.body);
      
      // Check if client exists
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Check if the section is available for this client
      if (client.availableSections && 
          Array.isArray(client.availableSections) && 
          !client.availableSections.includes(section)) {
        // If section is not already available, add it to the client's available sections
        const updatedSections = [...(client.availableSections || [])];
        if (!updatedSections.includes(section)) {
          updatedSections.push(section);
          
          // Note: In a real database, this would be an actual update operation
          // This is a simplification for the in-memory storage
          client.availableSections = updatedSections;
        }
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { clientId, section, clientNumber: client.clientNumber },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
      
      // Create link
      const host = req.headers.host || 'localhost:5000';
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const link = `${protocol}://${host}/questionnaire/${section}?token=${token}`;
      
      return res.json({ link });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Unknown error occurred" });
    }
  });

  // Verify token from link and log in the client
  // Question Template routes
  app.get("/api/question-templates", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const templates = await storage.getAllQuestionTemplates();
      return res.json(templates);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Unknown error occurred" });
    }
  });

  app.get("/api/question-templates/:section", async (req, res) => {
    // Allow public access to question templates - anyone accessing the form
    // needs to see the questions, even before they authenticate
    const { section } = req.params;
    
    try {
      const template = await storage.getQuestionTemplateBySection(section);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      return res.json(template);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Unknown error occurred" });
    }
  });
  
  // Get template version info
  app.get("/api/question-templates/:section/versions", async (req, res) => {
    if (!req.isAuthenticated() || req.user.type !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { section } = req.params;
    
    try {
      // Get version history
      const history = await storage.getQuestionTemplateHistory(section);
      // Get current active template
      const current = await storage.getQuestionTemplateBySection(section);
      // Get latest version number
      const latestVersion = await storage.getLatestTemplateVersion(section);
      
      return res.json({
        current: current ? {
          id: current.id,
          version: current.version || 1,
          title: current.title,
          createdAt: current.createdAt
        } : null,
        history: history.map(t => ({
          version: t.version,
          title: t.title,
          createdAt: t.createdAt
        })),
        latestVersion
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Unknown error occurred" });
    }
  });
  
  // Test endpoint to update template for version testing
  app.post("/api/question-templates/:section/test-update", async (req, res) => {
    if (!req.isAuthenticated() || req.user.type !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { section } = req.params;
    
    try {
      // Get current template
      const current = await storage.getQuestionTemplateBySection(section);
      if (!current) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      // Create updated template (just change title to show it's updated)
      const updatedTemplate = {
        ...current,
        title: `${current.title} (Updated ${new Date().toISOString().slice(0, 16)})`
      };
      
      // Update the template (should create a new version)
      const newVersion = await storage.updateQuestionTemplate(section, updatedTemplate);
      
      if (!newVersion) {
        return res.status(500).json({ message: "Failed to create new version" });
      }
      
      return res.json({
        success: true,
        previousVersion: current.version,
        newVersion: newVersion.version || 0,
        title: newVersion.title
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Unknown error occurred" });
    }
  });

  app.post("/api/question-templates", async (req, res) => {
    if (!req.isAuthenticated() || req.user.type !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const templateData = questionTemplateSchema.parse(req.body);
      
      // Check if template with this ID already exists
      const existingTemplate = await storage.getQuestionTemplate(templateData.id);
      if (existingTemplate) {
        return res.status(400).json({ message: "Template ID already exists" });
      }
      
      const template = await storage.createQuestionTemplate(templateData);
      return res.status(201).json(template);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Unknown error occurred" });
    }
  });

  app.put("/api/question-templates/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.type !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const { id } = req.params;
    
    try {
      const templateData = questionTemplateSchema.parse(req.body);
      
      // Check if the ID in the URL matches the ID in the request body
      if (id !== templateData.id) {
        return res.status(400).json({ message: "Template ID in URL does not match ID in request body" });
      }
      
      // Check if template exists
      const existingTemplate = await storage.getQuestionTemplate(id);
      if (!existingTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      const template = await storage.updateQuestionTemplate(id, templateData);
      return res.json(template);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Unknown error occurred" });
    }
  });

  app.delete("/api/question-templates/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.type !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const { id } = req.params;
    
    try {
      const success = await storage.deleteQuestionTemplate(id);
      if (!success) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      return res.json({ success });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Unknown error occurred" });
    }
  });

  app.post("/api/verify-token", async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { 
        clientId: number;
        section: string;
        clientNumber: string;
      };
      
      // Check if client exists
      const client = await storage.getClient(decoded.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Ensure the client can access this section
      const section = decoded.section;
      if (client.availableSections && 
          Array.isArray(client.availableSections) && 
          !client.availableSections.includes(section)) {
        // Add this section to the client's available sections if it's not already there
        const updatedSections = [...(client.availableSections || [])];
        if (!updatedSections.includes(section)) {
          updatedSections.push(section);
          client.availableSections = updatedSections;
        }
      }
      
      // Check if client has any available sections
      const hasAvailableSections = client.availableSections && 
                                  Array.isArray(client.availableSections) && 
                                  client.availableSections.length > 0;
      
      // Log in the client
      req.login(
        { id: client.id, type: "client" },
        (err) => {
          if (err) {
            return res.status(500).json({ message: "Login failed" });
          }
          
          return res.json({ 
            success: true, 
            section: decoded.section,
            client,
            hasAvailableSections
          });
        }
      );
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to calculate risk score from answers
function calculateRiskScore(data: Record<string, string>): number {
  let score = 0;
  
  // Fallback standard calculation - doesn't use templates
  // This calculation simply sums up any numeric values in the data
  Object.keys(data).forEach(key => {
    const value = parseInt(data[key]);
    if (!isNaN(value)) {
      score += value;
    }
  });
  
  return score;
}

// Helper function to determine risk profile from score
function determineRiskProfile(score: number): string {
  if (score < 52) {
    return riskProfiles[0]; // Capital Preservation
  } else if (score < 84) {
    return riskProfiles[1]; // Conservative
  } else if (score < 119) {
    return riskProfiles[2]; // Conservative Balanced
  } else if (score < 204) {
    return riskProfiles[3]; // Balanced
  } else if (score < 239) {
    return riskProfiles[4]; // Balanced Growth
  } else if (score < 270) {
    return riskProfiles[5]; // Growth
  } else {
    return riskProfiles[6]; // Aggressive Growth
  }
}

// Helper function to send email notification when questionnaire is completed
// This function would be used to notify admins when a client completes a questionnaire
async function sendQuestionnaireCompletionNotification(client: any, section: string): Promise<void> {
  console.log(`Questionnaire completed: ${section} by client ${client.name} (${client.clientNumber})`);
  
  // If we have SendGrid configured, send an actual email
  try {
    await sendQuestionnaireCompletionEmail(client, section);
  } catch (error) {
    console.error("Failed to send email notification:", error);
  }
}
