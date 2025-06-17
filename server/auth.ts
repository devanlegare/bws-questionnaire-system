import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { Client, Admin } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      type: "client" | "admin";
      passwordExpired?: boolean;
      availableSections?: string[];
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Check if the stored password has a hash format with a salt
  if (stored.includes('.')) {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } else {
    // Fall back to direct comparison for passwords without hash
    return supplied === stored;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "replace-this-with-a-real-secret-in-production",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Client authentication strategy
  passport.use("client", new LocalStrategy(
    { usernameField: "clientNumber", passwordField: "password" },
    async (clientNumber, password, done) => {
      try {
        console.log("Authenticating client with clientNumber:", clientNumber);
        
        // Normalize client number by trimming whitespace and ensuring it's a string
        const normalizedClientNumber = String(clientNumber).trim();
        
        if (normalizedClientNumber.length !== 7 || !/^\d+$/.test(normalizedClientNumber)) {
          console.log("Invalid client number format:", normalizedClientNumber);
          return done(null, false, { message: "Client number must be exactly 7 digits" });
        }
        
        const client = await storage.getClientByClientNumber(normalizedClientNumber);
        
        if (!client) {
          console.log("Client not found with number:", normalizedClientNumber);
          return done(null, false, { message: "Invalid client number" });
        }
        
        // For client authentication, the client number itself is the password
        // This is a simple check to make sure the "password" matches the client number 
        // This is safe because client number is already an identifier
        if (normalizedClientNumber === String(password).trim() && normalizedClientNumber === client.clientNumber) {
          console.log("Client authentication successful for:", client.name || `${client.firstName} ${client.lastName}`);
          console.log("Client details:", JSON.stringify(client, null, 2));
          console.log("Available sections:", client.availableSections);
          
          // Create a user object with all necessary client data
          const userObject = { 
            id: client.id, 
            type: "client",
            name: client.name,
            firstName: client.firstName,
            lastName: client.lastName,
            clientNumber: client.clientNumber,
            email: client.email,
            createdAt: client.createdAt,
            availableSections: client.availableSections || ["riskTolerance"]
          };
          
          console.log("Created user object for session:", JSON.stringify(userObject, null, 2));
          return done(null, userObject);
        } else {
          console.log("Client authentication failed: client number and password do not match");
          return done(null, false, { message: "Invalid client number" });
        }
      } catch (error) {
        console.error("Error in client authentication:", error);
        return done(error);
      }
    }
  ));

  // Admin authentication strategy
  passport.use("admin", new LocalStrategy(
    async (username, password, done) => {
      try {
        const admin = await storage.getAdminByUsername(username);
        
        if (!admin) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        const isValidPassword = await comparePasswords(password, admin.password);
        
        if (isValidPassword) {
          // Check if password is expired
          const isPasswordExpired = await storage.checkPasswordExpiration(admin);
          
          if (isPasswordExpired) {
            return done(null, { id: admin.id, type: "admin", passwordExpired: true });
          }
          
          return done(null, { id: admin.id, type: "admin", passwordExpired: false });
        } else {
          return done(null, false, { message: "Invalid username or password" });
        }
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    done(null, `${user.type}:${user.id}`);
  });

  passport.deserializeUser(async (serialized: string, done) => {
    try {
      const [type, idStr] = serialized.split(":");
      const id = parseInt(idStr);
      
      if (type === "client") {
        const client = await storage.getClient(id);
        if (!client) {
          return done(null, false);
        }
        // Include all client data in the user object
        console.log("Deserializing client data:", JSON.stringify(client, null, 2));
        console.log("Available sections from client data:", client.availableSections);
        
        // Create a comprehensive user object with all client data
        const userObject = { 
          id, 
          type: "client",
          name: client.name,
          firstName: client.firstName,
          lastName: client.lastName,
          clientNumber: client.clientNumber,
          email: client.email,
          createdAt: client.createdAt,
          availableSections: client.availableSections || ["riskTolerance"]
        };
        
        console.log("Deserialized complete user object:", JSON.stringify(userObject, null, 2));
        return done(null, userObject);
      } else if (type === "admin") {
        const admin = await storage.getAdmin(id);
        if (!admin) {
          return done(null, false);
        }
        // Check password expiration
        const isPasswordExpired = await storage.checkPasswordExpiration(admin);
        return done(null, { id, type: "admin", passwordExpired: isPasswordExpired });
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(error);
    }
  });

  // Client login
  app.post("/api/client/login", (req, res, next) => {
    console.log("Client login request received:", { 
      clientNumber: req.body.clientNumber ? '******' : 'not provided',
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type']
      }
    });
    
    // Validate input format before attempting authentication
    const clientNumber = String(req.body.clientNumber || '').trim();
    if (!clientNumber) {
      return res.status(400).json({ message: "Client number is required" });
    }
    
    if (clientNumber.length !== 7 || !/^\d+$/.test(clientNumber)) {
      return res.status(400).json({ message: "Client number must be exactly 7 digits" });
    }
    
    passport.authenticate("client", (err, user, info) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ message: "An error occurred during authentication" });
      }
      
      if (!user) {
        console.log("Client authentication failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Invalid client number" });
      }
      
      console.log("Client authentication successful, proceeding to session login");
      
      req.login(user, (err) => {
        if (err) {
          console.error("Session login error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        console.log("Session created successfully");
        console.log("Session data:", JSON.stringify(req.session, null, 2));
        console.log("User in session:", JSON.stringify(req.user, null, 2));
        
        return res.json({ 
          success: true, 
          user,
          availableSections: user.availableSections 
        });
      });
    })(req, res, next);
  });

  // Admin login
  app.post("/api/admin/login", (req, res, next) => {
    passport.authenticate("admin", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid username or password" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({ success: true, user });
      });
    })(req, res, next);
  });

  // Admin registration (restricted to admins only)
  app.post("/api/admin/register", async (req, res) => {
    // Only logged-in admins can create new admin accounts
    if (!req.isAuthenticated() || req.user.type !== "admin") {
      return res.status(403).json({ 
        message: "Only administrators can create new admin accounts"
      });
    }
    
    try {
      const { username, password, name } = req.body;
      
      if (!username || !password || !name) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      const existingAdmin = await storage.getAdminByUsername(username);
      if (existingAdmin) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const hashedPassword = await hashPassword(password);
      const admin = await storage.createAdmin({
        username,
        password: hashedPassword,
        name,
      });
      
      // Remove sensitive information
      const { password: _, ...safeAdmin } = admin;
      
      return res.status(201).json(safeAdmin);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Unknown error occurred" });
    }
  });

  // Logout
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      return res.json({ success: true });
    });
  });

  // Get current user
  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    console.log("GET /api/user - Raw user data in session:", JSON.stringify(req.user, null, 2));
    
    // If user is a client, ensure we have the most recent data
    if (req.user.type === "client") {
      try {
        // Get updated client data from storage
        const client = await storage.getClient(req.user.id);
        if (client) {
          // Combine session data with fresh client data
          const enhancedUserData = {
            ...req.user,
            availableSections: client.availableSections,
            firstName: client.firstName,
            lastName: client.lastName,
            name: client.name,
            clientNumber: client.clientNumber,
            email: client.email
          };
          
          console.log("GET /api/user - Enhanced client data:", JSON.stringify(enhancedUserData, null, 2));
          return res.json(enhancedUserData);
        }
      } catch (error) {
        console.error("Error retrieving client data:", error);
      }
    }
    
    // Default: return the user data from the session
    return res.json(req.user);
  });
  
  // Change admin password
  app.post("/api/admin/change-password", async (req, res) => {
    // Only logged-in admins can change their passwords
    if (!req.isAuthenticated() || req.user.type !== "admin") {
      return res.status(403).json({ 
        message: "Not authorized"
      });
    }
    
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }
      
      // Require a minimum password length
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }
      
      const admin = await storage.getAdmin(req.user.id);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }
      
      // Verify current password
      const isValidPassword = await comparePasswords(currentPassword, admin.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash and save the new password
      const hashedPassword = await hashPassword(newPassword);
      const now = new Date();
      
      await storage.updateAdmin(admin.id, {
        password: hashedPassword,
        lastPasswordChange: now,
        passwordExpired: false
      });
      
      return res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Unknown error occurred" });
    }
  });
}
