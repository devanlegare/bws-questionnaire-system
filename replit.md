# Risk Tolerance Assessment System

## Overview

This is a full-stack web application built for Northern Light Wealth Inc. to manage client risk tolerance assessments and questionnaires. The system provides a secure platform for clients to complete financial assessments and for administrators to manage client data and questionnaire templates.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Library**: Radix UI components with Tailwind CSS for styling
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js
- **Language**: TypeScript with ES modules
- **Session Management**: Express sessions with PostgreSQL store
- **Authentication**: Passport.js with local strategy
- **Password Security**: Node.js crypto with scrypt hashing

### Data Storage Solutions
- **Primary Database**: PostgreSQL 16 via Neon serverless
- **ORM**: Drizzle ORM for type-safe database operations
- **Session Store**: PostgreSQL-backed session storage
- **File Storage**: Local file system for CSV uploads and templates

## Key Components

### Authentication System
- **Dual Authentication**: Separate login flows for clients (7-digit number) and administrators (username/password)
- **Session-based Security**: Secure HTTP-only cookies with PostgreSQL session store
- **Role-based Access**: Different permissions for clients vs administrators

### Questionnaire System
- **Dynamic Templates**: CSV-uploadable questionnaire templates with versioning
- **Multi-section Support**: Risk Tolerance, Client Update, and Investment Policy sections
- **Real-time Validation**: Client-side and server-side validation with Zod schemas
- **Progress Tracking**: Section completion status and navigation

### Admin Management
- **Client Management**: CRUD operations for client accounts with CSV bulk import
- **Template Management**: Upload, version, and activate questionnaire templates
- **Data Export**: CSV export functionality for questionnaire responses
- **Direct Section Links**: JWT-based secure links for specific questionnaire sections

### Email Integration
- **SendGrid Integration**: Automated notifications for questionnaire completion
- **Configurable Recipients**: Customizable admin email notifications

## Data Flow

1. **Client Authentication**: Client enters 7-digit number → Server validates → Session created
2. **Questionnaire Access**: Client selects section → Template fetched → Dynamic form rendered
3. **Response Submission**: Form data validated → Stored in database → Email notification sent
4. **Admin Operations**: Admin login → Access management interface → Perform CRUD operations

## External Dependencies

### Production Dependencies
- **Database**: @neondatabase/serverless for PostgreSQL connection
- **UI Components**: Complete Radix UI component suite
- **Authentication**: passport, passport-local, express-session
- **Email**: @sendgrid/mail for notifications
- **File Processing**: csv-parse for template uploads
- **Validation**: zod for schema validation
- **HTTP Client**: TanStack Query for API communication

### Development Dependencies
- **Build Tools**: Vite, esbuild, TypeScript compiler
- **Development Server**: tsx for TypeScript execution
- **Database Tools**: drizzle-kit for migrations

## Deployment Strategy

### Environment Configuration
- **Development**: Local development with hot reload via Vite
- **Production**: Node.js server with pre-built static assets
- **Database**: Neon PostgreSQL with connection pooling
- **Sessions**: PostgreSQL-backed session store for scalability

### Build Process
1. Frontend assets built with Vite
2. Backend compiled with esbuild
3. Database schema deployed with Drizzle
4. Environment variables configured for database and email

### Security Considerations
- Secure session management with HTTP-only cookies
- Password hashing with crypto.scrypt
- Input validation on both client and server
- CORS and security headers configured

## Changelog

- June 16, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.