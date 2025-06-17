import { 
  clients, type Client, type InsertClient,
  questionnaires, type Questionnaire, type InsertQuestionnaire,
  admins, type Admin, type InsertAdmin,
  RiskToleranceData, ClientUpdateData, InvestmentPolicyData
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, desc } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

import { QuestionTemplate } from "@shared/schema";

export interface IStorage {
  // Client methods
  getClient(id: number): Promise<Client | undefined>;
  getClientByClientNumber(clientNumber: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, data: Partial<Client>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  getAllClients(): Promise<Client[]>;
  
  // Questionnaire methods
  getQuestionnaire(id: number): Promise<Questionnaire | undefined>;
  getQuestionnairesByClientId(clientId: number): Promise<Questionnaire[]>;
  // Get most recent questionnaire for a client/section
  getQuestionnaireByClientAndSection(clientId: number, section: string): Promise<Questionnaire | undefined>;
  // Get all versions of a questionnaire for a client/section
  getQuestionnaireHistoryByClientAndSection(clientId: number, section: string): Promise<Questionnaire[]>;
  createQuestionnaire(questionnaire: InsertQuestionnaire): Promise<Questionnaire>;
  updateQuestionnaire(id: number, data: Partial<Questionnaire>): Promise<Questionnaire | undefined>;
  
  // Admin methods
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdmin(id: number, data: Partial<Admin>): Promise<Admin | undefined>;
  checkPasswordExpiration(admin: Admin): Promise<boolean>;
  
  // Question Template methods
  getQuestionTemplate(id: string): Promise<QuestionTemplate | undefined>;
  getQuestionTemplateBySection(section: string): Promise<QuestionTemplate | undefined>;
  // Get specific version of a template
  getQuestionTemplateVersion(section: string, version: number): Promise<QuestionTemplate | undefined>;
  // Get all versions of a template
  getQuestionTemplateHistory(section: string): Promise<QuestionTemplate[]>;
  createQuestionTemplate(template: QuestionTemplate): Promise<QuestionTemplate>;
  updateQuestionTemplate(id: string, template: QuestionTemplate): Promise<QuestionTemplate | undefined>;
  deleteQuestionTemplate(id: string): Promise<boolean>;
  getAllQuestionTemplates(): Promise<QuestionTemplate[]>;
  getLatestTemplateVersion(section: string): Promise<number>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private clients: Map<number, Client>;
  private questionnaires: Map<number, Questionnaire>;
  private admins: Map<number, Admin>;
  private questionTemplates: Map<string, QuestionTemplate>;
  private templateVersions: Map<string, QuestionTemplate[]>;
  public sessionStore: any; // Using any for session.SessionStore to avoid type issues
  private clientIdCounter: number;
  private questionnaireIdCounter: number;
  private adminIdCounter: number;

  constructor() {
    this.clients = new Map();
    this.questionnaires = new Map();
    this.admins = new Map();
    this.questionTemplates = new Map();
    this.templateVersions = new Map();
    this.clientIdCounter = 1;
    this.questionnaireIdCounter = 1;
    this.adminIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Create the default Northern Light Wealth admin with plain-text password
    const adminId = this.adminIdCounter++;
    const now = new Date();
    const defaultAdmin: Admin = {
      id: adminId,
      name: "Northern Light Wealth Admin",
      username: "NLWAdmin",
      // Plain text password for testing
      password: "NLWAdmin2023!",
      lastPasswordChange: now,
      passwordExpired: false
    };
    this.admins.set(adminId, defaultAdmin);
  }

  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientByClientNumber(clientNumber: string): Promise<Client | undefined> {
    for (const client of this.clients.values()) {
      if (client.clientNumber === clientNumber) {
        return client;
      }
    }
    return undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const id = this.clientIdCounter++;
    // Generate name from firstName and lastName
    const name = `${client.firstName} ${client.lastName}`;
    const newClient: Client = {
      ...client,
      name, // Set the name field explicitly
      id,
      createdAt: new Date()
    };
    this.clients.set(id, newClient);
    return newClient;
  }
  
  async updateClient(id: number, data: Partial<Client>): Promise<Client | undefined> {
    const existing = this.clients.get(id);
    if (!existing) return undefined;
    
    const updated: Client = {
      ...existing,
      ...data
    };
    this.clients.set(id, updated);
    return updated;
  }
  
  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }
  
  async deleteClient(id: number): Promise<boolean> {
    // First check if the client exists
    if (!this.clients.has(id)) {
      return false;
    }
    
    // Delete all questionnaires associated with this client
    for (const [questionnaireId, questionnaire] of this.questionnaires.entries()) {
      if (questionnaire.clientId === id) {
        this.questionnaires.delete(questionnaireId);
      }
    }
    
    // Finally delete the client
    return this.clients.delete(id);
  }

  // Questionnaire methods
  async getQuestionnaire(id: number): Promise<Questionnaire | undefined> {
    return this.questionnaires.get(id);
  }

  async getQuestionnairesByClientId(clientId: number): Promise<Questionnaire[]> {
    const results: Questionnaire[] = [];
    for (const questionnaire of this.questionnaires.values()) {
      if (questionnaire.clientId === clientId) {
        results.push(questionnaire);
      }
    }
    return results;
  }

  async getQuestionnaireByClientAndSection(
    clientId: number, 
    section: string
  ): Promise<Questionnaire | undefined> {
    // Get all questionnaires for this client and section
    const questionnaires = await this.getQuestionnaireHistoryByClientAndSection(clientId, section);
    
    // If there are no questionnaires, return undefined
    if (questionnaires.length === 0) {
      return undefined;
    }
    
    // Sort by createdAt date (descending) and return the most recent one
    return questionnaires.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })[0];
  }
  
  async getQuestionnaireHistoryByClientAndSection(
    clientId: number, 
    section: string
  ): Promise<Questionnaire[]> {
    const results: Questionnaire[] = [];
    for (const questionnaire of this.questionnaires.values()) {
      if (questionnaire.clientId === clientId && questionnaire.section === section) {
        results.push(questionnaire);
      }
    }
    
    // Sort by createdAt date (newest first)
    return results.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async createQuestionnaire(questionnaire: InsertQuestionnaire): Promise<Questionnaire> {
    const id = this.questionnaireIdCounter++;
    const now = new Date();
    const newQuestionnaire: Questionnaire = {
      ...questionnaire,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.questionnaires.set(id, newQuestionnaire);
    return newQuestionnaire;
  }

  async updateQuestionnaire(
    id: number, 
    data: Partial<Questionnaire>
  ): Promise<Questionnaire | undefined> {
    const existing = this.questionnaires.get(id);
    if (!existing) return undefined;

    const updated: Questionnaire = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };
    this.questionnaires.set(id, updated);
    return updated;
  }

  // Admin methods
  async getAdmin(id: number): Promise<Admin | undefined> {
    return this.admins.get(id);
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    for (const admin of this.admins.values()) {
      if (admin.username === username) {
        return admin;
      }
    }
    return undefined;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const id = this.adminIdCounter++;
    const now = new Date();
    const newAdmin: Admin = {
      ...admin,
      id,
      lastPasswordChange: now,
      passwordExpired: false
    };
    this.admins.set(id, newAdmin);
    return newAdmin;
  }
  
  async updateAdmin(id: number, data: Partial<Admin>): Promise<Admin | undefined> {
    const existing = this.admins.get(id);
    if (!existing) return undefined;
    
    const updated: Admin = {
      ...existing,
      ...data
    };
    this.admins.set(id, updated);
    return updated;
  }
  
  async checkPasswordExpiration(admin: Admin): Promise<boolean> {
    if (admin.passwordExpired) return true;
    
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // If lastPasswordChange is older than 6 months, mark as expired
    if (admin.lastPasswordChange && admin.lastPasswordChange < sixMonthsAgo) {
      const updated = { ...admin, passwordExpired: true };
      this.admins.set(admin.id, updated);
      return true;
    }
    
    return false;
  }

  // Question Template methods
  async getQuestionTemplate(id: string): Promise<QuestionTemplate | undefined> {
    return this.questionTemplates.get(id);
  }

  async getQuestionTemplateBySection(section: string): Promise<QuestionTemplate | undefined> {
    for (const template of this.questionTemplates.values()) {
      if (template.id === section) {
        return template;
      }
    }
    return undefined;
  }

  async createQuestionTemplate(template: QuestionTemplate): Promise<QuestionTemplate> {
    // Set creation date if not provided
    if (!template.createdAt) {
      template.createdAt = new Date();
    }
    
    // Initialize with version 1 if not specified
    if (!template.version) {
      template.version = 1;
    }
    
    // Save to active templates
    this.questionTemplates.set(template.id, template);
    
    // Add to version history
    if (!this.templateVersions.has(template.id)) {
      this.templateVersions.set(template.id, []);
    }
    this.templateVersions.get(template.id)?.push({...template});
    
    return template;
  }

  async updateQuestionTemplate(id: string, template: QuestionTemplate): Promise<QuestionTemplate | undefined> {
    if (!this.questionTemplates.has(id)) {
      return undefined;
    }
    
    // Get the current version number
    const currentVersion = await this.getLatestTemplateVersion(id);
    
    // Create a new version with incremented version number
    const newTemplate = {
      ...template,
      version: currentVersion + 1,
      createdAt: new Date()
    };
    
    // Update active template
    this.questionTemplates.set(id, newTemplate);
    
    // Add to version history
    if (!this.templateVersions.has(id)) {
      this.templateVersions.set(id, []);
    }
    this.templateVersions.get(id)?.push({...newTemplate});
    
    return newTemplate;
  }

  async deleteQuestionTemplate(id: string): Promise<boolean> {
    return this.questionTemplates.delete(id);
  }

  async getAllQuestionTemplates(): Promise<QuestionTemplate[]> {
    return Array.from(this.questionTemplates.values());
  }
  
  // Version tracking methods
  async getQuestionTemplateVersion(section: string, version: number): Promise<QuestionTemplate | undefined> {
    const versionHistory = this.templateVersions.get(section) || [];
    return versionHistory.find(template => template.version === version);
  }
  
  async getQuestionTemplateHistory(section: string): Promise<QuestionTemplate[]> {
    return this.templateVersions.get(section) || [];
  }
  
  async getLatestTemplateVersion(section: string): Promise<number> {
    // Get current active template
    const currentTemplate = await this.getQuestionTemplateBySection(section);
    if (currentTemplate) {
      return currentTemplate.version;
    }
    
    // Check version history
    const versionHistory = this.templateVersions.get(section) || [];
    if (versionHistory.length > 0) {
      // Sort by version number (descending) and return the highest
      const sortedVersions = [...versionHistory].sort((a, b) => b.version - a.version);
      return sortedVersions[0].version;
    }
    
    // No template found, return 0
    return 0;
  }
}

export class DatabaseStorage implements IStorage {
  public sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientByClientNumber(clientNumber: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.clientNumber, clientNumber));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    // Generate name from firstName 
    const clientData = {
      ...client,
      name: client.firstName,
    };
    const [newClient] = await db.insert(clients).values(clientData).returning();
    return newClient;
  }

  async updateClient(id: number, data: Partial<Client>): Promise<Client | undefined> {
    const [updated] = await db
      .update(clients)
      .set(data)
      .where(eq(clients.id, id))
      .returning();
    return updated;
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async deleteClient(id: number): Promise<boolean> {
    try {
      // First delete all associated questionnaires
      await db.delete(questionnaires).where(eq(questionnaires.clientId, id));
      
      // Then delete the client
      const result = await db.delete(clients).where(eq(clients.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting client:', error);
      return false;
    }
  }

  // Questionnaire methods
  async getQuestionnaire(id: number): Promise<Questionnaire | undefined> {
    const [questionnaire] = await db.select().from(questionnaires).where(eq(questionnaires.id, id));
    return questionnaire;
  }

  async getQuestionnairesByClientId(clientId: number): Promise<Questionnaire[]> {
    return await db.select().from(questionnaires).where(eq(questionnaires.clientId, clientId));
  }

  async getQuestionnaireByClientAndSection(clientId: number, section: string): Promise<Questionnaire | undefined> {
    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .where(and(
        eq(questionnaires.clientId, clientId),
        eq(questionnaires.section, section)
      ))
      .orderBy(desc(questionnaires.createdAt))
      .limit(1);
    return questionnaire;
  }

  async getQuestionnaireHistoryByClientAndSection(clientId: number, section: string): Promise<Questionnaire[]> {
    return await db
      .select()
      .from(questionnaires)
      .where(and(
        eq(questionnaires.clientId, clientId),
        eq(questionnaires.section, section)
      ))
      .orderBy(desc(questionnaires.createdAt));
  }

  async createQuestionnaire(questionnaire: InsertQuestionnaire): Promise<Questionnaire> {
    const [newQuestionnaire] = await db.insert(questionnaires).values(questionnaire).returning();
    return newQuestionnaire;
  }

  async updateQuestionnaire(id: number, data: Partial<Questionnaire>): Promise<Questionnaire | undefined> {
    const [updated] = await db
      .update(questionnaires)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(questionnaires.id, id))
      .returning();
    return updated;
  }

  // Admin methods
  async getAdmin(id: number): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const adminData = {
      ...admin,
      lastPasswordChange: new Date(),
      passwordExpired: false
    };
    const [newAdmin] = await db.insert(admins).values(adminData).returning();
    return newAdmin;
  }

  async updateAdmin(id: number, data: Partial<Admin>): Promise<Admin | undefined> {
    const [updated] = await db
      .update(admins)
      .set(data)
      .where(eq(admins.id, id))
      .returning();
    return updated;
  }

  async checkPasswordExpiration(admin: Admin): Promise<boolean> {
    if (admin.passwordExpired) return true;
    
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // If lastPasswordChange is older than 6 months, mark as expired
    if (admin.lastPasswordChange && admin.lastPasswordChange < sixMonthsAgo) {
      await this.updateAdmin(admin.id, { passwordExpired: true });
      return true;
    }
    
    return false;
  }

  // Question Template methods - these will need to be implemented with a different approach
  // as they store complex JSON data that doesn't have a specific table
  // For now, we'll use the existing in-memory implementation for templates
  private questionTemplates: Map<string, QuestionTemplate> = new Map();
  private templateVersions: Map<string, QuestionTemplate[]> = new Map();

  async getQuestionTemplate(id: string): Promise<QuestionTemplate | undefined> {
    return this.questionTemplates.get(id);
  }

  async getQuestionTemplateBySection(section: string): Promise<QuestionTemplate | undefined> {
    for (const template of this.questionTemplates.values()) {
      if (template.id === section) {
        return template;
      }
    }
    return undefined;
  }

  async createQuestionTemplate(template: QuestionTemplate): Promise<QuestionTemplate> {
    // Set creation date if not provided
    if (!template.createdAt) {
      template.createdAt = new Date();
    }
    
    // Initialize with version 1 if not specified
    if (!template.version) {
      template.version = 1;
    }
    
    // Save to active templates
    this.questionTemplates.set(template.id, template);
    
    // Add to version history
    if (!this.templateVersions.has(template.id)) {
      this.templateVersions.set(template.id, []);
    }
    this.templateVersions.get(template.id)?.push({...template});
    
    return template;
  }

  async updateQuestionTemplate(id: string, template: QuestionTemplate): Promise<QuestionTemplate | undefined> {
    if (!this.questionTemplates.has(id)) {
      return undefined;
    }
    
    // Get the current version number
    const currentVersion = await this.getLatestTemplateVersion(id);
    
    // Create a new version with incremented version number
    const newTemplate = {
      ...template,
      version: currentVersion + 1,
      createdAt: new Date()
    };
    
    // Update active template
    this.questionTemplates.set(id, newTemplate);
    
    // Add to version history
    if (!this.templateVersions.has(id)) {
      this.templateVersions.set(id, []);
    }
    this.templateVersions.get(id)?.push({...newTemplate});
    
    return newTemplate;
  }

  async deleteQuestionTemplate(id: string): Promise<boolean> {
    return this.questionTemplates.delete(id);
  }

  async getAllQuestionTemplates(): Promise<QuestionTemplate[]> {
    return Array.from(this.questionTemplates.values());
  }
  
  // Version tracking methods
  async getQuestionTemplateVersion(section: string, version: number): Promise<QuestionTemplate | undefined> {
    const versionHistory = this.templateVersions.get(section) || [];
    return versionHistory.find(template => template.version === version);
  }
  
  async getQuestionTemplateHistory(section: string): Promise<QuestionTemplate[]> {
    return this.templateVersions.get(section) || [];
  }
  
  async getLatestTemplateVersion(section: string): Promise<number> {
    // Get current active template
    const currentTemplate = await this.getQuestionTemplateBySection(section);
    if (currentTemplate) {
      return currentTemplate.version;
    }
    
    // Check version history
    const versionHistory = this.templateVersions.get(section) || [];
    if (versionHistory.length > 0) {
      // Sort by version number (descending) and return the highest
      const sortedVersions = [...versionHistory].sort((a, b) => b.version - a.version);
      return sortedVersions[0].version;
    }
    
    // No template found, return 0
    return 0;
  }
}

// Use database storage for persistence across deployments
export const storage = new DatabaseStorage();
