//server.js ORIGINAL
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/Users');
const Report = require('./models/Report');
const Reported = require('./models/reported');
const OngoingReport = require('./models/OngoingReport');
const CancelledReport = require('./models/CancelledReport');
const Notification = require('./models/Notification');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const Cleanup = require('./models/Cleanup');
const Donation = require('./models/Donation');
const Schedule = require('./models/Schedule');
const RewardClaim = require('./models/RewardClaim');
const Message = require('./models/Chat');
const Follow = require('./models/Follow');
const CompletedReport = require('./models/CompletedReport');
const Responder = require('./models/Responder');
const axios = require('axios');
const { GoogleGenAI } = require("@google/genai");
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_only_for_dev';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET not set in environment variables!');
}
const OpenAI = require('openai');
// ============================================
// ENVIRONMENT VARIABLES VALIDATION
// ============================================

// Define BASE_URL at the top level
// Function to send verification email PARA SA MGA MEMBERS
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
// Validate critical environment variables
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'GEMINI_API_KEY',
  'EMAIL_USER',
  'EMAIL_PASS'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ CRITICAL: Missing required environment variables:');
  missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n⚠️ Server may not function correctly!');
  console.error('📝 Please check your .env file\n');
}

// Initialize OpenAI (if API key exists)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('✅ OpenAI initialized');
} else {
  console.warn('⚠️ WARNING: OPENAI_API_KEY not set - chatbot will use fallback responses');
}

const gemini = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY 
});

//CORS CONFIGURATIONS
const allowedOrigins = [
  'http://127.0.0.1:8081',
  'http://10.103.233.103:5000',
  'http://10.120.221.103:5000',
  'http://10.120.221.103:8081',
  'http://10.103.233.103:8081',
  'http://192.168.130.103',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:8081',
  'http://localhost:19000',
  'http://localhost:19001',
  'http://localhost:19002',
  'http://localhost:19006',
  'http://127.0.0.1:19000',
  'http://127.0.0.1:19006',
  'https://apk-blueguard-rosssyyy.onrender.com'
];


const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      console.log('✅ Request with no origin allowed');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS allowed for origin:', origin);
      callback(null, true);
    } else {
      console.log('⚠️ CORS origin not in whitelist, but allowing:', origin);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200
};


app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Origin:', req.headers.origin);
  console.log('Content-Type:', req.headers['content-type']);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// SA MONGODB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    
    if (!mongoURI) {
      throw new Error('MONGO_URI environment variable is not set');
    }
    console.log('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ Connected to MongoDB: ${conn.connection.host}`);
    console.log(`✅ Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ Error connecting to database: ${error.message}`);
    console.error('Full error:', error);
    process.exit(1);
  }
};

//MIDDLEWARE GAMIT JWT PARA PAG OWTENTEKEYT NG USER
const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ success: false, message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Check server status
app.get('/status', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running and connected!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Connection check endpoint
app.get('/connection-check', (req, res) => {
  res.status(200).json({ 
    success: true,
    message: 'Connection successful',
    serverTime: new Date().toISOString()
  });
});

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('⚠️ WARNING: Email credentials not set in environment variables!');
}


const sendVerificationEmail = async (email, token) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Email - Ocean Guardians',
    text: `Please verify your email by clicking the following link: ${BASE_URL}/verify-email?token=${token}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0A5EB0;">Welcome to Ocean Guardians!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <a href="${BASE_URL}/verify-email?token=${token}" 
           style="display: inline-block; padding: 12px 24px; background-color: #0A5EB0; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Verify Email
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666;">${BASE_URL}/verify-email?token=${token}</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent to:', email);
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw error;
  }
};
// Function to send verification email for responders
const sendResponderVerificationEmail = async (email, token) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Responder Account - Ocean Guardians',
    text: `Please verify your email by clicking the following link: ${BASE_URL}/verify-responder-email?token=${token}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0A5EB0;">Welcome to Ocean Guardians Responder Portal!</h2>
        <p>Thank you for registering as a responder. Please verify your email address by clicking the button below:</p>
        <a href="${BASE_URL}/verify-responder-email?token=${token}" 
           style="display: inline-block; padding: 12px 24px; background-color: #0A5EB0; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Verify Email
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666;">${BASE_URL}/verify-responder-email?token=${token}</p>
        <p style="margin-top: 30px; color: #999; font-size: 12px;">If you did not create this account, please ignore this email.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Responder verification email sent to:', email);
  } catch (error) {
    console.error('❌ Error sending responder verification email:', error);
    throw error;
  }
};

//-------------------------------------------------------------------------------------------------------------------------
//LOGIN AND RESGISTER FOR USER/MEMBER AND RESPONDERS
//---------------------------------------------------------------------------------------------------------------------------

// RESGISTER NG MEMBER

app.post('/register', async (req, res) => {
  console.log('=== REGISTRATION REQUEST START ===');
  console.log('Received registration request with:', req.body);

  const { name, email, password, gender } = req.body;

  if (!name || !email || !password || !gender) {
    console.log('Missing required fields');
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const validGenders = ['male', 'female', 'non-binary'];
  if (!validGenders.includes(gender)) {
    console.log('Invalid gender:', gender);
    return res.status(400).json({ success: false, message: 'Invalid gender selection' });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/;
  if (!passwordRegex.test(password)) {
    console.log('Password does not meet requirements');
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long, contain at least one uppercase letter, one lowercase letter, and one number.',
    });
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      console.error('Database not connected. Connection state:', mongoose.connection.readyState);
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection error. Please try again later.' 
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('User already exists:', email);
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();

    const newUser = new User({ 
      name, 
      email, 
      password: hashedPassword, 
      gender,
      verificationToken 
    });
    
    await newUser.save();

    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
    }

    console.log('=== REGISTRATION REQUEST SUCCESS ===');
    res.status(201).json({ 
      success: true, 
      message: 'Registered successfully! Please check your email to verify your account.' 
    });
  } catch (err) {
    console.error('=== REGISTRATION ERROR ===', err);
    
    let errorMessage = 'Server error during registration';
    if (err.code === 11000) {
      errorMessage = 'A user with this email already exists';
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage
    });
  }
});

// Verify Email Endpoint
app.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid token' });

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Email verified successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login Endpoint NG MEMBER
app.post('/login', async (req, res) => {
  console.log('=== LOGIN REQUEST ===');
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      console.log('Email not verified:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'Please verify your email before logging in.' 
      });
    }

    // CHECK IF ACCOUNT IS DEACTIVATED- DAPAT DI SYA MAG LOGIN
    if (user.status === 'deactivated') {
      console.log('⛔ Deactivated account login attempt:', email);
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been deactivated due to policy violations. Please contact admin support at roschelmaeanoos@gmail.com for assistance.',
        accountStatus: 'deactivated',
        supportEmail: 'roschelmaeanoos@gmail.com'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Incorrect password for:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'Incorrect password' 
      });
    }

    // Generate token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });

    console.log('✅ Login successful for:', email);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email,
        status: user.status || 'active'
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

//FOR RESPONDERS----------------------------
// Responder Registration Endpoint
app.post('/api/register-responder', async (req, res) => {
  console.log('=== RESPONDER REGISTRATION REQUEST START ===');
  console.log('Received responder registration request with:', req.body);

  const { responderType, fullName, email, password, confirmPassword } = req.body;

  if (!responderType || !fullName || !email || !password || !confirmPassword) {
    console.log('Missing required fields');
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    console.log('Passwords do not match');
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/;
  if (!passwordRegex.test(password)) {
    console.log('Password does not meet requirements');
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long, contain at least one uppercase letter, one lowercase letter, and one number.',
    });
  }

  const nameParts = fullName.trim().split(' ');
  if (nameParts.length < 2) {
    console.log('Full name validation failed');
    return res.status(400).json({ 
      success: false, 
      message: 'Please enter your full name (first and last name)' 
    });
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      console.error('Database not connected. Connection state:', mongoose.connection.readyState);
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection error. Please try again later.' 
      });
    }

    const responderExists = await Responder.findOne({ email });
    if (responderExists) {
      console.log('Responder already exists:', email);
      return res.status(400).json({ success: false, message: 'Responder with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();

    const newResponder = new Responder({ 
      responderType,
      fullName, 
      email, 
      password: hashedPassword,
      verificationToken,
      isVerified: false
    });
    
    await newResponder.save();

    try {
      await sendResponderVerificationEmail(email, verificationToken);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
    }

    console.log('=== RESPONDER REGISTRATION REQUEST SUCCESS ===');
    res.status(201).json({ 
      success: true, 
      message: 'Responder registered successfully! Please check your email to verify your account.' 
    });
  } catch (err) {
    console.error('=== RESPONDER REGISTRATION ERROR ===', err);
    
    let errorMessage = 'Server error during registration';
    if (err.code === 11000) {
      errorMessage = 'A responder with this email already exists';
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage
    });
  }
});

// Responder Login Endpoint - FIXED FOR WEB
app.post('/api/login-responder', async (req, res) => {
  console.log('=== RESPONDER LOGIN REQUEST ===');
  console.log('Login attempt for email:', req.body.email);
  console.log('Request headers:', req.headers);
  
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    console.log('Missing email or password');
    return res.status(400).json({ 
      success: false, 
      message: 'Email and password are required' 
    });
  }

  try {
    const responder = await Responder.findOne({ email });
    
    if (!responder) {
      console.log('Responder not found:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    console.log('Responder found:', {
      email: responder.email,
      responderType: responder.responderType,
      isVerified: responder.isVerified
    });

    if (!responder.isVerified) {
      console.log('Email not verified for:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'Please verify your email before logging in. Check your inbox for the verification link.' 
      });
    }

    const isMatch = await bcrypt.compare(password, responder.password);
    if (!isMatch) {
      console.log('Password mismatch for:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const token = jwt.sign(
      { 
        id: responder._id, 
        type: 'responder',
        responderType: responder.responderType 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    console.log('Login successful for:', email);
    console.log('Sending response...');

    // CRITICAL: Set proper headers
    res.setHeader('Content-Type', 'application/json');
    
    const responseData = {
      success: true,
      message: 'Login successful',
      token,
      responder: { 
        id: responder._id.toString(), 
        fullName: responder.fullName, 
        email: responder.email,
        responderType: responder.responderType 
      },
    };

    console.log('Response data:', responseData);
    res.status(200).json(responseData);
  } catch (err) {
    console.error('Responder login error:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login. Please try again.' 
    });
  }
});

// Responder Email Verification Endpoint
app.get('/verify-responder-email', async (req, res) => {
  console.log('=== RESPONDER EMAIL VERIFICATION REQUEST ===');
  const { token } = req.query;
  
  console.log('Verification token received:', token);

  if (!token) {
    console.log('No token provided');
    return res.status(400).send(`
      <html>
        <head>
          <title>Verification Failed</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #d32f2f; }
            h1 { color: #0A5EB0; }
          </style>
        </head>
        <body>
          <h1>Verification Failed</h1>
          <p class="error">Invalid verification link. No token provided.</p>
        </body>
      </html>
    `);
  }

  try {
    const responder = await Responder.findOne({ verificationToken: token });
    
    if (!responder) {
      console.log('No responder found with token:', token);
      return res.status(400).send(`
        <html>
          <head>
            <title>Verification Failed</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { color: #d32f2f; }
              h1 { color: #0A5EB0; }
            </style>
          </head>
          <body>
            <h1>Verification Failed</h1>
            <p class="error">Invalid or expired verification token.</p>
            <p>This link may have already been used or is no longer valid.</p>
          </body>
        </html>
      `);
    }

    if (responder.isVerified) {
      console.log('Responder already verified:', responder.email);
      return res.status(200).send(`
        <html>
          <head>
            <title>Already Verified</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .success { color: #388e3c; }
              h1 { color: #0A5EB0; }
            </style>
          </head>
          <body>
            <h1>Email Already Verified</h1>
            <p class="success">Your email has already been verified!</p>
            <p>You can now login to your responder account.</p>
          </body>
        </html>
      `);
    }

    responder.isVerified = true;
    responder.verificationToken = undefined;
    await responder.save();

    console.log('Responder email verified successfully:', responder.email);

    res.status(200).send(`
      <html>
        <head>
          <title>Email Verified</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .success { color: #388e3c; }
            h1 { color: #0A5EB0; }
          </style>
        </head>
        <body>
          <h1>✓ Email Verified Successfully!</h1>
          <p class="success">Your responder account has been verified.</p>
          <p>You can now login to access the responder portal.</p>
          <p><strong>Responder Type:</strong> ${responder.responderType.toUpperCase()}</p>
          <p><strong>Email:</strong> ${responder.email}</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Responder email verification error:', err);
    res.status(500).send(`
      <html>
        <head>
          <title>Verification Error</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #d32f2f; }
            h1 { color: #0A5EB0; }
          </style>
        </head>
        <body>
          <h1>Verification Error</h1>
          <p class="error">An error occurred during verification.</p>
          <p>Please try again or contact support.</p>
        </body>
      </html>
    `);
  }
});

//RESPONDERS LOGIN
app.post('/api/login-responder', async (req, res) => {
  console.log('=== RESPONDER LOGIN REQUEST ===');
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and password are required' 
    });
  }

  try {
    const responder = await Responder.findOne({ email });
    
    if (!responder) {
      console.log('Responder not found:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    if (!responder.isVerified) {
      console.log('Email not verified for responder:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'Please verify your email before logging in. Check your inbox for the verification link.' 
      });
    }

    // CHECK IF RESPONDER ACCOUNT IS DEACTIVATED
    if (responder.status === 'deactivated') {
      console.log('⛔ Deactivated responder account login attempt:', email);
      return res.status(403).json({ 
        success: false, 
        message: 'Your responder account has been deactivated. Please contact admin support at roschelmaeanoos@gmail.com for assistance.',
        accountStatus: 'deactivated',
        supportEmail: 'roschelmaeanoos@gmail.com'
      });
    }

    const isMatch = await bcrypt.compare(password, responder.password);
    if (!isMatch) {
      console.log('Password mismatch for responder:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const token = jwt.sign(
      { 
        id: responder._id, 
        type: 'responder',
        responderType: responder.responderType 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    console.log('✅ Responder login successful for:', email);
    res.setHeader('Content-Type', 'application/json');
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      responder: { 
        id: responder._id.toString(), 
        fullName: responder.fullName, 
        email: responder.email,
        responderType: responder.responderType,
        status: responder.status || 'active'
      },
    });
  } catch (err) {
    console.error('Responder login error:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login. Please try again.' 
    });
  }
});

// Get logged-in user
app.get('/me', authMiddleware, async (req, res) => {
  res.json({ success: true, user: req.user });
});

//------------------------------------------------------------------------------------------------------------------------------------
//USER POV
//----------------------------------------------------------------------------------------------------------------------------

////SA PAG FOLLOW 
app.post('/api/follow/:userId', authMiddleware, async (req, res) => {
  try {
    const followerId = req.user._id;
    const followingId = req.params.userId;
    
    if (followerId.toString() === followingId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself'
      });
    }
    
    const userToFollow = await User.findOne({ 
      _id: followingId, 
      status: 'active' 
    });
    
    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive'
      });
    }
    
    const existingFollow = await Follow.findOne({
      follower: followerId,
      following: followingId
    });
    
    if (existingFollow) {
      return res.status(400).json({
        success: false,
        message: 'You are already following this user'
      });
    }
    
    const newFollow = new Follow({
      follower: followerId,
      following: followingId
    });
    
    await newFollow.save();
    
    await User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(followingId, { $inc: { followersCount: 1 } });
    
    // ✅ FIX: Create notification with BOTH userName AND userEmail
    try {
      const notification = new Notification({
        userName: userToFollow.name.trim(),
        userEmail: userToFollow.email.trim(),
        title: 'New Follower',
        message: `${req.user.name} started following you!`,
        type: 'follow',
        seen: false,
        read: false
      });
      
      await notification.save();
      console.log("✅ Follow notification created");
    } catch (notifError) {
      console.error("⚠️ Failed to create follow notification:", notifError.message);
    }
    
    console.log(`${req.user.name} followed ${userToFollow.name}`);
    
    res.status(200).json({
      success: true,
      message: 'Successfully followed user',
      followersCount: userToFollow.followersCount + 1
    });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while following user',
      error: error.message
    });
  }
});
async function createNotification(data) {
  try {
    // ✅ Ensure both userName and userEmail are provided
    if (!data.userName) {
      throw new Error('userName is required for notification');
    }
    
    // If userEmail not provided, try to find it
    if (!data.userEmail) {
      const user = await User.findOne({ 
        name: new RegExp(`^${data.userName.trim()}$`, 'i') 
      });
      if (user) {
        data.userEmail = user.email;
      } else {
        throw new Error('Cannot create notification without userEmail');
      }
    }
    
    const notification = new Notification({
      userName: data.userName.trim(),
      userEmail: data.userEmail.trim(),
      title: data.title || 'Notification',
      message: data.message,
      type: data.type || 'info',
      reportId: data.reportId,
      priority: data.priority || 'medium',
      actionUrl: data.actionUrl,
      metadata: data.metadata || {},
      seen: false,
      read: false
    });
    
    await notification.save();
    console.log(`✅ Notification created for ${data.userName}:`, data.message);
    
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
}
app.get('/api/debug/notifications/:userName', async (req, res) => {
  try {
    const { userName } = req.params;
    
    console.log('🔍 DEBUG: Searching notifications for:', userName);
    
    // Search with multiple strategies
    const exactMatch = await Notification.find({ userName: userName });
    const caseInsensitiveMatch = await Notification.find({ 
      userName: new RegExp(`^${userName}$`, 'i') 
    });
    const allNotifications = await Notification.find({});
    
    // Also check if user exists
    const user = await User.findOne({ name: userName });
    const userCaseInsensitive = await User.findOne({ 
      name: new RegExp(`^${userName}$`, 'i') 
    });
    
    res.status(200).json({
      success: true,
      debug: {
        searchedFor: userName,
        exactMatchCount: exactMatch.length,
        caseInsensitiveCount: caseInsensitiveMatch.length,
        totalNotificationsInDB: allNotifications.length,
        userExists: !!user,
        userExistsCaseInsensitive: !!userCaseInsensitive,
        userEmail: user?.email || userCaseInsensitive?.email || 'NOT FOUND',
        exactMatchSample: exactMatch.slice(0, 3),
        caseInsensitiveSample: caseInsensitiveMatch.slice(0, 3),
        allUsersWithNotifications: [...new Set(allNotifications.map(n => n.userName))]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
module.exports.createNotification = createNotification;

//PEOPLE U MAY KNOW
app.get('/api/suggested-users', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    
    // Get users the current user is already following
    const following = await Follow.find({ follower: currentUserId })
      .select('following');
    const followingIds = following.map(f => f.following.toString());
    
    // Get active users excluding current user and already following
    const suggestedUsers = await User.find({
      _id: { $ne: currentUserId, $nin: followingIds },
      status: 'active',
      isVerified: true
    })
      .select('name email gender followersCount followingCount createdAt')
      .limit(10)
      .sort({ followersCount: -1, createdAt: -1 }); // Sort by popularity and recency
    
    console.log(`Found ${suggestedUsers.length} suggested users for ${req.user.email}`);
    
    res.status(200).json({
      success: true,
      users: suggestedUsers
    });
  } catch (error) {
    console.error('Error fetching suggested users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching suggested users',
      error: error.message
    });
  }
});

// Unfollow a user
app.delete('/api/unfollow/:userId', authMiddleware, async (req, res) => {
  try {
    const followerId = req.user._id;
    const followingId = req.params.userId;
    
    // Find and delete the follow relationship
    const follow = await Follow.findOneAndDelete({
      follower: followerId,
      following: followingId
    });
    
    if (!follow) {
      return res.status(404).json({
        success: false,
        message: 'You are not following this user'
      });
    }
    
    // Update follower and following counts
    await User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } });
    await User.findByIdAndUpdate(followingId, { $inc: { followersCount: -1 } });
    
    const userToUnfollow = await User.findById(followingId);
    
    console.log(`${req.user.name} unfollowed ${userToUnfollow.name}`);
    
    res.status(200).json({
      success: true,
      message: 'Successfully unfollowed user',
      followersCount: Math.max(0, userToUnfollow.followersCount - 1)
    });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while unfollowing user',
      error: error.message
    });
  }
});

// Check if current user is following another user
app.get('/api/is-following/:userId', authMiddleware, async (req, res) => {
  try {
    const followerId = req.user._id;
    const followingId = req.params.userId;
    
    const isFollowing = await Follow.exists({
      follower: followerId,
      following: followingId
    });
    
    res.status(200).json({
      success: true,
      isFollowing: !!isFollowing
    });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get user's followers
app.get('/api/followers/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const followers = await Follow.find({ following: userId })
      .populate('follower', 'name email gender followersCount followingCount')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      followers: followers.map(f => f.follower)
    });
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get users that a user is following
app.get('/api/following/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const following = await Follow.find({ follower: userId })
      .populate('following', 'name email gender followersCount followingCount')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      following: following.map(f => f.following)
    });
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});


///PROFILEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE
app.get('/api/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('📋 Fetching user profile for:', userId);

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Find the user (excluding sensitive data)
    const user = await User.findById(userId)
      .select('-password -verificationToken')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is deactivated
    if (user.status === 'deactivated') {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio || '',
        profilePicture: user.profilePicture || '',
        gender: user.gender,
        role: user.role || 'user',
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
        createdAt: user.createdAt
      }
    });

    console.log('✅ User profile fetched successfully');

  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user profile',
      error: error.message
    });
  }
});

app.post('/update-profile', authMiddleware, async (req, res) => {
  try {
    const { name, bio, phone, profilePictureUpdated, profilePictureData } = req.body;
    
    console.log('📝 Updating profile for user:', req.user.email);

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    // Find user
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update basic fields
    user.name = name.trim();
    user.bio = bio?.trim() || '';
    user.phone = phone?.trim() || '';

    // Update profile picture if provided
    if (profilePictureUpdated && profilePictureData) {
      user.profilePicture = profilePictureData;
    }

    // Save updated user
    await user.save();

    console.log('✅ Profile updated successfully for:', user.email);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        phone: user.phone,
        profilePicture: user.profilePicture,
        gender: user.gender,
        followersCount: user.followersCount,
        followingCount: user.followingCount
      }
    });

  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile',
      error: error.message
    });
  }
});
app.get('/api/search-users', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user._id;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    console.log('🔍 Searching users with query:', query);

    // Search users by name or email (case-insensitive)
    const users = await User.find({
      $and: [
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        },
        { _id: { $ne: currentUserId } }, // Exclude current user
        { status: 'active' }, // Only active users
        { isVerified: true } // Only verified users
      ]
    })
      .select('name email gender followersCount followingCount profilePicture')
      .limit(20)
      .lean();

    console.log(`✅ Found ${users.length} users matching query`);

    res.status(200).json({
      success: true,
      users: users
    });

  } catch (error) {
    console.error('❌ Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error searching users',
      error: error.message
    });
  }
});

app.get('/api/user/:userId/stats', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('📊 Fetching stats for user:', userId);

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Get user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Count cleanups
    const cleanupsCount = await Cleanup.countDocuments({ email: user.email });
    
    // Calculate total cleanup score
    const cleanups = await Cleanup.find({ email: user.email });
    const totalScore = cleanups.reduce((sum, cleanup) => sum + (cleanup.score || 0), 0);

    // Count reports
    const reportsCount = await Report.countDocuments({ user: userId });

    // Count donations
    const donationsCount = await Donation.countDocuments({ email: user.email });

    // Count schedules
    const schedulesCount = await Schedule.countDocuments({ email: user.email });

    res.status(200).json({
      success: true,
      stats: {
        cleanups: cleanupsCount,
        totalPoints: totalScore,
        reports: reportsCount,
        donations: donationsCount,
        schedules: schedulesCount,
        followers: user.followersCount || 0,
        following: user.followingCount || 0
      }
    });

    console.log('✅ User stats fetched successfully');

  } catch (error) {
    console.error('❌ Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user stats',
      error: error.message
    });
  }
});

//CLEANUP----------------------
app.post('/save-cleanup', authMiddleware, async (req, res) => {
  const { userName, email, image, score } = req.body;

  try {
    if (!userName || !email || !image || !score) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const cleanup = new Cleanup({
      userName,
      email,
      image,
      score,
    });

    await cleanup.save();
    res.status(201).json({ success: true, message: 'Cleanup data saved successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/cleanups', authMiddleware, async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email parameter is required' });
    }
    
    const cleanups = await Cleanup.find({ email });
    res.json({ success: true, cleanups });
  } catch (error) {
    console.error('Error fetching cleanups:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

//SCHEDULE DITO
app.get('/api/schedules', async (req, res) => {
  try {
    console.log('Fetching all schedules...');
    
    const schedules = await Schedule.find()
      .sort({ createdAt: -1 }); // Sort by newest first
    
    console.log(`Found ${schedules.length} schedules`);
    
    res.status(200).json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching schedules',
      error: error.message 
    });
  }
});

app.put('/api/schedules/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`Updating schedule ${id} to status: ${status}`);

    // Validate the status
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid status. Must be one of: pending, confirmed, completed, cancelled" 
      });
    }

    // Find and update the schedule
    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      { status, statusUpdatedAt: new Date() },
      { new: true } // Return the updated document
    );

    if (!updatedSchedule) {
      console.log(`Schedule not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: "Schedule not found" 
      });
    }

    console.log(`Schedule ${id} updated successfully to ${status}`);

    // Create notification for the user
    try {
      const notification = new Notification({
        userName: updatedSchedule.userName,
        title: 'Schedule Update',
        message: `Your pickup schedule for ${updatedSchedule.pickupDate} has been ${status}.`,
        type: 'schedule',
        seen: false
      });
      await notification.save();
      console.log('Notification created for schedule update');
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    res.status(200).json(updatedSchedule);
  } catch (error) {
    console.error("Error updating schedule status:", error);
    res.status(500).json({ 
      success: false,
      message: "Error updating schedule status",
      error: error.message 
    });
  }
});

// Get schedules by user email (with auth)
app.get('/get-schedules', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const schedules = await Schedule.find({ email: user.email }).sort({ createdAt: -1 });
    res.json({ 
      success: true, 
      schedules 
    });
  } catch (err) {
    console.error('Error in /get-schedules endpoint:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Save new schedule (with auth)
app.post('/save-schedule', authMiddleware, async (req, res) => {
  const { userName, email, image, pickupDate, pickupTime } = req.body;

  try {
    if (!userName || !email || !image || !pickupDate || !pickupTime) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const schedule = new Schedule({
      userName,
      email,
      image,
      pickupDate,
      pickupTime,
      status: 'pending',
    });

    await schedule.save();
    
    console.log(`New schedule created for ${userName} on ${pickupDate} at ${pickupTime}`);
    
    res.status(201).json({ 
      success: true, 
      message: 'Schedule data saved successfully!',
      status: 'pending',
      schedule
    });
  } catch (err) {
    console.error('Error saving schedule:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete schedule (admin only)
app.delete('/api/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const schedule = await Schedule.findByIdAndDelete(id);
    
    if (!schedule) {
      return res.status(404).json({ 
        success: false, 
        message: 'Schedule not found' 
      });
    }
    
    console.log(`Schedule ${id} deleted successfully`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Schedule deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting schedule' 
    });
  }
});

app.get('/api/schedules/stats', async (req, res) => {
  try {
    const totalSchedules = await Schedule.countDocuments();
    const pendingSchedules = await Schedule.countDocuments({ status: 'pending' });
    const confirmedSchedules = await Schedule.countDocuments({ status: 'confirmed' });
    const completedSchedules = await Schedule.countDocuments({ status: 'completed' });
    const cancelledSchedules = await Schedule.countDocuments({ status: 'cancelled' });
    
    res.status(200).json({
      success: true,
      stats: {
        total: totalSchedules,
        pending: pendingSchedules,
        confirmed: confirmedSchedules,
        completed: completedSchedules,
        cancelled: cancelledSchedules
      }
    });
  } catch (error) {
    console.error('Error fetching schedule stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching schedule statistics' 
    });
  }
});

//DONATIONS---------------------DONTAE----DONATE
// ============================================
// DONATION MANAGEMENT ENDPOINTS
// Add these to your server.js file (replace existing donation endpoints)
// ============================================

// Get all donations with optional status filter
app.get('/api/donations/all', async (req, res) => {
  try {
    const { status, email } = req.query;
    
    console.log('📦 Fetching donations...');
    console.log('Query params:', { status, email });
    
    let filter = {};
    if (status) filter.status = status;
    if (email) filter.email = email;
    
    const donations = await Donation.find(filter)
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${donations.length} donations`);
    
    res.status(200).json({
      success: true,
      donations
    });
  } catch (error) {
    console.error('❌ Error fetching donations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching donations',
      error: error.message 
    });
  }
});

// Update donation status - AUTOMATICALLY sets timestamp based on status
app.put('/api/donations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, updatedBy, notes } = req.body;

    console.log(`📝 Updating donation ${id} to status: ${status}`);

    // Validate status
    const validStatuses = ['Pending', 'Ready to Pickup', 'On the Way', 'Pickup Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Find the donation
    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Donation not found' 
      });
    }

    console.log('Current donation:', {
      id: donation._id,
      status: donation.status,
      userName: donation.userName,
      email: donation.email
    });

    const currentTime = new Date();

    // Update status
    donation.status = status;
    
    // AUTOMATICALLY set timestamp based on the new status
    switch (status) {
      case 'Ready to Pickup':
        donation.readyToPickupTime = currentTime;
        break;
      case 'On the Way':
        donation.onTheWayTime = currentTime;
        // If readyToPickupTime wasn't set, set it now (in case status was skipped)
        if (!donation.readyToPickupTime) {
          donation.readyToPickupTime = currentTime;
        }
        break;
      case 'Pickup Completed':
        donation.actualPickupTime = currentTime;
        // Set previous timestamps if they weren't set
        if (!donation.readyToPickupTime) {
          donation.readyToPickupTime = currentTime;
        }
        if (!donation.onTheWayTime) {
          donation.onTheWayTime = currentTime;
        }
        break;
      case 'Pending':
        // Reset all timestamps if going back to Pending
        donation.readyToPickupTime = undefined;
        donation.onTheWayTime = undefined;
        donation.actualPickupTime = undefined;
        break;
    }

    // Add to status history
    donation.statusHistory.push({
      status,
      timestamp: currentTime,
      updatedBy: updatedBy || 'Admin'
    });

    // Update notes if provided
    if (notes) {
      donation.notes = notes;
    }

    await donation.save();

    // Create notification for user
    try {
      const statusMessages = {
        'Pending': 'Your donation request has been received and is being reviewed.',
        'Ready to Pickup': `Your donation is ready for pickup! Our team will collect it soon. (Updated: ${currentTime.toLocaleString()})`,
        'On the Way': `Our collection team is on the way to pickup your donation. (Dispatched: ${currentTime.toLocaleString()})`,
        'Pickup Completed': `Thank you! Your donation has been successfully collected. (Completed: ${currentTime.toLocaleString()})`
      };

      const notification = new Notification({
        userName: donation.userName.trim(),
        userEmail: donation.email.trim(),
        title: 'Donation Status Update',
        message: statusMessages[status] || `Your donation status has been updated to "${status}".`,
        type: 'donation',
        seen: false,
        read: false,
        metadata: {
          donationId: donation._id,
          status: status,
          wasteType: donation.wasteType,
          updatedAt: currentTime
        }
      });

      await notification.save();
      console.log('✅ Notification created for donation status update');
    } catch (notifError) {
      console.error('⚠️ Failed to create notification:', notifError.message);
    }

    console.log(`✅ Donation ${id} updated to ${status} at ${currentTime.toISOString()}`);

    res.status(200).json({ 
      success: true, 
      message: `Donation status updated to "${status}" successfully!`,
      donation,
      updatedAt: currentTime
    });

  } catch (error) {
    console.error('❌ Error updating donation status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating status.',
      error: error.message 
    });
  }
});

// Get donation statistics
app.get('/api/donations/stats', async (req, res) => {
  try {
    const totalDonations = await Donation.countDocuments();
    const pending = await Donation.countDocuments({ status: 'Pending' });
    const readyToPickup = await Donation.countDocuments({ status: 'Ready to Pickup' });
    const onTheWay = await Donation.countDocuments({ status: 'On the Way' });
    const completed = await Donation.countDocuments({ status: 'Pickup Completed' });
    
    // Count by waste type
    const byWasteType = await Donation.aggregate([
      {
        $group: {
          _id: '$wasteType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      stats: {
        total: totalDonations,
        pending,
        readyToPickup,
        onTheWay,
        completed,
        byWasteType: byWasteType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching donation stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching statistics' 
    });
  }
});

// Delete donation (admin only)
app.delete('/api/donations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const donation = await Donation.findByIdAndDelete(id);
    
    if (!donation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Donation not found' 
      });
    }
    
    console.log(`✅ Deleted donation: ${id}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Donation deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting donation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting donation' 
    });
  }
});

// Get donations by user email (for user dashboard)
app.get('/api/donations/user', authMiddleware, async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email parameter is required' 
      });
    }
    
    const donations = await Donation.find({ email }).sort({ createdAt: -1 });
    
    res.status(200).json({ 
      success: true, 
      donations 
    });
  } catch (error) {
    console.error('Error fetching user donations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching user donations' 
    });
  }
});

// Save new donation
app.post('/save-donation', authMiddleware, async (req, res) => {
  const { userName, email, image, wasteType } = req.body;

  try {
    if (!userName || !email || !image || !wasteType) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const donation = new Donation({
      userName,
      email,
      image,
      wasteType,
      status: 'Pending',
      statusHistory: [{
        status: 'Pending',
        timestamp: new Date(),
        updatedBy: 'System'
      }]
    });

    await donation.save();
    
    console.log(`✅ New donation created by ${userName}`);
    
    res.status(201).json({ success: true, message: 'Donation data saved successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
//USER REPORT

//KUNG SINO NAKALOGIN SYA, YUNG REPORT NYA LANG ANG VSIBLE
app.get('/reports/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized access to reports' 
      });
    }

    const reports = await Report.find({ user: userId }); 
    res.json({ 
      success: true, 
      reports 
    });
  } catch (error) {
    console.error('Error fetching user-specific reports:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching reports' 
    });
  }
});

app.put("/api/ongoing-reports/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`Updating ongoing report ${id} to status: ${status}`);

    const ongoingReport = await OngoingReport.findById(id);
    if (!ongoingReport) {
      return res.status(404).json({ 
        success: false, 
        message: "Ongoing report not found." 
      });
    }

    console.log("Fetched ongoing report:", ongoingReport);

    // ✅ FIX: Get BOTH userName AND userEmail
    const userName = ongoingReport.reportedBy?.trim();
    if (!userName) {
      console.error("Error: ReportedBy is missing for ongoing report ID:", ongoingReport._id);
      return res.status(400).json({ 
        success: false, 
        message: "ReportedBy field is missing for this report." 
      });
    }

    // Find user email (case-insensitive)
    const user = await User.findOne({ 
      name: new RegExp(`^${userName}$`, 'i') 
    });
    const userEmail = user ? user.email : null;

    if (status === "Completed") {
      const completedReport = new CompletedReport({
        ...ongoingReport.toObject(),
        dateCompleted: new Date(),
        status: "Completed"
      });

      await completedReport.save();
      await OngoingReport.findByIdAndDelete(id);
      console.log(`✅ Ongoing Report ID: ${id} moved to CompletedReports.`);

      // Create notification
      if (userEmail) {
        try {
          const notification = new Notification({
            userName: userName.trim(),
            userEmail: userEmail.trim(),
            title: 'Report Completed',
            message: `Your report has been marked as "Completed".`,
            type: 'report',
            seen: false,
            read: false,
            reportId: ongoingReport._id
          });
          await notification.save();
          console.log("✅ Notification created");
        } catch (err) {
          console.error("⚠️ Notification failed:", err.message);
        }
      }
    } 
    else if (status === "Cancelled") {
      const cancelledReport = new CancelledReport({
        ...ongoingReport.toObject(),
        dateCancelled: new Date(),
        status: "Cancelled"
      });

      await cancelledReport.save();
      await OngoingReport.findByIdAndDelete(id);
      console.log(`✅ Ongoing Report ID: ${id} moved to CancelledReports.`);

      // Create notification
      if (userEmail) {
        try {
          const notification = new Notification({
            userName: userName.trim(),
            userEmail: userEmail.trim(),
            title: 'Report Cancelled',
            message: `Your report has been marked as "Cancelled".`,
            type: 'report',
            seen: false,
            read: false,
            reportId: ongoingReport._id
          });
          await notification.save();
          console.log("✅ Notification created");
        } catch (err) {
          console.error("⚠️ Notification failed:", err.message);
        }
      }
    } 
    else {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid status. Only 'Completed' or 'Cancelled' are allowed." 
      });
    }

    res.json({ 
      success: true, 
      message: `Status updated to "${status}" successfully!` 
    });
  } catch (error) {
    console.error("❌ Error updating ongoing report status:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while updating status.",
      error: error.message 
    });
  }
});
app.post('/submit-report', authMiddleware, async (req, res) => {
  const { boatName, eventDescription, comments, address, incidentType } = req.body;

  try {
    if (!boatName || !eventDescription || !address || !incidentType) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const report = new Report({
      user: req.user._id,
      name: req.user.name,
      boatName,
      eventDescription,
      comments,
      address,
      incidentType
    });

    await report.save();
    res.status(201).json({ success: true, message: 'Report submitted successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.delete('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedReport = await Report.findByIdAndDelete(id);
    if (!deletedReport) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/reported', async (req, res) => {
  try {
    let { reportTo, reportedBy, originalReportId } = req.body;

    if (!reportedBy) {
      return res.status(400).json({ success: false, message: "Missing reportedBy field" });
    }

    const newReport = new Reported({
      ...req.body,
      reportTo: Array.isArray(reportTo) ? reportTo.filter((item) => ["Barangay", "NGO", "PCG"].includes(item)) : [reportTo],
      responderType: Array.isArray(reportTo) ? (reportTo.length === 1 ? reportTo[0] : null) : reportTo,
    });

    await newReport.save();
    
    if (originalReportId) {
      try {
        await Report.findByIdAndDelete(originalReportId);
      } catch (deleteError) {
        console.error(`Error deleting original report ${originalReportId}:`, deleteError);
      }
    }
    
    res.json({ success: true, message: "Report saved successfully!" });
  } catch (error) {
    console.error("Error saving report:", error);
    res.status(500).json({ success: false, message: "Server error while saving report." });
  }
});

app.get('/get-reported', authMiddleware, async (req, res) => {
  try {
    const reports = await Reported.find();
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reported items:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/get-completed-reports', authMiddleware, async (req, res) => {
  try {
    const completedReports = await CompletedReport.find();
    res.json(completedReports);
  } catch (error) {
    console.error('Error fetching completed reports:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get("/api/completed-reports", async (req, res) => {
  try {
    const { responderType } = req.query;
    
    console.log('📊 Fetching completed reports...');
    console.log('Query params:', req.query);
    
    // Build filter based on responderType
    let filter = {};
    if (responderType) {
      filter.responderType = responderType;
      console.log(`Filtering by responderType: ${responderType}`);
    }
    
    const completedReports = await CompletedReport.find(filter)
      .sort({ dateCompleted: -1 });
    
    console.log(`✅ Found ${completedReports.length} completed reports`);
    
    // Return array directly (React Native expects array)
    res.status(200).json(completedReports);
    
  } catch (error) {
    console.error("❌ Error fetching completed reports:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching completed reports.",
      error: error.message 
    });
  }
});

//PAG PREDICT NG LAW GAMIT ANG GEMINI API
app.post('/predict-law', async (req, res) => {
  const { incidentType, targetLanguage } = req.body;
  
  console.log(`🤖 Request received for law prediction: ${incidentType} in ${targetLanguage}`);

  // Validate input
  if (!incidentType) {
    return res.status(400).json({
      success: false,
      message: 'Incident type is required'
    });
  }

  const GEMINI_MODEL = "gemini-2.0-flash-exp";
  
  const systemInstruction = "You are an expert in Philippine environmental and fisheries law. Provide a **concise summary** (2-3 sentences max) of the primary law or regulation that applies to the given incident type. The response must be solely the summary text, formatted clearly.";
  
  const userPrompt = `Incident: ${incidentType}. Summarize the applicable law in ${targetLanguage === 'en' ? 'English' : 'Tagalog/Filipino'}.`;

  try {
    console.log('🚀 Calling Gemini API...');
    
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
        maxOutputTokens: 300,
      }
    });

    // Extract the text content from the Gemini response
    const predictedLaw = response.text?.trim() || '';

    if (predictedLaw) {
      console.log('✅ Prediction successful:', predictedLaw.substring(0, 100) + '...');
      
      return res.status(200).json({
        success: true,
        predictedLaw: predictedLaw,
        message: "Law predicted successfully via Gemini API."
      });
    } else {
      console.error('❌ AI service returned an empty response.');
      
      return res.status(500).json({ 
        success: false, 
        message: "AI service returned an empty response. Please try again.",
        predictedLaw: "Unable to predict applicable law at this time. Please try again later."
      });
    }

  } catch (error) {
    console.error('❌ Error calling Gemini API:', error.message);
    
    let errorMessage = 'Failed to predict law using AI service.';
    let fallbackLaw = `For ${incidentType}, please consult Republic Act No. 8550 (Philippine Fisheries Code) and Republic Act No. 10654 for applicable regulations.`;
    
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('permission denied')) {
      errorMessage = 'AI service temporarily unavailable.';
    } else if (error.message?.includes('quota') || error.message?.includes('429')) {
      errorMessage = 'AI service quota exceeded. Using fallback response.';
    } else if (error.message?.includes('NOT_FOUND')) {
      errorMessage = 'AI model not available. Using fallback response.';
    }

    // Return a fallback response instead of failing completely
    return res.status(200).json({ 
      success: true, 
      message: errorMessage,
      predictedLaw: fallbackLaw,
      fallback: true
    });
  }
});

//PAG NAUBOS OR NA EXCEED NA YUNG KOWTA
const FALLBACK_LAWS = {
  'Dynamite Fishing': {
    en: 'Dynamite fishing is strictly prohibited under Republic Act No. 8550, as amended by Republic Act No. 10654 (The Philippine Fisheries Code). Violators face severe penalties including imprisonment and substantial fines.',
    fil: 'Ang pangingisda gamit ang dinamita ay mahigpit na ipinagbabawal sa ilalim ng Republic Act No. 8550, na binago ng R.A. 10654. Ang mga lumalabag ay maaaring makulong at pagmultahin ng malaki.'
  },
  'Illegal Fishing': {
    en: 'Illegal fishing activities are regulated under Republic Act No. 8550 (Philippine Fisheries Code) and Republic Act No. 10654. Violations carry penalties including imprisonment and fines.',
    fil: 'Ang illegal na pangingisda ay regulado sa ilalim ng Republic Act No. 8550 at R.A. 10654. Ang paglabag ay may kaakibat na parusa ng pagkakakulong at multa.'
  },
  'Cyanide Fishing': {
    en: 'Cyanide fishing is prohibited under Republic Act No. 8550 and Republic Act No. 10654. The use of noxious substances in fishing carries severe penalties.',
    fil: 'Ang paggamit ng cyanide sa pangingisda ay ipinagbabawal sa R.A. 8550 at R.A. 10654. Ito ay may mabigat na parusa.'
  },
  'Oil Spill': {
    en: 'Oil spills are covered under the Philippine Clean Water Act (R.A. 9275) and the Philippine Clean Air Act (R.A. 8749). Responsible parties face penalties and cleanup obligations.',
    fil: 'Ang oil spill ay saklaw ng Philippine Clean Water Act (R.A. 9275) at Clean Air Act (R.A. 8749). May parusa at obligasyon sa paglilinis ang mga responsable.'
  },
  'Plastic Pollution': {
    en: 'Plastic pollution is addressed under R.A. 9003 (Ecological Solid Waste Management Act) and various local ordinances. Proper waste disposal is mandatory.',
    fil: 'Ang plastic pollution ay saklaw ng R.A. 9003 (Ecological Solid Waste Management Act). Ang wastong pagtatapon ng basura ay mandatory.'
  },
  'Overfishing': {
    en: 'Overfishing is regulated under Republic Act No. 8550 (Philippine Fisheries Code) to ensure sustainable fishing practices and marine resource conservation.',
    fil: 'Ang overfishing ay regulado sa R.A. 8550 upang masiguro ang sustainable na pangingisda at konserbasyon ng marine resources.'
  }
};

function getFallbackLaw(incidentType, language = 'en') {
  const laws = FALLBACK_LAWS[incidentType];
  
  if (laws) {
    return laws[language] || laws.en;
  }
  
  // Generic fallback
  if (language === 'fil') {
    return 'Para sa naturang insidente, mangyaring sumangguni sa Republic Act No. 8550 (Philippine Fisheries Code) at iba pang kaugnay na batas pangkapaligiran.';
  }
  
  return 'For this incident type, please refer to Republic Act No. 8550 (Philippine Fisheries Code) and related environmental regulations.';
}

//PAG DETECT NG INCIDENT
app.post('/detect-incident-type', authMiddleware, async (req, res) => {
  const { eventDescription, boatName, comments } = req.body;
  
  console.log('🤖 Request received for incident type detection');
  console.log('📝 Event Description:', eventDescription);

  // Validate input
  if (!eventDescription) {
    return res.status(400).json({
      success: false,
      message: 'Event description is required'
    });
  }

  const GEMINI_MODEL = "gemini-2.0-flash-exp";
  
  const systemInstruction = `You are an expert marine incident classifier for the Philippine Coast Guard and marine law enforcement.

Your task is to analyze incident reports and classify them into ONE of these EXACT categories:

1. "Dynamite Fishing" - Use of explosives for fishing
2. "Overfishing" - Excessive fishing beyond sustainable limits
3. "Poison Fishing" - Use of cyanide or toxic substances
4. "Illegal Net Fishing" - Use of prohibited nets (fine mesh, etc.)
5. "Coral Destruction" - Damage to coral reefs
6. "Oil Spill" - Petroleum contamination in water
7. "Marine Debris Dumping" - Trash/waste disposal in ocean
8. "Unauthorized Fishing" - Fishing without permits/in restricted areas
9. "Other Illegal Activities" - Any other marine violations

CRITICAL RULES:
- Return ONLY the category name, nothing else
- Use the EXACT spelling from the list above
- If uncertain or description is vague, return "Other Illegal Activities"
- Consider context clues (boat behavior, location, evidence described)
- Be decisive - always return one category`;

  const userPrompt = `Classify this marine incident report:

EVENT DESCRIPTION: ${eventDescription}
${boatName ? `BOAT NAME: ${boatName}` : ''}
${comments ? `ADDITIONAL COMMENTS: ${comments}` : ''}

Return ONLY the incident category name.`;

  try {
    console.log('🚀 Calling Gemini API for incident classification...');
    
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1, // Low temperature for consistent classification
        maxOutputTokens: 50,
      }
    });

    // Extract the text content from the Gemini response
    let detectedType = response.text?.trim() || '';
    
    console.log('🔍 Raw AI Response:', detectedType);

    // Clean up the response (remove quotes, extra text)
    detectedType = detectedType.replace(/['"]/g, '').trim();
    
    // Validate against known incident types
    const validTypes = [
      "Dynamite Fishing",
      "Overfishing", 
      "Poison Fishing",
      "Illegal Net Fishing",
      "Coral Destruction",
      "Oil Spill",
      "Marine Debris Dumping",
      "Unauthorized Fishing",
      "Other Illegal Activities"
    ];

    // Find exact or close match
    let finalIncidentType = "Other Illegal Activities";
    
    for (const validType of validTypes) {
      if (detectedType.toLowerCase().includes(validType.toLowerCase()) ||
          validType.toLowerCase().includes(detectedType.toLowerCase())) {
        finalIncidentType = validType;
        break;
      }
    }

    console.log('✅ Final Incident Type:', finalIncidentType);

    return res.status(200).json({
      success: true,
      incidentType: finalIncidentType,
      confidence: detectedType === finalIncidentType ? 'high' : 'medium',
      rawResponse: detectedType
    });

  } catch (error) {
    console.error('❌ Error calling Gemini API:', error.message);
    
    // Fallback to keyword-based detection
    console.log('🔄 Using fallback keyword detection...');
    
    const keywords = {
      "Dynamite Fishing": ["dynamite", "blast", "explosion", "bomb", "explosive", "detonation", "bang"],
      "Overfishing": ["overfishing", "too many fish", "excessive catch", "depleted", "overfish"],
      "Poison Fishing": ["poison", "toxic", "cyanide", "chemical", "poisoned fish"],
      "Illegal Net Fishing": ["fine mesh", "illegal net", "small fish", "banned net", "prohibited net"],
      "Coral Destruction": ["coral damage", "reef destruction", "coral broken", "destroyed reef"],
      "Oil Spill": ["oil spill", "oil slick", "black water", "petroleum", "fuel leak"],
      "Marine Debris Dumping": ["trash", "garbage", "waste", "dumping", "litter", "debris"],
      "Unauthorized Fishing": ["no permit", "unregistered", "foreign boat", "poaching", "illegal vessel"],
    };

    let fallbackType = "Other Illegal Activities";
    const combinedText = `${eventDescription} ${boatName} ${comments}`.toLowerCase();

    for (const [type, keywordList] of Object.entries(keywords)) {
      if (keywordList.some(keyword => combinedText.includes(keyword.toLowerCase()))) {
        fallbackType = type;
        break;
      }
    }

    console.log('✅ Fallback detection result:', fallbackType);

    return res.status(200).json({
      success: true,
      incidentType: fallbackType,
      confidence: 'fallback',
      message: 'AI service unavailable, used keyword matching'
    });
  }
});

//NOTIFICATION -----------------------NOTIFICATIONS-------------------NOTIF
app.get('/notifications', authMiddleware, async (req, res) => {
  try {
    console.log('📬 Fetching notifications for user:', req.user.name);
    console.log('📧 User email:', req.user.email);
    
    // ✅ FIX 1: Trim whitespace and use case-insensitive regex for better matching
    const userName = req.user.name.trim();
    
    const notifications = await Notification.find({ 
      $or: [
        { userName: userName }, // Exact match
        { userName: new RegExp(`^${userName}$`, 'i') }, // Case-insensitive match
        { userEmail: req.user.email } // Also match by email as backup
      ]
    })
      .sort({ createdAt: -1 }) // Newest first
      .limit(100); // Limit to last 100 notifications
    
    // Get unread count
    const unreadCount = await Notification.countDocuments({ 
      $or: [
        { userName: userName, read: false },
        { userEmail: req.user.email, read: false }
      ]
    });
    
    console.log(`✅ Found ${notifications.length} notifications (${unreadCount} unread)`);
    
    res.status(200).json({ 
      success: true, 
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching notifications',
      error: error.message 
    });
  }
});
// Mark single notification as read
app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📖 Marking notification ${id} as read for user:`, req.user.name);

    // Validate notification ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid notification ID' 
      });
    }

    // Find and update the notification
    const notification = await Notification.findById(id);

    if (!notification) {
      console.log('⚠️ Notification not found:', id);
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found' 
      });
    }

    // Check if user owns this notification
    if (notification.userName !== req.user.name && notification.userEmail !== req.user.email) {
      console.log('⚠️ Unauthorized access attempt');
      return res.status(403).json({ 
        success: false, 
        message: 'You can only mark your own notifications as read' 
      });
    }

    // Mark as read
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    console.log('✅ Notification marked as read:', id);

    res.status(200).json({ 
      success: true, 
      message: 'Notification marked as read',
      notification 
    });

  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error marking notification as read',
      error: error.message 
    });
  }
});

// Mark all notifications as read for logged-in user
app.put('/api/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    console.log('📖 Marking all notifications as read for user:', req.user.name);

    // Update all unread notifications for this user
    const result = await Notification.updateMany(
      { 
        $or: [
          { userName: req.user.name },
          { userEmail: req.user.email }
        ],
        read: false 
      },
      { 
        read: true,
        readAt: new Date()
      }
    );

    console.log(`✅ Marked ${result.modifiedCount} notifications as read`);

    res.status(200).json({ 
      success: true, 
      message: `${result.modifiedCount} notifications marked as read`,
      count: result.modifiedCount
    });

  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error marking notifications as read',
      error: error.message 
    });
  }
});

// Clear all read notifications for logged-in user
app.delete('/api/notifications/clear-read', authMiddleware, async (req, res) => {
  try {
    console.log('🧹 Clearing read notifications for user:', req.user.name);

    // Delete all read notifications for this user
    const result = await Notification.deleteMany({
      $or: [
        { userName: req.user.name },
        { userEmail: req.user.email }
      ],
      read: true
    });

    console.log(`✅ Cleared ${result.deletedCount} read notifications`);

    res.status(200).json({ 
      success: true, 
      message: `${result.deletedCount} notifications cleared`,
      count: result.deletedCount
    });

  } catch (error) {
    console.error('❌ Error clearing notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error clearing notifications',
      error: error.message 
    });
  }
});

// Delete single notification
app.delete('/api/notifications/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deleting notification ${id} for user:`, req.user.name);

    // Validate notification ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid notification ID' 
      });
    }

    // Find notification first to check ownership
    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found' 
      });
    }

    // Check if user owns this notification
    if (notification.userName !== req.user.name && notification.userEmail !== req.user.email) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only delete your own notifications' 
      });
    }

    // Delete the notification
    await Notification.findByIdAndDelete(id);

    console.log('✅ Notification deleted:', id);

    res.status(200).json({ 
      success: true, 
      message: 'Notification deleted successfully' 
    });

  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting notification',
      error: error.message 
    });
  }
});

// Get notification statistics for user
app.get('/api/notifications/stats', authMiddleware, async (req, res) => {
  try {
    const userName = req.user.name;
    
    const [total, unread, read, byType] = await Promise.all([
      Notification.countDocuments({ 
        $or: [{ userName }, { userEmail: req.user.email }]
      }),
      Notification.countDocuments({ 
        $or: [{ userName }, { userEmail: req.user.email }],
        read: false 
      }),
      Notification.countDocuments({ 
        $or: [{ userName }, { userEmail: req.user.email }],
        read: true 
      }),
      Notification.aggregate([
        { 
          $match: { 
            $or: [
              { userName }, 
              { userEmail: req.user.email }
            ]
          } 
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total,
        unread,
        read,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
});

//KNOWLEDGEEEEEEEEEEEEEEEEEEEEEEEEEEE

app.post('/ai-content', async (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ success: false, message: 'Prompt is required' });
  }

  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
      { 
        inputs: prompt,
        parameters: {
          max_length: 500,
          temperature: 0.7,
          num_return_sequences: 1
        }
      },
      { 
        headers: { 
          Authorization: `Bearer ${process.env.HUGGING_FACE_TOKEN_1}`, // ✅ USE ENV VAR
          'Content-Type': 'application/json' 
        } 
      }
    );

    let content;
    if (response.data && response.data.generated_text) {
      content = response.data.generated_text;
    } else if (Array.isArray(response.data) && response.data[0]) {
      content = response.data[0].generated_text;
    } else {
      const fallbackResponse = await axios.post(
      'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
      { inputs: prompt },
      { 
        headers: { 
          Authorization: `Bearer ${process.env.HUGGING_FACE_TOKEN_2}` // ✅ USE ENV VAR
        } 
      }
    );
      
      content = fallbackResponse.data.generated_text || 
                "Information about this topic is currently being updated. Please check back later.";
    }

    res.json({ success: true, content });
    
  } catch (error) {
    console.error("Error fetching AI content:", error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching AI content',
      fallbackContent: `This topic relates to ocean conservation and marine ecosystems. Learn more about ${prompt} in our educational resources.`
    });
  }
});
const EducationalContentSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  imageUrl: String,
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const EducationalContent = mongoose.model('EducationalContent', EducationalContentSchema);

app.get('/educational-content', async (req, res) => {
  try {
    const content = await EducationalContent.find();
    res.json({ success: true, content });
  } catch (error) {
    console.error('Error fetching educational content:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/educational-content/:topic', async (req, res) => {
  try {
    const content = await EducationalContent.findOne({ topic: req.params.topic });
    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }
    res.json({ success: true, content });
  } catch (error) {
    console.error('Error fetching educational content:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

//REWARD
app.post('/claim-reward', authMiddleware, async (req, res) => {
  try {
    const {
      userId,
      userEmail,
      userName,
      rewardId,
      rewardTitle,
      pointsClaimed,
      claimId,
      claimDate,
      expiryDate,
      status
    } = req.body;

    const user = await User.findById(userId);
    const cleanups = await Cleanup.find({ email: user.email });
    const totalScore = cleanups.reduce((sum, cleanup) => sum + (cleanup.score || 0), 0);
    
    const previousClaims = await RewardClaim.find({ userId });
    const pointsAlreadyClaimed = previousClaims.reduce((sum, claim) => sum + claim.pointsClaimed, 0);
    
    const availablePoints = totalScore - pointsAlreadyClaimed;
    
    if (availablePoints < pointsClaimed) {
      return res.status(400).json({ 
        success: false, 
        message: 'Not enough points available to claim this reward'
      });
    }

    const newClaim = new RewardClaim({
      userId,
      userEmail,
      userName,
      rewardId,
      rewardTitle,
      pointsClaimed,
      claimId,
      claimDate: new Date(claimDate),
      expiryDate: new Date(expiryDate),
      status
    });

    await newClaim.save();

    const notification = new Notification({
      userName,
      title: 'Reward Claimed',
      message: `You have successfully claimed "${rewardTitle}" for ${pointsClaimed} points. Visit our office to collect your reward.`,
      type: 'reward',
      seen: false
    });

    await notification.save();

    res.status(201).json({ 
      success: true, 
      message: 'Reward claimed successfully',
      claim: newClaim
    });
  } catch (error) {
    console.error('Error claiming reward:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/update-score', authMiddleware, async (req, res) => {
  try {
    res.status(200).json({ 
      success: true, 
      message: 'Score updated successfully'
    });
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/verify-claim', authMiddleware, async (req, res) => {
  try {
    const { claimId } = req.body;
    
    const claim = await RewardClaim.findOne({ claimId });
    
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }
    
    if (claim.status === 'redeemed') {
      return res.status(400).json({ success: false, message: 'Claim already redeemed' });
    }
    
    if (claim.status === 'expired') {
      return res.status(400).json({ success: false, message: 'Claim has expired' });
    }
    
    res.status(200).json({ 
      success: true, 
      claim
    });
  } catch (error) {
    console.error('Error verifying claim:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/redeem-claim', authMiddleware, async (req, res) => {
  try {
    const { claimId } = req.body;
    
    const claim = await RewardClaim.findOne({ claimId });
    
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }
    
    if (claim.status === 'redeemed') {
      return res.status(400).json({ success: false, message: 'Claim already redeemed' });
    }
    
    if (claim.status === 'expired') {
      return res.status(400).json({ success: false, message: 'Claim has expired' });
    }
    
    claim.status = 'redeemed';
    claim.redeemedDate = new Date();
    await claim.save();
    
    const notification = new Notification({
      userName: claim.userName,
      title: 'Reward Redeemed',
      message: `You have successfully redeemed "${claim.rewardTitle}". Thank you for your contribution!`,
      type: 'reward',
      seen: false
    });
    
    await notification.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Claim redeemed successfully',
      updatedClaim: claim
    });
  } catch (error) {
    console.error('Error redeeming claim:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/user-claims', authMiddleware, async (req, res) => {
  try {
    const claims = await RewardClaim.find({ userId: req.user._id }).sort({ claimDate: -1 });
    res.status(200).json({ 
      success: true, 
      claims
    });
  } catch (error) {
    console.error('Error fetching user claims:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/detect-garbage', authMiddleware, async (req, res) => {
  const { imageBase64 } = req.body;
  
  console.log('🗑️ Garbage detection request received');
  console.log('📦 Payload size:', imageBase64 ? `${(imageBase64.length / 1024).toFixed(2)} KB` : 'No image');

  // Validate input
  if (!imageBase64) {
    return res.status(400).json({
      success: false,
      message: 'Image is required'
    });
  }

  // Check image size (optional but recommended)
  const imageSizeKB = imageBase64.length / 1024;
  if (imageSizeKB > 10240) { // 10MB limit
    return res.status(400).json({
      success: false,
      message: 'Image too large. Please upload an image smaller than 10MB.'
    });
  }

  const GEMINI_MODEL = "gemini-2.0-flash-exp";
  
  const systemInstruction = `You are an expert AI trained to identify and classify waste and garbage for ocean cleanup efforts.

Your task is to analyze images and determine:
1. Whether the image contains garbage/waste/trash
2. The specific type of garbage if present
3. Estimate environmental impact (for scoring)

GARBAGE CATEGORIES:
- "Plastic Bottles" - PET bottles, plastic containers
- "Plastic Bags" - Shopping bags, food wrappers
- "Food Waste" - Organic waste, food scraps
- "Metal Cans" - Aluminum cans, tin cans
- "Glass Bottles" - Glass containers, broken glass
- "Fishing Gear" - Nets, lines, hooks, buoys
- "Styrofoam" - Foam containers, packaging
- "Cigarette Butts" - Tobacco waste
- "Paper/Cardboard" - Paper waste, boxes
- "General Waste" - Mixed or unidentifiable trash

SCORING GUIDELINES (based on environmental impact):
- Fishing Gear: 80-100 points (high ocean impact)
- Plastic Bottles/Bags: 60-80 points (major pollutant)
- Styrofoam: 70-90 points (non-biodegradable)
- Metal/Glass: 50-70 points (recyclable but dangerous)
- Cigarette Butts: 60-80 points (toxic)
- Food Waste: 20-40 points (biodegradable)
- General Waste: 40-60 points

RESPONSE FORMAT (JSON only):
{
  "isGarbage": true/false,
  "garbageType": "category name",
  "confidence": "high/medium/low",
  "score": number,
  "reasoning": "brief explanation"
}

RULES:
- If image is clearly NOT garbage (nature, people, objects), return isGarbage: false
- Be strict but fair - obvious trash should be detected
- Consider ocean/beach cleanup context
- Return ONLY valid JSON, no markdown or extra text`;

  try {
    console.log('🚀 Calling Gemini Vision API...');
    
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { 
              text: "Analyze this image and determine if it contains garbage/waste. Return your analysis in JSON format." 
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
        maxOutputTokens: 500,
      }
    });

    let rawResponse = response.text?.trim() || '';
    
    console.log('🔍 Raw Gemini Response:', rawResponse.substring(0, 200));

    // Clean up the response
    rawResponse = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse JSON response
    let analysis;
    try {
      analysis = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response as JSON:', parseError);
      
      // Fallback detection
      const isGarbageLower = rawResponse.toLowerCase();
      const hasGarbage = isGarbageLower.includes('"isgarbage": true') || 
                        isGarbageLower.includes('garbage') || 
                        isGarbageLower.includes('waste') ||
                        isGarbageLower.includes('trash');
      
      if (!hasGarbage) {
        return res.status(200).json({
          success: true,
          isGarbage: false,
          message: "No garbage detected in the image"
        });
      }
      
      return res.status(200).json({
        success: true,
        isGarbage: true,
        garbageType: "General Waste",
        confidence: "medium",
        score: 50,
        message: "Garbage detected (AI analysis partial)"
      });
    }

    // Validate analysis structure
    if (!analysis || typeof analysis.isGarbage !== 'boolean') {
      console.error('⚠️ Invalid analysis structure:', analysis);
      
      return res.status(200).json({
        success: true,
        isGarbage: false,
        message: "Unable to analyze image properly"
      });
    }

    console.log('✅ Analysis complete:', analysis);

    return res.status(200).json({
      success: true,
      isGarbage: analysis.isGarbage,
      garbageType: analysis.garbageType || 'General Waste',
      confidence: analysis.confidence || 'medium',
      score: analysis.score || 50,
      reasoning: analysis.reasoning || 'Detected by AI analysis',
      message: analysis.isGarbage 
        ? `${analysis.garbageType} detected! Earn ${analysis.score} points for cleanup.`
        : "No garbage detected in this image"
    });

  } catch (error) {
    console.error('❌ Error calling Gemini Vision API:', error.message);
    
    // User-friendly error response
    return res.status(200).json({
      success: false,
      isGarbage: false,
      message: 'AI detection service temporarily unavailable. Please try again later.',
      error: 'service_unavailable'
    });
  }
});


///USER CHATSSSSSSSSSSSSSSSSSSSSS---------------------CHAT------------CHAT
app.post('/send-message', authMiddleware, async (req, res) => {
  try {
    const { text, sender, reportId, responderType } = req.body;

    const validationErrors = [];
    if (!text) validationErrors.push('Message text is required');
    if (!sender) validationErrors.push('Sender name is required');
    if (!reportId) validationErrors.push('Report ID is required');
    if (!responderType) validationErrors.push('Responder type is required');

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }

    try {
      const newMessage = new Message({
        text,
        sender,
        reportId,
        responderType,
        timestamp: new Date(),
        isRead: false
      });

      await newMessage.save()
        .catch(saveError => {
          console.error('Detailed save error:', saveError);
          console.error('Validation errors:', saveError.errors);
          throw saveError;
        });
      
      res.status(201).json({ 
        success: true, 
        message: 'Message sent successfully',
        data: newMessage
      });
    } catch (dbError) {
      console.error('Comprehensive database error:', {
        message: dbError.message,
        name: dbError.name,
        stack: dbError.stack,
        errors: dbError.errors
      });

      return res.status(500).json({ 
        success: false, 
        message: 'Failed to save message to database',
        detailedError: process.env.NODE_ENV === 'development' 
          ? {
              message: dbError.message,
              name: dbError.name,
              errors: dbError.errors
            } 
          : 'Database error'
      });
    }
  } catch (error) {
    console.error('Unhandled error in send-message endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Unexpected server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.post('/chat-history', authMiddleware, async (req, res) => {
  try {
    const { userName, responderType, reportId } = req.body;

    if (!reportId || !responderType || !userName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const chatHistory = await Message.find({
      reportId,
      responderType,
      $or: [
        { sender: userName },
        { sender: { $ne: userName } }
      ]
    }).sort({ timestamp: 1 });

    await Message.updateMany(
      { 
        reportId, 
        responderType,
        sender: { $ne: userName },
        isRead: false 
      },
      { isRead: true }
    );

    res.status(200).json({ 
      success: true, 
      chatHistory: chatHistory.map(msg => ({
        id: msg._id,
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp,
        isUser: msg.sender === userName
      }))
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/unread-messages', authMiddleware, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      sender: { $ne: req.user.name },
      isRead: false
    });

    res.status(200).json({ 
      success: true, 
      unreadCount: count
    });
  } catch (error) {
    console.error('Error counting unread messages:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/recent-chats', authMiddleware, async (req, res) => {
  try {
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user.name },
            { responderType: { $exists: true } }
          ]
        }
      },
      {
        $group: {
          _id: { reportId: "$reportId", responderType: "$responderType" },
          lastMessage: { $last: "$text" },
          lastTimestamp: { $max: "$timestamp" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ["$sender", req.user.name] },
                  { $eq: ["$isRead", false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { lastTimestamp: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({ 
      success: true, 
      conversations: conversations.map(conv => ({
        reportId: conv._id.reportId,
        responderType: conv._id.responderType,
        lastMessage: conv.lastMessage,
        lastTimestamp: conv.lastTimestamp,
        unreadCount: conv.unreadCount
      }))
    });
  } catch (error) {
    console.error('Error fetching recent chats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.delete('/delete-message', authMiddleware, async (req, res) => {
  try {
    const { messageId, reportId } = req.body;

    if (!messageId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message ID is required' 
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ 
        success: false, 
        message: 'Message not found' 
      });
    }

    if (message.sender !== req.user.name) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to delete this message' 
      });
    }

    if (message.reportId !== reportId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid report context' 
      });
    }

    await Message.findByIdAndDelete(messageId);

    res.status(200).json({ 
      success: true, 
      message: 'Message deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting message' 
    });
  }
});


//--------------------------------------------------------------------------------------------------------------------------
//RESPONDERS POV
//----------------------------------------------------------------------------------------------------------------------------

//RESPONDERS GROUPCHAT--------------------------CHATS
// Get all admin messages
app.get('/api/admin-groupchat', async (req, res) => {
  try {
    const adminMessages = await Message.find({ responderType: "Admin" })
      .sort({ timestamp: 1 });

    res.json({
      groupName: "USERS GROUPCHAT",
      messages: adminMessages
    });
  } catch (error) {
    console.error('Error fetching admin group chat:', error);
    res.status(500).json({ 
      error: 'Failed to fetch admin group chat',
      details: error.message 
    });
  }
});

// Send new admin message
app.post('/api/send-admin-message', async (req, res) => {
  try {
    const { messageText, senderName = 'Admin' } = req.body;

    if (!messageText) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const newMessage = new Message({
      text: messageText,
      sender: senderName,
      responderType: 'Admin',
      timestamp: new Date(),
      isRead: false,
      reportId: 'GROUP_CHAT' // Special ID for group chat messages
    });

    const savedMessage = await newMessage.save();

    res.status(201).json({ 
      message: 'Message sent successfully', 
      newMessage: savedMessage 
    });

  } catch (error) {
    console.error('Error sending admin message:', error);
    res.status(500).json({ 
      error: 'Failed to send admin message',
      details: error.message 
    });
  }
});

// Reply to a message
app.post('/api/reply-to-message', async (req, res) => {
  try {
    const { messageId, replyText } = req.body;

    if (!messageId || !replyText) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message ID and reply text are required' 
      });
    }

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({ 
        success: false, 
        message: 'Original message not found' 
      });
    }

    // Create reply object
    const reply = {
      _id: new mongoose.Types.ObjectId(),
      text: replyText,
      timestamp: new Date(),
      sender: 'Admin' // Or get from authenticated user
    };

    // Add reply to original message
    if (!originalMessage.replies) {
      originalMessage.replies = [];
    }
    originalMessage.replies.push(reply);
    originalMessage.hasReplies = true;

    await originalMessage.save();

    res.status(201).json({ 
      success: true,
      message: 'Reply added successfully', 
      reply: reply 
    });

  } catch (error) {
    console.error('Error replying to message:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to reply to message',
      error: error.message 
    });
  }
});

// Get all barangay messages
app.get('/api/barangay-groupchat', async (req, res) => {
  try {
    const barangayMessages = await Message.find({ responderType: "Barangay" })
      .sort({ timestamp: 1 });

    res.json({
      groupName: "USERS GROUPCHAT",
      messages: barangayMessages
    });
  } catch (error) {
    console.error('Error fetching barangay group chat:', error);
    res.status(500).json({ 
      error: 'Failed to fetch barangay group chat',
      details: error.message 
    });
  }
});

// Send new barangay message
app.post('/api/send-barangay-message', async (req, res) => {
  try {
    const { messageText, senderName = 'Barangay' } = req.body;

    if (!messageText) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const newMessage = new Message({
      text: messageText,
      sender: senderName,
      responderType: 'Barangay',
      timestamp: new Date(),
      isRead: false,
      reportId: 'GROUP_CHAT'
    });

    const savedMessage = await newMessage.save();

    res.status(201).json({ 
      message: 'Message sent successfully', 
      newMessage: savedMessage 
    });

  } catch (error) {
    console.error('Error sending barangay message:', error);
    res.status(500).json({ 
      error: 'Failed to send barangay message',
      details: error.message 
    });
  }
});

// Get all NGO messages
app.get('/api/ngo-groupchat', async (req, res) => {
  try {
    const ngoMessages = await Message.find({ responderType: "NGO" })
      .sort({ timestamp: 1 });
    res.json({
      groupName: "USERS GROUPCHAT",
      messages: ngoMessages
    });
  } catch (error) {
    console.error('Error fetching NGO group chat:', error);
    res.status(500).json({ 
      error: 'Failed to fetch NGO group chat',
      details: error.message 
    });
  }
});

// Send new NGO message
app.post('/api/send-ngo-message', async (req, res) => {
  try {
    const { messageText, senderName = 'NGO' } = req.body;
    if (!messageText) {
      return res.status(400).json({ error: 'Message text is required' });
    }
    const newMessage = new Message({
      text: messageText,
      sender: senderName,
      responderType: 'NGO',
      timestamp: new Date(),
      isRead: false,
      reportId: 'GROUP_CHAT'
    });
    const savedMessage = await newMessage.save();
    res.status(201).json({ 
      message: 'Message sent successfully', 
      newMessage: savedMessage 
    });
  } catch (error) {
    console.error('Error sending NGO message:', error);
    res.status(500).json({ 
      error: 'Failed to send NGO message',
      details: error.message 
    });
  }
});

// Get all PCG messages
app.get('/api/pcg-groupchat', async (req, res) => {
  try {
    const pcgMessages = await Message.find({ responderType: "PCG" })
      .sort({ timestamp: 1 });
    res.json({
      groupName: "USERS GROUPCHAT",
      messages: pcgMessages
    });
  } catch (error) {
    console.error('Error fetching PCG group chat:', error);
    res.status(500).json({ 
      error: 'Failed to fetch PCG group chat',
      details: error.message 
    });
  }
});

// Send new PCG message
app.post('/api/send-pcg-message', async (req, res) => {
  try {
    const { messageText, senderName = 'PCG' } = req.body;
    if (!messageText) {
      return res.status(400).json({ error: 'Message text is required' });
    }
    const newMessage = new Message({
      text: messageText,
      sender: senderName,
      responderType: 'PCG',
      timestamp: new Date(),
      isRead: false,
      reportId: 'GROUP_CHAT'
    });
    const savedMessage = await newMessage.save();
    res.status(201).json({ 
      message: 'Message sent successfully', 
      newMessage: savedMessage 
    });
  } catch (error) {
    console.error('Error sending PCG message:', error);
    res.status(500).json({ 
      error: 'Failed to send PCG message',
      details: error.message 
    });
  }
});

//ADMIN -----------------------------admin-------------------------------Admin----------

// Middleware to check if user is admin
const adminMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization');
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token, authorization denied' 
      });
    }

    const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    const responder = await Responder.findById(decoded.id);
    
    if (!responder || responder.responderType !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }

    req.responder = responder;
    next();
  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};
app.get('/api/users', async (req, res) => {
  try {
    console.log('Fetching all users...');
    
    const users = await User.find()
      .select('-password -verificationToken')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${users.length} users`);
    
    // Add status field (active/deactivated) if it doesn't exist
    const usersWithStatus = users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      gender: user.gender,
      isVerified: user.isVerified,
      status: user.status || 'active', // Default to active if not set
      role: 'user', // Regular users
      createdAt: user.createdAt
    }));
    
    res.status(200).json(usersWithStatus);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching users' 
    });
  }
});

// Get all responders
app.get('/api/responders', async (req, res) => {
  try {
    console.log('Fetching all responders...');
    
    const responders = await Responder.find()
      .select('-password -verificationToken')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${responders.length} responders`);
    
    const respondersWithStatus = responders.map(responder => ({
      _id: responder._id,
      name: responder.fullName,
      email: responder.email,
      responderType: responder.responderType,
      isVerified: responder.isVerified,
      status: responder.status || 'active',
      role: responder.responderType,
      createdAt: responder.createdAt
    }));
    
    res.status(200).json(respondersWithStatus);
  } catch (error) {
    console.error('Error fetching responders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching responders' 
    });
  }
});

// Get responder counts by type
app.get('/api/responder', async (req, res) => {
  try {
    const responders = await Responder.find();
    
    const counts = responders.reduce((acc, responder) => {
      const type = responder.responderType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    res.status(200).json(counts);
  } catch (error) {
    console.error('Error fetching responder counts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Toggle user status (activate/deactivate)
app.put('/api/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Toggle status
    const newStatus = user.status === 'active' ? 'deactivated' : 'active';
    user.status = newStatus;
    await user.save();
    
    console.log(`User ${user.email} status changed to ${newStatus}`);
    
    res.status(200).json({ 
      success: true, 
      message: `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      updatedUser: {
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Toggle responder status (activate/deactivate)
app.put('/api/responders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const responder = await Responder.findById(id);
    if (!responder) {
      return res.status(404).json({ 
        success: false, 
        message: 'Responder not found' 
      });
    }
    
    // Toggle status
    const newStatus = responder.status === 'active' ? 'deactivated' : 'active';
    responder.status = newStatus;
    await responder.save();
    
    console.log(`Responder ${responder.email} status changed to ${newStatus}`);
    
    res.status(200).json({ 
      success: true, 
      message: `Responder ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      updatedResponder: {
        _id: responder._id,
        name: responder.fullName,
        email: responder.email,
        status: responder.status
      }
    });
  } catch (error) {
    console.error('Error toggling responder status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Get deactivated users and responders
app.get('/api/deactivated', async (req, res) => {
  try {
    const deactivatedUsers = await User.find({ status: 'deactivated' })
      .select('-password -verificationToken');
    
    const deactivatedResponders = await Responder.find({ status: 'deactivated' })
      .select('-password -verificationToken');
    
    const allDeactivated = [
      ...deactivatedUsers.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        type: 'user',
        deactivatedAt: user.updatedAt
      })),
      ...deactivatedResponders.map(responder => ({
        _id: responder._id,
        name: responder.fullName,
        email: responder.email,
        type: 'responder',
        responderType: responder.responderType,
        deactivatedAt: responder.updatedAt
      }))
    ];
    
    res.status(200).json(allDeactivated);
  } catch (error) {
    console.error('Error fetching deactivated accounts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Get all reports for admin
app.get('/api/admin/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    const reportedItems = await Reported.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      reports,
      reportedItems
    });
  } catch (error) {
    console.error('Error fetching admin reports:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Get flagged reports
app.get('/api/admin/flagged-reports', async (req, res) => {
  try {
    // You can define what makes a report "flagged" based on your logic
    // For example: reports with certain keywords, multiple reports of same incident, etc.
    const flaggedReports = await Reported.find({ 
      // Add your flagging criteria here
      // Example: status: 'flagged' or urgency: 'high'
    }).sort({ createdAt: -1 });
    
    res.status(200).json(flaggedReports);
  } catch (error) {
    console.error('Error fetching flagged reports:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Get admin statistics/dashboard data
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const totalResponders = await Responder.countDocuments();
    const totalReports = await Report.countDocuments();
    const completedReports = await CompletedReport.countDocuments();
    const pendingReports = await Reported.countDocuments();
    
    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        deactivatedUsers: totalUsers - activeUsers,
        totalResponders,
        totalReports,
        completedReports,
        pendingReports
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// ============================================
// CHATBOT AI ENDPOINTS
// ============================================

// ============================================
// CHATBOT AI ENDPOINTS - FIXED VERSION
// ============================================

app.post('/api/chatbot', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message is required' 
      });
    }

    console.log('🤖 Chatbot request:', message);
    console.log('📝 Conversation history length:', conversationHistory.length);

    // Try OpenAI first (if available)
    if (openai && process.env.OPENAI_API_KEY) {
      try {
        // Build conversation context for OpenAI
        const messages = [
          {
            role: "system",
            content: `You are Sharkie, an enthusiastic and knowledgeable AI assistant for Ocean Guardians - a marine conservation mobile app platform.

🎭 YOUR PERSONALITY:
- Friendly, encouraging, and passionate about ocean conservation
- Use ocean-related emojis naturally: 🌊 🐋 🐠 🦈 🌍 💙 ♻️ 🧹 📱
- Keep responses concise (2-4 sentences for simple questions, up to 6 for complex topics)
- Be conversational and warm, like talking to a friend who cares
- Show genuine excitement when users want to help
- Use varied greetings and responses (don't be repetitive)

💡 YOUR EXPERTISE:
- Ocean pollution (plastics, chemicals, oil spills, microplastics)
- Marine life and ecosystems (coral reefs, endangered species, biodiversity)
- Illegal fishing and overfishing (dynamite fishing, cyanide fishing, poaching)
- Beach cleanups and conservation activities
- Waste management and recycling programs
- Environmental reporting and citizen science
- Reward systems and gamification for conservation
- Marine protected areas and conservation laws in the Philippines

📱 APP FEATURES YOU CAN EXPLAIN:
- AI Waste Detection - Identify types of ocean waste using camera
- Incident Reporting - Report pollution & illegal fishing to authorities
- Cleanup Scheduling - Schedule pickups or join beach cleanups
- Responder System - Connect with PCG, Barangay, NGOs
- Rewards Program - Earn points for cleanups and redeem prizes
- Donations - Donate recyclable materials
- Educational Resources - Learn about marine conservation
- Group Chat - Communicate with responders and other users

🎯 YOUR GOALS:
- Encourage users to take action (report, cleanup, donate, educate)
- Make ocean conservation feel achievable and rewarding
- Provide accurate information about marine issues
- Guide users through app features when needed
- Build enthusiasm for protecting the ocean

⚠️ GUIDELINES:
- If you don't know something specific, admit it but offer related helpful info
- For emergency situations (oil spills, mass fish kills), urgently encourage reporting
- Keep technical jargon minimal - explain in simple terms
- When users share concerns, validate their feelings before providing solutions
- Always end with an encouraging note or call to action

Remember: You're not just an info bot - you're a conservation advocate inspiring people to protect our oceans! 🌊`
          },
          // Add conversation history
          ...conversationHistory.slice(-6).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),
          // Add current message
          {
            role: "user",
            content: message
          }
        ];

        console.log('🚀 Sending request to OpenAI...');

        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: messages,
          max_tokens: 200,
          temperature: 0.8,
          presence_penalty: 0.6,
          frequency_penalty: 0.3,
        });

        const aiResponse = completion.choices[0].message.content.trim();
        
        console.log('✅ OpenAI Response:', aiResponse);

        return res.status(200).json({
          success: true,
          response: aiResponse,
          source: 'openai'
        });

      } catch (openaiError) {
        console.error('❌ OpenAI API error:', openaiError.message);
        console.log('🔄 Falling back to smart responses...');
        
        // If OpenAI fails, use smart fallback
        const lowerMessage = message.toLowerCase().trim();
        let aiResponse = '';
        
        // SMART CONTEXT-AWARE RESPONSES
        
        // Greetings
        if (lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon|good evening|greetings|howdy|sup|yo)\b/)) {
          const greetings = [
            "Hi there! 👋 I'm Sharkie, your ocean conservation buddy! How can I help you protect our beautiful oceans today?",
            "Hello! 🌊 Great to see you! I'm here to answer any questions about marine conservation. What would you like to know?",
            "Hey! 💙 I'm Sharkie, ready to help you make waves in ocean protection! What's on your mind?",
            "Greetings, ocean guardian! 🐋 I'm excited to help you learn about marine conservation. What can I do for you?"
          ];
          aiResponse = greetings[Math.floor(Math.random() * greetings.length)];
        }
        
        // How are you / status check
        else if (lowerMessage.match(/(how are you|how're you|hows it going|how's it going|what's up|whats up|wassup|how do you do)/)) {
          const responses = [
            "I'm doing great, thanks for asking! 🌊 I'm always energized when I can help someone protect our oceans. How about you - ready to make a difference today?",
            "I'm wonderful! 💙 Every conversation about ocean conservation makes my day. What would you like to know about protecting marine life?",
            "Feeling fantastic! 🐠 I love helping people learn about ocean conservation. Do you have any questions about how you can help?",
            "I'm swimming along nicely! 🦈 More importantly, how can I help YOU protect our oceans today?"
          ];
          aiResponse = responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Thank you
        else if (lowerMessage.match(/(thank you|thanks|thx|ty|appreciate|grateful|thank u)/)) {
          const responses = [
            "You're so welcome! 💙 Thank you for caring about our oceans! Every question and action counts. Need anything else?",
            "Happy to help! 🌊 Remember, you can always report pollution, join cleanups, or spread awareness through the app. What else can I do for you?",
            "My pleasure! 🐋 Keep up your amazing work protecting marine life. Feel free to ask me anything else!",
            "Anytime! 🌍 Together we're making a real difference for our oceans. What else would you like to know?"
          ];
          aiResponse = responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Pollution
        else if (lowerMessage.match(/(pollution|pollut|trash|garbage|waste|plastic|litter|debris|rubbish)/)) {
          aiResponse = "🌊 Ocean pollution is one of our biggest challenges! Here's how YOU can help:\n\n" +
            "📱 Report pollution through our app (with photos & location)\n" +
            "♻️ Reduce single-use plastics in daily life\n" +
            "🧹 Join beach cleanup events\n" +
            "📚 Educate others about proper waste disposal\n\n" +
            "Every piece of trash removed saves marine life! Want to report pollution now or learn more?";
        }
        
        // Marine life
        else if (lowerMessage.match(/(marine life|sea life|fish|whale|dolphin|shark|turtle|coral|ocean animals|sea creatures|biodiversity)/)) {
          aiResponse = "🐠 Our oceans are home to incredible biodiversity! Did you know:\n\n" +
            "🌊 Over 1 million marine species call the ocean home\n" +
            "🪸 Coral reefs support 25% of all marine life\n" +
            "⚠️ Pollution & illegal fishing threaten many species\n" +
            "📱 You can help by reporting threats through our app\n\n" +
            "Which marine animal are you most interested in? I'd love to tell you more! 🐋";
        }
        
        // Illegal fishing
        else if (lowerMessage.match(/(illegal fish|overfishing|poach|dynamite|blast fish|cyanide|illegal activity)/)) {
          aiResponse = "⚠️ Illegal fishing is devastating our oceans! Here's what to do:\n\n" +
            "📸 Document evidence safely (photos, location, time)\n" +
            "📱 Report through our app immediately\n" +
            "🚔 We notify authorities (PCG)\n" +
            "🌊 Your reports can save entire ecosystems!\n\n" +
            "Have you witnessed illegal fishing? I can guide you through reporting it step-by-step! 💪";
        }
        
        // How to help
        else if (lowerMessage.match(/(how can i help|how to help|what can i do|get involved|volunteer|participate|contribute|make a difference)/)) {
          aiResponse = "💚 I'm SO glad you want to help! Here are powerful ways to make waves:\n\n" +
            "1. 📱 Report pollution & illegal activities\n" +
            "2. 🧹 Join beach cleanups (earn rewards!)\n" +
            "3. ♻️ Donate recyclable materials\n" +
            "4. 📚 Learn & share conservation knowledge\n" +
            "5. 📢 Spread awareness to friends & family\n\n" +
            "Which one speaks to you? I can tell you exactly how to get started! 🌊";
        }
        
        // Cleanup events
        else if (lowerMessage.match(/(cleanup|clean up|beach clean|volunteer event|schedule|pickup)/)) {
          aiResponse = "🧹 Beach cleanups are amazing! Here's everything you need to know:\n\n" +
            "📅 Check the Schedule section for upcoming events\n" +
            "🧤 Bring reusable gloves & bags\n" +
            "📸 Take before/after photos\n" +
            "🏆 Earn points to redeem for rewards!\n\n" +
            "Ready to join our community of ocean guardians? Want help scheduling your first cleanup? 💙";
        }
        
        // Rewards
        else if (lowerMessage.match(/(reward|points|prize|earn|redeem|benefit|gift)/)) {
          aiResponse = "🏆 Our rewards motivate ocean heroes like you!\n\n" +
            "✨ Earn points by joining beach cleanups\n" +
            "🎯 Complete conservation challenges\n" +
            "🎁 Redeem points for eco-friendly prizes\n" +
            "📊 Track your impact on the leaderboard\n\n" +
            "Start making a difference and get rewarded! Want to know how many points you've earned? 💪";
        }
        
        // Reporting
        else if (lowerMessage.match(/(report|reporting|how to report|submit|flag|incident)/)) {
          aiResponse = "📱 Reporting is super easy! Follow these steps:\n\n" +
            "1️⃣ Open the Report section\n" +
            "2️⃣ Take clear photos of the incident\n" +
            "3️⃣ Add location & description\n" +
            "4️⃣ Select responder type (NGO, PCG, etc.)\n" +
            "5️⃣ Submit - authorities notified instantly!\n\n" +
            "Your reports trigger REAL conservation action! Have something to report now? 🚨";
        }
        
        // Education
        else if (lowerMessage.match(/(learn|education|teach|explain|information|tell me about|what is|facts)/)) {
          aiResponse = "📚 Knowledge is power! I can teach you about:\n\n" +
            "🌊 Ocean ecosystems & biodiversity\n" +
            "🗑️ Types of pollution & their impacts\n" +
            "🎣 Sustainable fishing practices\n" +
            "🌡️ Climate change & ocean health\n" +
            "✅ Conservation success stories\n\n" +
            "What topic fires you up? I love sharing ocean knowledge! 🐋";
        }
        
        // Donations
        else if (lowerMessage.match(/(donat|recycle|recycl|give|contribute materials)/)) {
          aiResponse = "♻️ Donations fuel our conservation efforts!\n\n" +
            "📦 Collect recyclables (plastic, metal, paper)\n" +
            "📅 Schedule pickup through the app\n" +
            "🚛 We collect & properly recycle\n" +
            "💚 Proceeds support ocean programs\n\n" +
            "Every donation, big or small, makes waves! Ready to schedule a pickup? 🌊";
        }
        
        // App features
        else if (lowerMessage.match(/(feature|function|what can|app|use|navigate|how does)/)) {
          aiResponse = "📱 Our app is packed with ocean-saving tools:\n\n" +
            "🤖 AI Waste Detection - Identify waste types\n" +
            "📝 Incident Reporting - Report violations\n" +
            "📅 Cleanup Scheduling - Join events\n" +
            "💬 Responder Chat - Talk to authorities\n" +
            "🏆 Rewards System - Earn for helping\n\n" +
            "Which feature would you like to explore? 🌊";
        }
        
        // Goodbye
        else if (lowerMessage.match(/(bye|goodbye|see you|see ya|later|gtg|got to go|gotta go)/)) {
          const responses = [
            "Goodbye, ocean hero! 👋 Keep protecting our seas! Reach out anytime. Stay awesome! 💙🌊",
            "See you later! 🐋 Thanks for being an ocean guardian. Every action counts - keep making waves!",
            "Take care! 💙 Remember: our oceans need heroes like you every day. Come back soon! 🌍",
            "Farewell, friend! 🐠 Keep up the amazing work. The ocean thanks you! 🌊✨"
          ];
          aiResponse = responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Questions - contextual help
        else if (lowerMessage.match(/^(what|when|where|why|who|how|can|could|should|would|is|are|do|does)/)) {
          aiResponse = "🤔 Great question! To give you the best answer, could you be more specific? Here's what I'm great at:\n\n" +
            "🌊 Ocean pollution & solutions\n" +
            "🐋 Marine life & ecosystems\n" +
            "⚠️ Illegal fishing & reporting\n" +
            "🧹 Beach cleanups & events\n" +
            "🏆 Rewards & points\n" +
            "📱 App features & how-tos\n\n" +
            "What specifically would you like to know? 💙";
        }
        
        // Default fallback - still helpful!
        else {
          const fallbacks = [
            "🌊 I'm here to help with ocean conservation! I can tell you about:\n\n• Reducing pollution 🗑️\n• Protecting marine life 🐋\n• Reporting violations ⚠️\n• Joining cleanups 🧹\n• Earning rewards 🏆\n\nWhat interests you most?",
            
            "💙 Hmm, I want to make sure I help you properly! I specialize in:\n\n• Ocean pollution solutions\n• Marine conservation tips\n• Beach cleanup events\n• Reporting system guide\n• Reward programs\n\nCould you rephrase your question?",
            
            "🐋 Let me help you protect our oceans! I'm best at:\n\n• Environmental reporting 📱\n• Cleanup schedules 📅\n• Marine life info 🐠\n• Waste management ♻️\n• Conservation tips 💡\n\nWhat would you like to explore?",
            
            "🌍 I'm Sharkie, your conservation buddy! Ask me about:\n\n• Pollution reporting 📝\n• Cleanup events 🧹\n• Marine ecosystems 🌊\n• Recycling programs ♻️\n• Earning rewards 🎁\n\nHow can I help your ocean journey?"
          ];
          aiResponse = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }
        
        console.log('✅ Smart Fallback Response:', aiResponse);

        return res.status(200).json({
          success: true,
          response: aiResponse,
          source: 'fallback'
        });
      } // ✅ FIXED: Proper closing of catch block
    } // ✅ FIXED: Proper closing of if block

    // If OpenAI is not available, use fallback directly
    const lowerMessage = message.toLowerCase().trim();
    let aiResponse = "🌊 I'm Sharkie, your ocean guardian assistant! I can help with pollution reporting, beach cleanups, marine life protection, and so much more. What would you like to know about protecting our beautiful oceans? 💙";
    
    return res.status(200).json({
      success: true,
      response: aiResponse,
      source: 'direct_fallback'
    });

  } catch (error) {
    console.error('❌ Chatbot critical error:', error);
    
    // Emergency fallback
    return res.status(200).json({
      success: true,
      response: '🌊 I\'m Sharkie, your ocean guardian assistant! I can help with pollution reporting, beach cleanups, marine life protection, and so much more. What would you like to know about protecting our beautiful oceans? 💙',
      source: 'emergency'
    });
  }
});

// Get conversation starters
app.get('/api/chatbot/suggestions', (req, res) => {
  res.status(200).json({
    success: true,
    suggestions: [
      "How can I help protect the ocean? 🌊",
      "Tell me about ocean pollution 🗑️",
      "How do I report illegal fishing? ⚠️",
      "When is the next beach cleanup? 🧹",
      "How do I earn rewards? 🏆",
      "What marine life is endangered? 🐋",
      "How do I donate recyclables? ♻️",
      "Explain ocean ecosystems 🌍"
    ]
  });
});

// Get top performers (users with highest cleanup scores)
app.get('/api/top-performers', async (req, res) => {
  try {
    console.log('Fetching top performers...');
    
    // Aggregate cleanup scores by user email
    const topPerformers = await Cleanup.aggregate([
      {
        $group: {
          _id: '$email',
          userName: { $first: '$userName' },
          totalScore: { $sum: '$score' },
          cleanupCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalScore: -1 }
      },
      {
        $limit: 10 // Top 10 performers
      },
      {
        $project: {
          _id: 0,
          email: '$_id',
          userName: 1,
          totalScore: 1,
          cleanupCount: 1
        }
      }
    ]);
    
    console.log(`Found ${topPerformers.length} top performers`);
    
    res.status(200).json({
      success: true,
      topPerformers
    });
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching top performers',
      error: error.message 
    });
  }
});

//BARANGAY---------------------------
app.get('/api/barangay-reports', async (req, res) => {
  try {
    console.log('📊 Fetching Barangay reports...');
    
    const barangayReports = await Reported.find({ responderType: "Barangay" })
      .sort({ createdAt: -1 }); // Sort by newest first
    
    console.log(`Found ${barangayReports.length} Barangay reports`);
    
    // Return array directly - the React Native code now handles this
    res.status(200).json(barangayReports);
  } catch (error) {
    console.error("❌ Error fetching Barangay reports:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching reports.",
      error: error.message 
    });
  }
});

app.get("/api/completed-reports-barangay", async (req, res) => {
  try {
    console.log('📊 Fetching Barangay completed reports...');
    
    const completedReports = await CompletedReport.find({ responderType: "Barangay" })
      .sort({ dateCompleted: -1 });
    
    console.log(`Found ${completedReports.length} Barangay completed reports`);
    
    res.status(200).json(completedReports);
  } catch (error) {
    console.error("Error fetching Barangay completed reports:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching completed reports.",
      error: error.message 
    });
  }
});

// DELETE Completed Report for Barangay
app.delete("/api/completed-reports-barangay/:id", async (req, res) => {
  try {
    const report = await CompletedReport.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: "Report not found" 
      });
    }
    
    console.log(`✅ Deleted Barangay completed report: ${req.params.id}`);
    res.json({ 
      success: true, 
      message: "Report deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while deleting report.",
      error: error.message 
    });
  }
});

// ✅ Fetch All Cancelled Reports for Barangay
app.get("/api/cancelled-reports-barangay", async (req, res) => {
  try {
    console.log('📊 Fetching Barangay cancelled reports...');
    
    const cancelledReports = await CancelledReport.find({ responderType: "Barangay" })
      .sort({ dateCancelled: -1 });
    
    console.log(`Found ${cancelledReports.length} Barangay cancelled reports`);
    
    res.status(200).json(cancelledReports);
  } catch (error) {
    console.error("Error fetching Barangay cancelled reports:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching cancelled reports.",
      error: error.message 
    });
  }
});

// DELETE Cancelled Report for Barangay
app.delete("/api/cancelled-reports-barangay/:id", async (req, res) => {
  try {
    const report = await CancelledReport.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: "Report not found" 
      });
    }
    
    console.log(`✅ Deleted Barangay cancelled report: ${req.params.id}`);
    res.json({ 
      success: true, 
      message: "Report deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while deleting report.",
      error: error.message 
    });
  }
});



//NGO----------------------------------------------NGO----------------------------------------NGO
// Fetch reports assigned to NGO
app.get('/api/ngo-reports', async (req, res) => {
  try {
    console.log('📊 Fetching NGO reports...');
    
    const ngoReports = await Reported.find({ responderType: "NGO" })
      .sort({ createdAt: -1 }); // Sort by newest first
    
    console.log(`Found ${ngoReports.length} NGO reports`);
    
    // Return array directly - React Native expects an array
    res.status(200).json(ngoReports);
  } catch (error) {
    console.error("❌ Error fetching NGO reports:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching reports.",
      error: error.message 
    });
  }
});

// Fetch All Ongoing Reports for NGO
app.get("/api/ongoing-reports-ngo", async (req, res) => {
  try {
    console.log('📊 Fetching NGO ongoing reports...');
    
    const ongoingReports = await OngoingReport.find({ responderType: "NGO" })
      .sort({ dateOngoing: -1 });
    
    console.log(`Found ${ongoingReports.length} NGO ongoing reports`);
    
    res.status(200).json(ongoingReports);
  } catch (error) {
    console.error("Error fetching NGO ongoing reports:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching ongoing reports.",
      error: error.message 
    });
  }
});

// Delete NGO Report
app.delete('/api/ngo-reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedReport = await Reported.findByIdAndDelete(id);

    if (!deletedReport) {
      return res.status(404).json({ 
        success: false, 
        message: "Report not found." 
      });
    }

    console.log(`✅ Deleted NGO report: ${id}`);
    res.json({ 
      success: true, 
      message: "Report deleted successfully!" 
    });
  } catch (error) {
    console.error("Error deleting NGO report:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while deleting report.",
      error: error.message 
    });
  }
});

app.get("/api/completed-reports-ngo", async (req, res) => {
  try {
    console.log('📊 Fetching NGO completed reports...');
    
    const completedReports = await CompletedReport.find({ responderType: "NGO" })
      .sort({ dateCompleted: -1 });
    
    console.log(`Found ${completedReports.length} NGO completed reports`);
    
    res.status(200).json(completedReports);
  } catch (error) {
    console.error("Error fetching NGO completed reports:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching completed reports.",
      error: error.message 
    });
  }
});

app.delete("/api/completed-reports-ngo/:id", async (req, res) => {
  try {
    const report = await CompletedReport.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: "Report not found" 
      });
    }
    
    console.log(`✅ Deleted NGO completed report: ${req.params.id}`);
    res.json({ 
      success: true, 
      message: "Report deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while deleting report.",
      error: error.message 
    });
  }
});

// ✅ Fetch All Cancelled Reports for NGO
app.get("/api/cancelled-reports-ngo", async (req, res) => {
  try {
    console.log('📊 Fetching NGO cancelled reports...');
    
    const cancelledReports = await CancelledReport.find({ responderType: "NGO" })
      .sort({ dateCancelled: -1 });
    
    console.log(`Found ${cancelledReports.length} NGO cancelled reports`);
    
    res.status(200).json(cancelledReports);
  } catch (error) {
    console.error("Error fetching NGO cancelled reports:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching cancelled reports.",
      error: error.message 
    });
  }
});

// DELETE Cancelled Report for NGO
app.delete("/api/cancelled-reports-ngo/:id", async (req, res) => {
  try {
    const report = await CancelledReport.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: "Report not found" 
      });
    }
    
    console.log(`✅ Deleted NGO cancelled report: ${req.params.id}`);
    res.json({ 
      success: true, 
      message: "Report deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while deleting report.",
      error: error.message 
    });
  }
});

//====================PCG======================PCG---------------------PCG
app.get("/api/completed-reports-pcg", async (req, res) => {
  try {
    console.log('📊 Fetching PCG completed reports...');
    
    const completedReports = await CompletedReport.find({ responderType: "PCG" })
      .sort({ dateCompleted: -1 });
    
    console.log(`Found ${completedReports.length} PCG completed reports`);
    
    res.status(200).json(completedReports);
  } catch (error) {
    console.error("Error fetching PCG completed reports:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching completed reports.",
      error: error.message 
    });
  }
});

// DELETE Completed Report for PCG
app.delete("/api/completed-reports-pcg/:id", async (req, res) => {
  try {
    const report = await CompletedReport.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: "Report not found" 
      });
    }
    
    console.log(`✅ Deleted PCG completed report: ${req.params.id}`);
    res.json({ 
      success: true, 
      message: "Report deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while deleting report.",
      error: error.message 
    });
  }
});

// ✅ Fetch All Cancelled Reports for PCG
app.get("/api/cancelled-reports-pcg", async (req, res) => {
  try {
    console.log('📊 Fetching PCG cancelled reports...');
    
    const cancelledReports = await CancelledReport.find({ responderType: "PCG" })
      .sort({ dateCancelled: -1 });
    
    console.log(`Found ${cancelledReports.length} PCG cancelled reports`);
    
    res.status(200).json(cancelledReports);
  } catch (error) {
    console.error("Error fetching PCG cancelled reports:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching cancelled reports.",
      error: error.message 
    });
  }
});

// DELETE Cancelled Report for PCG
app.delete("/api/cancelled-reports-pcg/:id", async (req, res) => {
  try {
    const report = await CancelledReport.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: "Report not found" 
      });
    }
    
    console.log(`✅ Deleted PCG cancelled report: ${req.params.id}`);
    res.json({ 
      success: true, 
      message: "Report deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while deleting report.",
      error: error.message 
    });
  }
});

app.put("/api/reports/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`Updating report ${id} to status: ${status}`);

    // Find the report in Reported collection
    const report = await Reported.findById(id);
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: "Report not found." 
      });
    }

    console.log("Fetched report:", report);

    // ✅ FIX 1: Get BOTH userName AND userEmail
    const userName = report.reportedBy;
    if (!userName) {
      console.error("Error: ReportedBy is missing for report ID:", report._id);
      return res.status(400).json({ 
        success: false, 
        message: "ReportedBy field is missing for this report." 
      });
    }

    // ✅ FIX 2: Find the user to get their email
    const user = await User.findOne({ name: userName });
    const userEmail = user ? user.email : null;

    if (!userEmail) {
      console.error("⚠️ Warning: Could not find email for user:", userName);
      // Continue anyway - notification will fail but status will still update
    }

    if (status === "Completed") {
      // ✅ Move report to CompletedReports
      const completedReport = new CompletedReport({
        ...report.toObject(),
        dateCompleted: new Date(),
        status: "Completed"
      });

      await completedReport.save();
      await Reported.findByIdAndDelete(id);
      console.log(`✅ Report ID: ${id} moved to CompletedReports.`);
    } 
    else if (status === "Ongoing") {
      // ✅ Move to OngoingReports (if not already moved)
      const existingOngoingReport = await OngoingReport.findOne({ _id: id });

      if (!existingOngoingReport) {
        const ongoingReport = new OngoingReport({
          ...report.toObject(),
          dateOngoing: new Date(),
          status: "Ongoing"
        });

        await ongoingReport.save();
        await Reported.findByIdAndDelete(id);
        console.log(`✅ Report ID: ${id} moved to OngoingReports.`);
      }
    } 
    else if (status === "Cancelled") {
      // ✅ Move report to CancelledReports
      const cancelledReport = new CancelledReport({
        ...report.toObject(),
        dateCancelled: new Date(),
        status: "Cancelled"
      });

      await cancelledReport.save();
      await Reported.findByIdAndDelete(id);
      console.log(`✅ Report ID: ${id} moved to CancelledReports.`);
    } 
    else {
      // Just update status without moving
      report.status = status;
      report.statusUpdatedAt = new Date();
      await report.save();
      console.log(`✅ Report status updated to: ${status}`);
    }

    // ✅ FIX 3: Create notification with proper type enum value AND userEmail
    if (userEmail) {
      try {
        const notification = new Notification({
          userName,
          userEmail, // ✅ ADDED: Required field
          title: 'Report Status Update',
          message: `Your report has been updated to "${status}".`,
          type: 'report', // ✅ FIXED: Use valid enum value 'report' instead of incident type
          seen: false,
          reportId: report._id
        });

        await notification.save();
        console.log("✅ Notification saved successfully");
      } catch (notifError) {
        console.error("⚠️ Failed to create notification:", notifError.message);
        // Don't fail the request if notification fails
      }
    } else {
      console.log("⚠️ Skipping notification - user email not found");
    }

    res.json({ 
      success: true, 
      message: "Status updated successfully!", 
      report 
    });
  } catch (error) {
    console.error("❌ Error updating status:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while updating status.",
      error: error.message 
    });
  }
});


// ✅ Fetch All Ongoing Reports (with optional responderType filter)
app.get("/api/ongoing-reports", async (req, res) => {
  try {
    const { responderType } = req.query;
    const filter = responderType ? { responderType } : {};
    
    const ongoingReports = await OngoingReport.find(filter)
      .sort({ dateOngoing: -1 });
    
    console.log(`Found ${ongoingReports.length} ongoing reports`);
    res.json(ongoingReports);
  } catch (error) {
    console.error("Error fetching ongoing reports:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching ongoing reports.",
      error: error.message 
    });
  }
});

// ✅ Fetch All Cancelled Reports (with optional responderType filter)
app.get("/api/cancelled-reports", async (req, res) => {
  try {
    const { responderType } = req.query;
    const filter = responderType ? { responderType } : {};
    
    const cancelledReports = await CancelledReport.find(filter)
      .sort({ dateCancelled: -1 });
    
    console.log(`Found ${cancelledReports.length} cancelled reports`);
    res.json(cancelledReports);
  } catch (error) {
    console.error("Error fetching cancelled reports:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching cancelled reports.",
      error: error.message 
    });
  }
});

// DELETE Completed Report
app.delete("/api/completed-reports/:id", async (req, res) => {
  try {
    const report = await CompletedReport.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: "Report not found" 
      });
    }
    
    console.log(`✅ Deleted completed report: ${req.params.id}`);
    res.json({ 
      success: true, 
      message: "Report deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while deleting report.",
      error: error.message 
    });
  }
});

app.get('/api/pcg-reports-pcg', async (req, res) => {
  try {
    console.log('📊 ===== PCG REPORTS REQUEST START =====');
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('📍 Endpoint: /api/pcg-reports-pcg');
    console.log('🔍 Query params:', req.query);
    console.log('🌐 Origin:', req.headers.origin);
    
    // Find all reports where responderType is "PCG"
    const pcgReports = await Reported.find({ responderType: "PCG" })
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance
    
    console.log(`✅ Found ${pcgReports.length} PCG reports`);
    
    if (pcgReports.length > 0) {
      console.log('📄 First report sample:', {
        id: pcgReports[0]._id,
        type: pcgReports[0].type,
        reportedBy: pcgReports[0].reportedBy,
        status: pcgReports[0].status
      });
    }
    
    // CRITICAL: Set proper headers BEFORE sending response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Return array directly (React Native expects an array)
    res.status(200).json(pcgReports);
    
    console.log('✅ ===== PCG REPORTS REQUEST COMPLETE =====\n');
    
  } catch (error) {
    console.error("❌ ===== PCG REPORTS ERROR =====");
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // ALWAYS return valid JSON even on error
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching PCG reports.",
      error: error.message,
      reports: [] // Send empty array as fallback
    });
    
    console.error("❌ ===== PCG REPORTS ERROR END =====\n");
  }
});

// ✅ UPDATE PCG REPORT STATUS
app.put('/api/reports/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`📝 Updating report ${id} to status: ${status}`);

    // Validate status
    const validStatuses = ["Pending", "Ongoing", "Completed", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Find the report in Reported collection
    const report = await Reported.findById(id);
    if (!report) {
      console.log(`❌ Report not found: ${id}`);
      return res.status(404).json({ 
        success: false, 
        message: "Report not found." 
      });
    }

    console.log("✅ Fetched report:", {
      id: report._id,
      type: report.type,
      currentStatus: report.status,
      reportedBy: report.reportedBy
    });

    // Get user info for notification
    const userName = report.reportedBy?.trim();
    if (!userName) {
      console.error("⚠️ Warning: ReportedBy is missing for report ID:", report._id);
    }

    // Find user email
    let userEmail = null;
    if (userName) {
      const user = await User.findOne({ 
        name: new RegExp(`^${userName}$`, 'i') 
      });
      userEmail = user ? user.email : null;
    }

    // Handle different status transitions
    if (status === "Completed") {
      // Move report to CompletedReports
      const completedReport = new CompletedReport({
        ...report.toObject(),
        _id: undefined, // Let MongoDB generate new ID
        dateCompleted: new Date(),
        status: "Completed"
      });

      await completedReport.save();
      await Reported.findByIdAndDelete(id);
      console.log(`✅ Report ${id} moved to CompletedReports`);
    } 
    else if (status === "Ongoing") {
      // Check if already in OngoingReports
      const existingOngoing = await OngoingReport.findOne({ 
        reportedBy: report.reportedBy,
        type: report.type,
        address: report.address,
        dateReported: report.dateReported
      });

      if (!existingOngoing) {
        const ongoingReport = new OngoingReport({
          ...report.toObject(),
          _id: undefined,
          dateOngoing: new Date(),
          status: "Ongoing"
        });

        await ongoingReport.save();
        await Reported.findByIdAndDelete(id);
        console.log(`✅ Report ${id} moved to OngoingReports`);
      } else {
        console.log(`⚠️ Report already in OngoingReports`);
      }
    } 
    else if (status === "Cancelled") {
      // Move report to CancelledReports
      const cancelledReport = new CancelledReport({
        ...report.toObject(),
        _id: undefined,
        dateCancelled: new Date(),
        status: "Cancelled"
      });

      await cancelledReport.save();
      await Reported.findByIdAndDelete(id);
      console.log(`✅ Report ${id} moved to CancelledReports`);
    } 
    else {
      // Just update status without moving (e.g., Pending)
      report.status = status;
      report.statusUpdatedAt = new Date();
      await report.save();
      console.log(`✅ Report status updated to: ${status}`);
    }

    // Create notification if user email exists
    if (userName && userEmail) {
      try {
        const notification = new Notification({
          userName: userName,
          userEmail: userEmail,
          title: 'Report Status Update',
          message: `Your report has been updated to "${status}" by PCG.`,
          type: 'report',
          seen: false,
          read: false,
          reportId: report._id
        });

        await notification.save();
        console.log("✅ Notification created successfully");
      } catch (notifError) {
        console.error("⚠️ Failed to create notification:", notifError.message);
        // Don't fail the request if notification fails
      }
    }

    res.status(200).json({ 
      success: true, 
      message: `Report status updated to "${status}" successfully!`,
      updatedStatus: status
    });

  } catch (error) {
    console.error("❌ Error updating report status:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while updating status.",
      error: error.message 
    });
  }
});

// ✅ DELETE PCG REPORT
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deleting report: ${id}`);
    
    // Try to find and delete from Reported collection
    let deletedReport = await Reported.findByIdAndDelete(id);
    
    // If not found, try OngoingReport
    if (!deletedReport) {
      deletedReport = await OngoingReport.findByIdAndDelete(id);
    }
    
    // If still not found, try CompletedReport
    if (!deletedReport) {
      deletedReport = await CompletedReport.findByIdAndDelete(id);
    }
    
    if (!deletedReport) {
      console.log(`❌ Report not found: ${id}`);
      return res.status(404).json({ 
        success: false, 
        message: "Report not found in any collection." 
      });
    }

    console.log(`✅ Report deleted successfully: ${id}`);
    
    res.status(200).json({ 
      success: true, 
      message: "Report deleted successfully!",
      deletedReport: {
        id: deletedReport._id,
        type: deletedReport.type,
        reportedBy: deletedReport.reportedBy
      }
    });
    
  } catch (error) {
    console.error("❌ Error deleting report:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while deleting report.",
      error: error.message 
    });
  }
});

// ✅ GET PCG REPORTS STATISTICS
app.get('/api/pcg-reports/stats', async (req, res) => {
  try {
    console.log('📊 Fetching PCG reports statistics...');
    
    // Count reports by status
    const totalReports = await Reported.countDocuments({ responderType: "PCG" });
    const ongoingReports = await OngoingReport.countDocuments({ responderType: "PCG" });
    const completedReports = await CompletedReport.countDocuments({ responderType: "PCG" });
    const cancelledReports = await CancelledReport.countDocuments({ responderType: "PCG" });
    
    // Count by incident type
    const reportsByType = await Reported.aggregate([
      { $match: { responderType: "PCG" } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    const stats = {
      total: totalReports,
      pending: totalReports,
      ongoing: ongoingReports,
      completed: completedReports,
      cancelled: cancelledReports,
      byType: reportsByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };
    
    console.log('✅ PCG stats:', stats);
    
    res.status(200).json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('❌ Error fetching PCG stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching statistics',
      error: error.message 
    });
  }
});

// ✅ DEBUG ENDPOINT: Check database connection and data
app.get('/api/pcg-reports/debug', async (req, res) => {
  try {
    console.log('🔍 ===== PCG DEBUG ENDPOINT =====');
    
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    console.log('Database state:', dbStates[dbState]);
    
    // Count all reports
    const totalReported = await Reported.countDocuments();
    const pcgReported = await Reported.countDocuments({ responderType: "PCG" });
    
    // Get sample PCG report
    const sampleReport = await Reported.findOne({ responderType: "PCG" }).lean();
    
    // Get all unique responder types
    const responderTypes = await Reported.distinct('responderType');
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      database: {
        state: dbStates[dbState],
        connected: dbState === 1
      },
      collections: {
        totalReported,
        pcgReported,
        responderTypes
      },
      sampleReport: sampleReport ? {
        id: sampleReport._id,
        type: sampleReport.type,
        reportedBy: sampleReport.reportedBy,
        responderType: sampleReport.responderType,
        status: sampleReport.status,
        createdAt: sampleReport.createdAt
      } : null
    };
    
    console.log('Debug info:', debugInfo);
    console.log('🔍 ===== PCG DEBUG END =====');
    
    res.status(200).json({
      success: true,
      debug: debugInfo
    });
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


console.log('✅ PCG Report endpoints registered successfully');
// ============================================
// PCG ONGOING REPORTS ENDPOINT 
// ============================================

// ✅ Fetch All Ongoing Reports for PCG
app.get("/api/ongoing-reports-pcg", async (req, res) => {
  try {
    console.log('📊 Fetching PCG ongoing reports...');
    
    // Find all ongoing reports where responderType is "PCG"
    const ongoingReports = await OngoingReport.find({ responderType: "PCG" })
      .sort({ dateOngoing: -1 }); // Sort by newest first
    
    console.log(`✅ Found ${ongoingReports.length} PCG ongoing reports`);
    
    // Return array directly (React Native expects an array)
    res.status(200).json(ongoingReports);
    
  } catch (error) {
    console.error("❌ Error fetching PCG ongoing reports:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching ongoing reports.",
      error: error.message 
    });
  }
});


// ✅ Delete Ongoing Report (if needed)
app.delete("/api/ongoing-reports/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedReport = await OngoingReport.findByIdAndDelete(id);
    
    if (!deletedReport) {
      return res.status(404).json({ 
        success: false, 
        message: "Ongoing report not found" 
      });
    }
    
    console.log(`✅ Deleted ongoing report: ${id}`);
    
    res.status(200).json({ 
      success: true, 
      message: "Ongoing report deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting ongoing report:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while deleting report.",
      error: error.message 
    });
  }
});

// ✅ Get Ongoing Reports Statistics for PCG Dashboard
app.get("/api/ongoing-reports-pcg/stats", async (req, res) => {
  try {
    const totalOngoing = await OngoingReport.countDocuments({ responderType: "PCG" });
    
    // Count by incident type
    const byType = await OngoingReport.aggregate([
      { $match: { responderType: "PCG" } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      stats: {
        totalOngoing,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error("Error fetching ongoing reports stats:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error fetching statistics" 
    });
  }
});

// ============================================
// PCG SETTINGS ENDPOINTS
// ============================================

// Get PCG settings/profile by email
app.get('/api/pcg-settings', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email parameter is required' 
      });
    }

    console.log('📋 Fetching PCG settings for:', email);

    // Find the PCG responder by email
    const pcgResponder = await Responder.findOne({ 
      email: email,
      responderType: 'pcg'
    });

    if (!pcgResponder) {
      return res.status(404).json({ 
        success: false, 
        message: 'PCG account not found' 
      });
    }

    // Return PCG info (excluding password and sensitive data)
    res.status(200).json({
      name: pcgResponder.fullName || '',
      address: pcgResponder.address || '',
      contactNumber: pcgResponder.contactNumber || '',
      email: pcgResponder.email || '',
    });

  } catch (error) {
    console.error('❌ Error fetching PCG settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching PCG settings',
      error: error.message 
    });
  }
});

// Update PCG profile
app.put('/api/pcg-settings', async (req, res) => {
  try {
    const { email, name, address, contactNumber } = req.body;

    console.log('📝 Updating PCG profile for:', email);

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Validate required fields
    if (!name || !address || !contactNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields (name, address, contactNumber) are required' 
      });
    }

    // Find and update the PCG responder
    const pcgResponder = await Responder.findOne({ 
      email: email,
      responderType: 'pcg'
    });

    if (!pcgResponder) {
      return res.status(404).json({ 
        success: false, 
        message: 'PCG account not found' 
      });
    }

    // Update fields
    pcgResponder.fullName = name;
    pcgResponder.address = address;
    pcgResponder.contactNumber = contactNumber;

    await pcgResponder.save();

    console.log('✅ PCG profile updated successfully');

    res.status(200).json({ 
      success: true, 
      message: 'Profile updated successfully',
      updatedProfile: {
        name: pcgResponder.fullName,
        address: pcgResponder.address,
        contactNumber: pcgResponder.contactNumber,
        email: pcgResponder.email
      }
    });

  } catch (error) {
    console.error('❌ Error updating PCG profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating PCG profile',
      error: error.message 
    });
  }
});

// Update PCG password
app.put('/api/pcg-settings/password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    console.log('🔒 Password change request for:', email);

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Find PCG responder
    const pcgResponder = await Responder.findOne({ 
      email: email,
      responderType: 'pcg'
    });

    if (!pcgResponder) {
      return res.status(404).json({ 
        success: false, 
        message: 'PCG account not found' 
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, pcgResponder.password);

    if (!isPasswordValid) {
      console.log('⚠️ Invalid current password');
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    pcgResponder.password = hashedNewPassword;
    await pcgResponder.save();

    console.log('✅ PCG password updated successfully');

    res.status(200).json({ 
      success: true, 
      message: 'Password updated successfully' 
    });

  } catch (error) {
    console.error('❌ Error updating PCG password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating password',
      error: error.message 
    });
  }
});

// Get PCG account statistics (optional - for dashboard)
app.get('/api/pcg-settings/stats', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email parameter is required' 
      });
    }

    // Get statistics for this PCG account
    const totalReports = await Reported.countDocuments({ responderType: 'PCG' });
    const ongoingReports = await OngoingReport.countDocuments({ responderType: 'PCG' });
    const completedReports = await CompletedReport.countDocuments({ responderType: 'PCG' });
    const cancelledReports = await CancelledReport.countDocuments({ responderType: 'PCG' });

    res.status(200).json({
      success: true,
      stats: {
        totalReports,
        ongoingReports,
        completedReports,
        cancelledReports,
        pendingReports: totalReports
      }
    });

  } catch (error) {
    console.error('❌ Error fetching PCG stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching statistics',
      error: error.message 
    });
  }
});



app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.setHeader('Content-Type', 'application/json');
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

///NASA HULI LAGI DAPAT TO
///NASA HULI LAGI DAPAT TO
const PORT = process.env.PORT || 5000;
// Root endpoint - Health check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🌊 BlueGuard API is running',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    endpoints: {
      health: '/health',
      status: '/status',
      auth: {
        login: '/login',
        register: '/register'
      },
      reports: '/api/pcg-reports-pcg',
      notifications: '/notifications',
      chatbot: '/api/chatbot'
    }
  });
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🌐 CORS enabled for web and mobile`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  connectDB();
});