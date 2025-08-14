import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthUserModel } from "@shared/mongodb-schema";
import type { AuthUser, InsertAuthUser } from "@shared/mongodb-schema";

// Extend the session type
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    user?: {
      id: string;
      email: string;
      username: string;
      avatar?: string;
    };
  }
}

// Validation schemas
const signupSchema = z.object({
  email: z.string().email("Invalid email format"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// Helper function to convert Mongo user to safe user object
const toSafeUser = (user: any) => ({
  id: user._id.toString(),
  email: user.email,
  username: user.username,
  avatar: user.avatar,
  createdAt: user.createdAt,
  lastLogin: user.lastLogin,
});

export function registerAuthRoutes(app: Express) {
  // Sign up route
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const validatedData = signupSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await AuthUserModel.findOne({ email: validatedData.email });
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 12);

      // Create user
      const newUser = new AuthUserModel({
        email: validatedData.email,
        username: validatedData.username,
        password: hashedPassword,
      });

      const savedUser = await newUser.save();

      // Set session
      req.session.userId = savedUser._id.toString();
      req.session.user = {
        id: savedUser._id.toString(),
        email: savedUser.email,
        username: savedUser.username,
        avatar: savedUser.avatar,
      };

      res.status(201).json({
        user: toSafeUser(savedUser),
        message: "Account created successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  // Login route
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      // Find user
      const user = await AuthUserModel.findOne({ email: validatedData.email });
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Set session
      req.session.userId = user._id.toString();
      req.session.user = {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        avatar: user.avatar,
      };

      res.json({
        user: toSafeUser(user),
        message: "Logged in successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout route
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user route
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const user = await AuthUserModel.findById(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "User not found" });
      }

      res.json({ user: toSafeUser(user) });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  // Update profile route
  app.put("/api/auth/profile", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { username, avatar } = req.body;
      
      if (username && username.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }

      const updateData: any = {};
      if (username) updateData.username = username;
      if (avatar !== undefined) updateData.avatar = avatar;

      const updatedUser = await AuthUserModel.findByIdAndUpdate(
        req.session.userId,
        updateData,
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update session
      req.session.user = {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        username: updatedUser.username,
        avatar: updatedUser.avatar,
      };

      res.json({
        user: toSafeUser(updatedUser),
        message: "Profile updated successfully"
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Find user by email route (for sharing)
  app.get("/api/auth/users/search", requireAuth, async (req: Request, res: Response) => {
    try {
      const { email } = req.query;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email parameter is required" });
      }

      const user = await AuthUserModel.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        user: {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          avatar: user.avatar,
        }
      });
    } catch (error) {
      console.error("User search error:", error);
      res.status(500).json({ error: "Failed to search for user" });
    }
  });
}

// Middleware to check authentication
export function requireAuth(req: Request, res: Response, next: any) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Middleware to get current user (optional)
export function getCurrentUser(req: Request, res: Response, next: any) {
  res.locals.user = req.session.user || null;
  next();
}