// server.js - Complete Fixed Version
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// -------- Load env variables first --------
dotenv.config();

// -------- Fix __dirname in ES Modules --------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting server...');
console.log('MongoDB URI:', process.env.MONGO_URI ? 'Present' : 'Missing');
console.log('JWT Secret:', process.env.JWT_SECRET ? 'Present' : 'Missing');

// -------- Initialize app --------
const app = express();

// -------- Enhanced CORS configuration --------
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'x-auth-token'],
  exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type']
}));

// -------- Middleware --------
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// -------- Create necessary directories --------
const createDirectories = () => {
  const dirs = [
    path.join(__dirname, "uploads"),
    path.join(__dirname, "Uploads"),
    path.join(__dirname, "Uploads", "backups"),
    path.join(__dirname, "temp"),
    path.join(__dirname, "public")
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📂 Created directory: ${dir}`);
    }
  });
};
createDirectories();

// -------- Serve static files --------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads", express.static(path.join(__dirname, "Uploads")));
app.use("/temp", express.static(path.join(__dirname, "temp")));
app.use(express.static(path.join(__dirname, "public")));

// -------- JWT & Admin Middleware --------
export const protect = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "") || req.header("x-auth-token");
  if (!token) return res.status(401).json({ msg: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
};

export const authorize = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied. Admin privileges required." });
  }
  next();
};

// -------- Database Connection --------
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined');
    }

    mongoose.set("strictQuery", false);
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log("✅ MongoDB Connected");
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    return true;
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    throw err;
  }
};

// -------- Import Models after DB connection --------
let User = null;

const loadModels = async () => {
  try {
    const UserModel = await import("./models/User.js");
    User = UserModel.default;
    console.log("✅ User model loaded successfully");
  } catch (err) {
    console.error("❌ Failed to load User model:", err.message);
    throw err;
  }
};

// -------- Create Default Admin --------
const createDefaultAdmin = async () => {
  try {
    if (!User) {
      throw new Error('User model not loaded');
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not defined');
    }

    const adminExists = await User.findOne({ email: "admin@gmail.com" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await User.create({
        name: "Admin",
        email: "admin@gmail.com",
        password: hashedPassword,
        role: "admin",
      });
      console.log("✅ Default admin created");
      console.log("📧 Admin email: admin@gmail.com");
      console.log("🔑 Admin password: admin123");
    } else {
      console.log("ℹ️  Default admin already exists");
    }
  } catch (err) {
    console.error("❌ Error creating default admin:", err);
    throw err;
  }
};

// -------- Import optional dynamic routes --------
const importRoute = async (routePath, routeName) => {
  try {
    const route = await import(routePath);
    if (route.default) {
      console.log(`✅ ${routeName} loaded successfully.`);
      return route.default;
    } else {
      console.warn(`⚠️ ${routeName} loaded but no default export found.`);
      return null;
    }
  } catch (err) {
    console.warn(`⚠️ ${routeName} not found, skipping... Error: ${err.message}`);
    return null;
  }
};

// -------- Load all routes (ONLY EXISTING FILES) --------
const loadRoutes = async () => {
  const routes = {};
  
  // Define all possible routes - only load what exists
  const routeDefinitions = [
    { path: "./routes/authRoutes.js", name: "authRoutes", endpoint: "/api/auth" },
    { path: "./routes/employees.js", name: "employeeRoutes", endpoint: "/api/employees" },
    { path: "./routes/trashRoutes.js", name: "trashRoutes", endpoint: "/api/trash" },
    { path: "./routes/dateTimeRoutes.js", name: "dateTimeRoutes", endpoint: "/api/datetime" },
    { path: "./routes/jewelRoutes.js", name: "jewelRoutes", endpoint: "/api/jewels" },
    { path: "./routes/stockSummaryRoutes.js", name: "stockSummaryRoutes", endpoint: "/api/stock-summary" },
    { path: "./routes/personalLoanRoutes.js", name: "personalLoanRoutes", endpoint: "/api/personal-loans" },
    { path: "./routes/savedloandetailRoutes.js", name: "savedLoanDetailRoutes", endpoint: "/api/saved-loans" },
    { path: "./routes/collectionRoutes.js", name: "collectionRoutes", endpoint: "/api/collections" },
    { path: "./routes/overviewRoutes.js", name: "overviewRoutes", endpoint: "/api/overview" },
    { path: "./routes/backupRoutes.js", name: "backupRoutes", endpoint: "/api/backup" },
    { path: "./routes/customerRoutes.js", name: "customerRoutes", endpoint: "/api/customers" },
    { path: "./routes/loanRoutes.js", name: "loanRoutes", endpoint: "/api/loans" },
    { path: "./routes/financialYearRoutes.js", name: "financialYearRoutes", endpoint: "/api/financial-year" },
    { path: "./routes/jewelRateRoutes.js", name: "jewelRateRoutes", endpoint: "/api/jewel-rates" },
    { path: "./routes/interestRateRoutes.js", name: "interestRateRoutes", endpoint: "/api/interest-rates" },
    { path: "./routes/interestRoutes.js", name: "interestRoutes", endpoint: "/api/interest" },
    { path: "./routes/voucherRoutes.js", name: "voucherRoutes", endpoint: "/api/vouchers" },
    { path: "./routes/dayBookRoutes.js", name: "dayBookRoutes", endpoint: "/api/daybook" },
    { path: "./routes/ledgerRoutes.js", name: "ledgerRoutes", endpoint: "/api/ledger" }
  ];

  // Load each route
  for (const routeDef of routeDefinitions) {
    const handler = await importRoute(routeDef.path, routeDef.name);
    routes[routeDef.name] = {
      handler: handler,
      endpoint: routeDef.endpoint
    };
  }
  
  return routes;
};

// -------- Register all routes --------
const registerRoutes = async (routes) => {
  console.log('Registering routes...');
  
  // Register auth routes first
  if (routes.authRoutes?.handler) {
    app.use("/api/auth", routes.authRoutes.handler);
    console.log("✅ /api/auth route registered");
  } else {
    console.error("❌ No auth routes found - this will cause login failures!");
  }

  // Register trash routes with detailed logging
  if (routes.trashRoutes?.handler) {
    app.use("/api/trash", (req, res, next) => {
      console.log(`🗑️ TRASH API: ${req.method} ${req.originalUrl}`, {
        headers: {
          'authorization': req.headers.authorization ? 'Present' : 'Missing',
          'x-auth-token': req.headers['x-auth-token'] ? 'Present' : 'Missing'
        },
        body: req.method !== 'GET' ? req.body : undefined,
        query: req.query,
        timestamp: new Date().toISOString()
      });
      next();
    }, routes.trashRoutes.handler);
    console.log("✅ /api/trash route registered with detailed logging");
  } else {
    console.error("❌ TRASH ROUTES NOT FOUND - Trash functionality will not work!");
  }

  // Register employee routes
  if (routes.employeeRoutes?.handler) {
    app.use("/api/employees", routes.employeeRoutes.handler);
    console.log("✅ /api/employees route registered");
  } else {
    console.warn("⚠️ No employee routes found");
  }

  // Register all other routes
  Object.entries(routes).forEach(([routeName, routeData]) => {
    if (routeData.handler && routeData.endpoint && 
        !routeName.includes('auth') && 
        !routeName.includes('employee') &&
        !routeName.includes('trash')) {
      
      if (routeData.endpoint.includes('stock-summary') || 
          routeData.endpoint.includes('saved-loans') || 
          routeData.endpoint.includes('overview')) {
        app.use(routeData.endpoint, (req, res, next) => {
          console.log(`${routeData.endpoint} API: ${req.method} ${req.path}`, {
            query: req.query,
            timestamp: new Date().toISOString()
          });
          next();
        }, routeData.handler);
      } else {
        app.use(routeData.endpoint, routeData.handler);
      }
      
      console.log(`✅ ${routeData.endpoint} route registered`);
    }
  });
};

// -------- Utility Routes --------
const setupUtilityRoutes = () => {
  app.get('/', (req, res) => {
    res.json({ 
      message: '🏆 Loan & Jewelry Management API is running...', 
      version: '2.0.1',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        apiStatus: '/api-status',
        dbInfo: '/db-info',
        initStock: '/init-stock',
        testStock: '/test-stock',
        testAuth: '/test-auth',
        testTrash: '/test-trash',
        auth: '/api/auth',
        employees: '/api/employees',
        jewels: '/api/jewels',
        collections: '/api/collections',
        stockSummary: '/api/stock-summary',
        personalLoans: '/api/personal-loans',
        savedLoans: '/api/saved-loans',
        overview: '/api/overview',
        trash: '/api/trash',
        customers: '/api/customers',
        loans: '/api/loans',
        vouchers: '/api/vouchers',
        backup: '/api/backup'
      },
      status: 'Running'
    });
  });

  app.get('/test-trash', async (req, res) => {
    try {
      const trashController = await import('./controllers/trashController.js');
      
      res.json({
        trashTestSuccess: true,
        trashController: trashController ? 'Loaded' : 'Not loaded',
        availableFunctions: Object.keys(trashController),
        testTimestamp: new Date().toISOString(),
        trashApiEndpoint: '/api/trash',
        message: 'Trash functionality is available'
      });
      
    } catch (error) {
      res.status(500).json({
        trashTestSuccess: false,
        error: error.message,
        message: 'Trash functionality has issues',
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/test-auth', (req, res) => {
    res.json({
      message: 'Auth test endpoint',
      jwtSecret: process.env.JWT_SECRET ? 'Present' : 'Missing',
      mongoUri: process.env.MONGO_URI ? 'Present' : 'Missing',
      userModel: User ? 'Loaded' : 'Not loaded',
      timestamp: new Date().toISOString(),
      defaultAdmin: {
        email: 'admin@gmail.com',
        password: 'admin123'
      }
    });
  });

  app.get('/health', async (req, res) => {
    try {
      const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
      
      let userModelTest = 'Not available';
      if (User) {
        try {
          const count = await User.countDocuments();
          userModelTest = `Available (${count} users)`;
        } catch (error) {
          userModelTest = `Error: ${error.message}`;
        }
      }

      let trashModelTest = 'Not available';
      try {
        const Trash = (await import('./models/Trash.js')).default;
        const trashCount = await Trash.countDocuments();
        trashModelTest = `Available (${trashCount} items in trash)`;
      } catch (error) {
        trashModelTest = `Error: ${error.message}`;
      }

      res.json({
        status: 'healthy',
        uptime: Math.floor(process.uptime()),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: dbStatus,
        userModel: userModelTest,
        trashModel: trashModelTest,
        jwtSecret: process.env.JWT_SECRET ? 'Present' : 'Missing',
        mongoUri: process.env.MONGO_URI ? 'Present' : 'Missing'
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/db-info', async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(500).json({
          success: false,
          message: 'Database not connected'
        });
      }

      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionInfo = {};

      for (const collection of collections) {
        try {
          const count = await mongoose.connection.db.collection(collection.name).countDocuments();
          collectionInfo[collection.name] = {
            name: collection.name,
            count: count,
            type: collection.type || 'collection'
          };
        } catch (err) {
          collectionInfo[collection.name] = {
            name: collection.name,
            error: err.message
          };
        }
      }

      res.json({
        success: true,
        database: mongoose.connection.db.databaseName,
        collections: collectionInfo,
        totalCollections: collections.length,
        trashCollection: collectionInfo.trashes || { message: 'No trash collection found' },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get database info',
        error: error.message
      });
    }
  });

  app.get('/init-stock', async (req, res) => {
    try {
      console.log('Initializing stock summary...');
      
      const { createOrUpdateStockSummary } = await import('./controllers/stockSummaryController.js');
      
      const mockReq = { query: req.query, body: req.body, params: req.params };
      let responseData = null;
      let statusCode = 200;
      
      const mockRes = {
        json: (data) => { responseData = data; return mockRes; },
        status: (code) => { statusCode = code; return mockRes; }
      };
      
      await createOrUpdateStockSummary(mockReq, mockRes);
      
      res.status(statusCode).json({
        success: true,
        message: 'Stock summary initialization completed',
        result: responseData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Stock summary initialization failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize stock summary',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/test-stock', async (req, res) => {
    try {
      const { getStockSummary } = await import('./controllers/stockSummaryController.js');
      
      const mockReq = { query: { limit: req.query.limit || 5, page: 1, ...req.query } };
      let responseData = null;
      let statusCode = 200;
      
      const mockRes = {
        json: (data) => { responseData = data; return mockRes; },
        status: (code) => { statusCode = code; return mockRes; }
      };
      
      await getStockSummary(mockReq, mockRes);
      
      res.status(statusCode).json({
        testSuccess: true,
        testTimestamp: new Date().toISOString(),
        apiResponse: responseData,
        testQuery: mockReq.query
      });
      
    } catch (error) {
      res.status(500).json({
        testSuccess: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/api-status', (req, res) => {
    const routes = [
      { name: 'Authentication', path: '/api/auth', status: 'active' },
      { name: 'Employees', path: '/api/employees', status: 'active' },
      { name: 'Date Time', path: '/api/datetime', status: 'active' },
      { name: 'Jewels', path: '/api/jewels', status: 'active' },
      { name: 'Personal Loans', path: '/api/personal-loans', status: 'active' },
      { name: 'Saved Loans', path: '/api/saved-loans', status: 'active' },
      { name: 'Stock Summary', path: '/api/stock-summary', status: 'active' },
      { name: 'Collections', path: '/api/collections', status: 'active' },
      { name: 'Overview', path: '/api/overview', status: 'active' },
      { name: 'Trash', path: '/api/trash', status: 'active' }
    ];

    res.json({
      success: true,
      apiStatus: 'running',
      routes: routes,
      timestamp: new Date().toISOString(),
      version: '2.0.1'
    });
  });
};

// -------- Error handling middleware --------
const setupErrorHandling = () => {
  app.use((err, req, res, next) => {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    res.status(err.status || 500).json({
      status: 'error',
      message: err.message || 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: req.path
    });
  });

  app.use((req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      status: 'error',
      message: `Route ${req.originalUrl} not found`,
      timestamp: new Date().toISOString()
    });
  });
};

// -------- Main startup function --------
const startServer = async () => {
  try {
    console.log('🚀 Starting server initialization...');
    
    console.log('📡 Connecting to MongoDB...');
    await connectDB();
    
    console.log('📋 Loading models...');
    await loadModels();
    
    console.log('👤 Creating default admin...');
    await createDefaultAdmin();
    
    console.log('🛣️  Loading routes...');
    const routes = await loadRoutes();
    
    console.log('📝 Registering routes...');
    await registerRoutes(routes);
    
    console.log('⚙️  Setting up utility routes...');
    setupUtilityRoutes();
    
    console.log('🛡️  Setting up error handling...');
    setupErrorHandling();
    
    const PORT = process.env.PORT || 5000;
    console.log(`🚀 Starting server on port ${PORT}...`);
    
    const server = app.listen(PORT, () => {
      console.log('\n🎉 ================================');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 Server URL: http://localhost:${PORT}`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log(`📋 API Status: http://localhost:${PORT}/api-status`);
      console.log(`🧪 Test Auth: http://localhost:${PORT}/test-auth`);
      console.log(`🗑️  Test Trash: http://localhost:${PORT}/test-trash`);
      console.log('\n👤 Default Admin Credentials:');
      console.log('   📧 Email: admin@gmail.com');
      console.log('   🔑 Password: admin123');
      console.log('\n✅ All systems operational!');
      console.log('🎉 ================================\n');
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please free the port or choose another.`);
        process.exit(1);
      } else {
        console.error('❌ Server startup error:', err);
        process.exit(1);
      }
    });

    const gracefulShutdown = (signal) => {
      console.log(`Received ${signal}. Performing graceful shutdown...`);
      server.close(() => {
        console.log('Server closed.');
        mongoose.connection.close(() => {
          console.log('MongoDB connection closed.');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    process.on('uncaughtException', (err) => {
      console.error('❌ Uncaught Exception:', err);
      process.exit(1);
    });

    process.on('unhandledRejection', (err) => {
      console.error('❌ Unhandled Rejection:', err);
      process.exit(1);
    });

    return server;
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    console.log('\n🔍 Debug Information:');
    console.log('- Check if MongoDB is running');
    console.log('- Verify MONGO_URI in .env file');
    console.log('- Verify JWT_SECRET in .env file');
    console.log('- Check if auth routes exist');
    console.log('- Check if User model exists');
    console.log('- Check if trash routes exist');
    process.exit(1);
  }
};

startServer();

export default app;