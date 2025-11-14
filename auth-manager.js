#!/usr/bin/env node
// Google OAuth Authentication Module for Atoms Ninja
// Collects user info and restricts access to authenticated users

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { OAuth2Client } = require('google-auth-library');

class GoogleAuthManager {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
    this.client = new OAuth2Client(this.clientId, this.clientSecret, this.redirectUri);
    this.sessionStore = new Map(); // In production, use Redis or database
  }

  // Generate authentication URL
  getAuthUrl() {
    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      prompt: 'consent'
    });
  }

  // Exchange authorization code for tokens
  async getTokens(code) {
    const { tokens } = await this.client.getToken(code);
    this.client.setCredentials(tokens);
    return tokens;
  }

  // Get user information
  async getUserInfo(accessToken) {
    const ticket = await this.client.verifyIdToken({
      idToken: accessToken,
      audience: this.clientId
    });
    return ticket.getPayload();
  }

  // Middleware to protect routes
  requireAuth(req, res, next) {
    if (!req.session.user) {
      return res.status(401).json({
        error: 'Authentication required',
        loginUrl: '/auth/google'
      });
    }
    next();
  }

  // Store user data
  async storeUser(userData) {
    const user = {
      id: userData.sub,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      emailVerified: userData.email_verified,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    
    this.sessionStore.set(user.id, user);
    return user;
  }

  // Get stored users
  getUsers() {
    return Array.from(this.sessionStore.values());
  }
}

// Express middleware setup
function setupAuthRoutes(app, authManager) {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'atoms-ninja-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Start authentication flow
  app.get('/auth/google', (req, res) => {
    const authUrl = authManager.getAuthUrl();
    res.redirect(authUrl);
  });

  // OAuth callback
  app.get('/auth/google/callback', async (req, res) => {
    try {
      const { code } = req.query;
      
      if (!code) {
        return res.status(400).json({ error: 'Authorization code missing' });
      }

      // Exchange code for tokens
      const tokens = await authManager.getTokens(code);
      
      // Get user info
      const userInfo = await authManager.getUserInfo(tokens.id_token);
      
      // Store user
      const user = await authManager.storeUser(userInfo);
      
      // Set session
      req.session.user = user;
      req.session.tokens = tokens;
      
      // Redirect to main app
      res.redirect('/?auth=success');
      
    } catch (error) {
      console.error('Auth error:', error);
      res.redirect('/?auth=error');
    }
  });

  // Get current user
  app.get('/auth/user', (req, res) => {
    if (req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  // Logout
  app.post('/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out' });
  });

  // Admin: List all users (protected)
  app.get('/auth/users', authManager.requireAuth.bind(authManager), (req, res) => {
    const users = authManager.getUsers();
    res.json({ count: users.length, users });
  });

  // Check authentication status
  app.get('/auth/status', (req, res) => {
    res.json({
      authenticated: !!req.session.user,
      user: req.session.user || null
    });
  });
}

module.exports = { GoogleAuthManager, setupAuthRoutes };
