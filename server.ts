import express from 'express';
import http from 'http';
import socketIo from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import webpush from 'web-push';
import { Pool } from 'pg';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Get the port from environment variables or default to 3001
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Configure CORS for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://javoucar-frontend.onrender.com', 
        'https://javoucar-backend.onrender.com', 
        'https://javoucar.onrender.com',
        'https://javoucar-frontend.onrender.com/',
        'https://javoucar-backend.onrender.com/',
        'https://javoucar.onrender.com/',
        'https://javoucarsistem.onrender.com',
        'https://javoucarsistem.onrender.com/'
      ]
    : "*",
  methods: ["GET", "POST"],
  credentials: true
};

const io = new socketIo.Server(server, {
  cors: corsOptions
});

// Configure Web Push
// These keys should be generated once and stored securely
// You can generate them with: npx web-push generate-vapid-keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BNOJyTgwrEbzMOXG60VG4K0tl7B6lFv7pTo8008tBF6GB1Hq6v-GkU2H87HkK8T0c94SFx2E5FcWPpR5gXsfQ4w',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'p95w3_W86jBO64sI4b48Rm3dsPDi610O57SGsNf2nws'
};

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Configure PostgreSQL connection with fallback to mock database
let pool: Pool | null = null;
let useMockDatabase = true;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });
    
    // Test the connection
    pool.query('SELECT NOW()', (err) => {
      if (err) {
        console.error('Database connection failed:', err);
      } else {
        console.log('Database connected successfully');
        useMockDatabase = false;
      }
    });
  } catch (error) {
    console.error('Error configuring database:', error);
  }
}

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/', (req: express.Request, res: express.Response) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'JávouCar Backend is running',
    timestamp: new Date().toISOString(),
    port: PORT,
    database: useMockDatabase ? 'mock' : 'postgresql'
  });
});

// Health check endpoint for Render
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Web Push public key endpoint
app.get('/vapid-public-key', (req: express.Request, res: express.Response) => {
  res.status(200).json({ 
    publicKey: vapidKeys.publicKey
  });
});

// Mock database (for development without PostgreSQL)
interface MockUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface MockVehicle {
  id: string;
  plate: string;
  model: string;
  color: string;
  state: string;
  userId: string;
}

interface MockAlert {
  id: string;
  targetPlate: string;
  message: string;
  senderId: string;
  timestamp: Date;
}

const mockUsers: MockUser[] = [];
const mockVehicles: MockVehicle[] = [];
const mockAlerts: MockAlert[] = [];

// Initialize database tables (only if using PostgreSQL)
const initializeDatabase = async () => {
  if (useMockDatabase || !pool) {
    console.log('Using mock database for development');
    return;
  }
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        plate VARCHAR(20) NOT NULL,
        model VARCHAR(255) NOT NULL,
        color VARCHAR(50) NOT NULL,
        state VARCHAR(2) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        target_plate VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        sender_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Data models
interface User {
  id: number | string;
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface Vehicle {
  id: number | string;
  plate: string;
  model: string;
  color: string;
  state: string;
  userId: number | string;
}

interface Alert {
  id: number | string;
  targetPlate: string;
  message: string;
  senderId: number | string;
  timestamp: Date;
}

// Helper functions (with fallback to mock database)
const findUserByPlate = async (plate: string): Promise<User | null> => {
  if (useMockDatabase || !pool) {
    const vehicle = mockVehicles.find(v => v.plate === plate);
    if (!vehicle) return null;
    return mockUsers.find(u => u.id === vehicle.userId) || null;
  }
  
  try {
    const result = await pool.query(
      `SELECT u.* FROM users u 
       JOIN vehicles v ON u.id = v.user_id 
       WHERE v.plate = $1`,
      [plate]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding user by plate:', error);
    return null;
  }
};

// Helper function to find vehicle by plate
const findVehicleByPlate = async (plate: string): Promise<Vehicle | null> => {
  if (useMockDatabase || !pool) {
    return mockVehicles.find(v => v.plate === plate) || null;
  }
  
  try {
    const result = await pool.query('SELECT * FROM vehicles WHERE plate = $1', [plate]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding vehicle by plate:', error);
    return null;
  }
};

// Routes
// POST /auth/register: Recebe nome, email, telefone, senha. Retorna um token de sessão.
app.post('/auth/register', async (req: express.Request, res: express.Response) => {
  try {
    const { name, email, phone, password } = req.body;
    
    // Validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (useMockDatabase || !pool) {
      // Check if user already exists (mock database)
      if (mockUsers.some(u => u.email === email)) {
        return res.status(409).json({ error: 'User already exists' });
      }
      
      // Create user (mock database)
      const newUser: MockUser = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        email,
        phone,
        password // In a real app, this should be hashed
      };
      
      mockUsers.push(newUser);
      
      // Return session token (in a real app, this would be a JWT)
      const token = `token_${newUser.id}`;
      
      res.status(201).json({ 
        success: true,
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone
        }
      });
      return;
    }
    
    // Check if user already exists (PostgreSQL)
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    // Create user (PostgreSQL)
    const result = await pool.query(
      'INSERT INTO users (name, email, phone, password) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone',
      [name, email, phone, password] // In a real app, this should be hashed
    );
    
    const newUser = result.rows[0];
    
    // Return session token (in a real app, this would be a JWT)
    const token = `token_${newUser.id}`;
    
    res.status(201).json({ 
      success: true,
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /push-subscription: Save push subscription for a user
app.post('/push-subscription', (req: express.Request, res: express.Response) => {
  try {
    const { subscription } = req.body;
    const authHeader = req.headers.authorization;
    
    // In a real app, we would verify the token
    // For this demo, we'll just extract the user ID from the token
    if (!authHeader || !authHeader.startsWith('Bearer token_')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Note: In a real implementation, we would store the subscription in the database
    // For this demo, we'll just log it
    console.log('Push subscription received:', subscription);
    
    res.status(200).json({ 
      success: true,
      message: 'Push subscription saved'
    });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /vehicles: Recebe placa, modelo, cor, estado. Vincula ao usuário logado.
app.post('/vehicles', async (req: express.Request, res: express.Response) => {
  try {
    const { plate, model, color, state } = req.body;
    const authHeader = req.headers.authorization;
    
    // In a real app, we would verify the token
    // For this demo, we'll just extract the user ID from the token
    if (!authHeader || !authHeader.startsWith('Bearer token_')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userId = authHeader.split(' ')[1].replace('token_', '');
    
    // Validation
    if (!plate || !model || !color || !state) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (useMockDatabase || !pool) {
      // Check if vehicle already exists (mock database)
      if (mockVehicles.some(v => v.plate === plate)) {
        return res.status(409).json({ error: 'Vehicle already registered' });
      }
      
      // Create vehicle (mock database)
      const newVehicle: MockVehicle = {
        id: Math.random().toString(36).substr(2, 9),
        plate,
        model,
        color,
        state,
        userId
      };
      
      mockVehicles.push(newVehicle);
      
      res.status(201).json({ 
        success: true,
        vehicle: {
          id: newVehicle.id,
          plate: newVehicle.plate,
          model: newVehicle.model,
          color: newVehicle.color,
          state: newVehicle.state,
          userId: newVehicle.userId
        }
      });
      return;
    }
    
    // Check if vehicle already exists (PostgreSQL)
    const existingVehicle = await pool.query('SELECT * FROM vehicles WHERE plate = $1', [plate]);
    if (existingVehicle.rows.length > 0) {
      return res.status(409).json({ error: 'Vehicle already registered' });
    }
    
    // Create vehicle (PostgreSQL)
    const result = await pool.query(
      'INSERT INTO vehicles (plate, model, color, state, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [plate, model, color, state, userId]
    );
    
    const newVehicle = result.rows[0];
    
    res.status(201).json({ 
      success: true,
      vehicle: {
        id: newVehicle.id,
        plate: newVehicle.plate,
        model: newVehicle.model,
        color: newVehicle.color,
        state: newVehicle.state,
        userId: newVehicle.user_id
      }
    });
  } catch (error) {
    console.error('Error registering vehicle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /alerts/send: Recebe a placa alvo e a mensagem.
app.post('/alerts/send', async (req: express.Request, res: express.Response) => {
  try {
    const { targetPlate, message } = req.body;
    const authHeader = req.headers.authorization;
    
    // In a real app, we would verify the token
    // For this demo, we'll just extract the user ID from the token
    if (!authHeader || !authHeader.startsWith('Bearer token_')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userId = authHeader.split(' ')[1].replace('token_', '');
    
    let sender: User | null = null;
    
    if (useMockDatabase || !pool) {
      // Get sender info (mock database)
      sender = mockUsers.find(u => u.id === userId) || null;
    } else {
      // Get sender info (PostgreSQL)
      const senderResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      sender = senderResult.rows[0] || null;
    }
    
    if (!sender) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Validation
    if (!targetPlate || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    let newAlert: Alert;
    
    if (useMockDatabase || !pool) {
      // Create alert (mock database)
      newAlert = {
        id: Math.random().toString(36).substr(2, 9),
        targetPlate,
        message,
        senderId: userId,
        timestamp: new Date()
      };
      
      mockAlerts.push(newAlert as MockAlert);
    } else {
      // Create alert (PostgreSQL)
      const result = await pool.query(
        'INSERT INTO alerts (target_plate, message, sender_id) VALUES ($1, $2, $3) RETURNING *',
        [targetPlate, message, userId]
      );
      
      newAlert = {
        id: result.rows[0].id,
        targetPlate: result.rows[0].target_plate,
        message: result.rows[0].message,
        senderId: result.rows[0].sender_id,
        timestamp: result.rows[0].created_at
      };
    }
    
    // Find target user and vehicle
    const targetUser = await findUserByPlate(targetPlate);
    const targetVehicle = await findVehicleByPlate(targetPlate);
    
    console.log(`Sending alert to plate ${targetPlate}`);
    console.log(`Target user found: ${!!targetUser}`);
    console.log(`Target vehicle found: ${!!targetVehicle}`);
    
    if (targetUser) {
      // Emit WebSocket event to target user with complete data
      io.to(`user_${targetUser.id}`).emit('alertReceived', {
        id: newAlert.id,
        message: newAlert.message,
        sender: {
          name: sender.name,
          phone: sender.phone
        },
        timestamp: newAlert.timestamp,
        vehicle: targetVehicle ? {
          plate: targetVehicle.plate,
          model: targetVehicle.model,
          color: targetVehicle.color
        } : null
      });
      
      console.log(`Alert sent to user ${targetUser.id} for plate ${targetPlate}`);
    } else {
      console.log(`No user found for plate ${targetPlate}`);
    }
    
    res.status(201).json({ 
      success: true,
      alert: newAlert
    });
  } catch (error) {
    console.error('Error sending alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WebSocket connection handling
io.on('connection', (socket: socketIo.Socket) => {
  console.log('User connected:', socket.id);
  
  // When a client wants to associate with a user ID
  socket.on('registerUser', (userId: string) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Initialize database and start server
initializeDatabase().then(() => {
  let currentPort = PORT;
  let serverStarted = false;

  const startServer = () => {
    if (serverStarted) return;
    
    server.listen(currentPort, () => {
      serverStarted = true;
      console.log('Server running on port ' + currentPort);
      console.log('Local: http://localhost:' + currentPort + '/');
      // Show the preferred network address
      console.log('Network: http://192.168.2.134:' + currentPort + '/');
    }).on('error', (err: Error) => {
      if ((err as any).code === 'EADDRINUSE') {
        console.log('Port ' + currentPort + ' is in use, trying ' + (currentPort + 1));
        currentPort++;
        if (currentPort < PORT + 10) { // Limit retries to avoid infinite loop
          setTimeout(startServer, 100);
        } else {
          console.error('Could not find an available port after 10 attempts');
          process.exit(1);
        }
      } else {
        console.error('Server failed to start:', err);
        process.exit(1);
      }
    });
  };
  
  startServer();
});