import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Client table - stores client information and passcode
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  clientNumber: text("client_number").notNull().unique(),
  firstName: text("first_name").notNull(),
  name: text("name").notNull(),
  availableSections: text("available_sections").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// Section types
export const sectionTypes = ["riskTolerance", "clientUpdate", "investmentPolicy"] as const;
export type SectionType = typeof sectionTypes[number];

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  name: true, // We'll generate this from firstName
});

// Updated client form schema with required fields
export const clientFormSchema = insertClientSchema.extend({
  clientNumber: z.string()
    .length(7, "Client number must be exactly 7 digits")
    .regex(/^\d+$/, "Client number must contain only digits"),
  firstName: z.string().min(1, "First name is required"),
  availableSections: z.array(z.enum(sectionTypes)).default([])
});

// Risk tolerance levels
export const riskProfiles = [
  "Capital Preservation",
  "Conservative",
  "Conservative Balanced",
  "Balanced",
  "Balanced Growth",
  "Growth",
  "Aggressive Growth"
] as const;
export type RiskProfile = typeof riskProfiles[number];

// Questionnaires table - stores the questionnaire data
export const questionnaires = pgTable("questionnaires", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  section: text("section").notNull(),
  completed: boolean("completed").default(false),
  data: json("data"),
  score: integer("score"),
  riskProfile: text("risk_profile"),
  templateVersion: integer("template_version").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertQuestionnaireSchema = createInsertSchema(questionnaires).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Admin table - stores admin users who can create client accounts and view data
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  lastPasswordChange: timestamp("last_password_change").defaultNow(),
  passwordExpired: boolean("password_expired").default(false),
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  lastPasswordChange: true,
  passwordExpired: true,
});

// Question template schema
export const answerOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  value: z.number(),
});

export const questionSchema = z.object({
  id: z.string(),
  text: z.string(),
  options: z.array(answerOptionSchema),
});

export const questionTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  questions: z.array(questionSchema),
  version: z.number().default(1),
  createdAt: z.date().optional(),
});

export type AnswerOption = z.infer<typeof answerOptionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type QuestionTemplate = z.infer<typeof questionTemplateSchema>;

// Risk Tolerance Response Schema
export const riskToleranceResponseSchema = z.record(z.string(), z.string());
export type RiskToleranceData = z.infer<typeof riskToleranceResponseSchema>;

// Client Update Form Schema
export const clientUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  annualIncome: z.string(),
  liquidAssets: z.string(),
  retirementAssets: z.string(),
  otherAssets: z.string(),
  financialGoals: z.string(),
});

export type ClientUpdateData = z.infer<typeof clientUpdateSchema>;

// Investment Policy Form Schema
export const investmentPolicySchema = z.object({
  primaryObjective: z.string(),
  timeHorizon: z.string(),
  riskFactors: z.array(z.string()).optional(),
  equities: z.string(),
  fixedIncome: z.string(),
  alternatives: z.string(),
  cash: z.string(),
  reviewFrequency: z.string(),
  rebalancingStrategy: z.string(),
  additionalGuidelines: z.string().optional(),
});

export type InvestmentPolicyData = z.infer<typeof investmentPolicySchema>;

// Authentication schema
export const authClientSchema = z.object({
  clientNumber: z.string()
    .length(7, "Client number must be exactly 7 digits")
    .regex(/^\d+$/, "Client number must contain only digits"),
});

export type AuthClientData = z.infer<typeof authClientSchema>;

// Client section link schema
export const sectionLinkSchema = z.object({
  clientId: z.number(),
  section: z.enum(sectionTypes),
});

export type SectionLinkData = z.infer<typeof sectionLinkSchema>;

// Types
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Questionnaire = typeof questionnaires.$inferSelect;
export type InsertQuestionnaire = z.infer<typeof insertQuestionnaireSchema>;
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export const adminFormSchema = insertAdminSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
