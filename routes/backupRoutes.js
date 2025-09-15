import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  getSummary,
  getPreviewData,
  exportToExcel,
  restoreFromExcel,
  getBackupHistory,
  deleteBackupLog
} from '../controllers/backuprestorecontroller.js';

const router = express.Router();

// Fix __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'backups');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('Created backup upload directory:', uploadDir);
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${originalName}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log('File upload - Name:', file.originalname, 'Type:', file.mimetype);
    
    // Check file extension and mimetype
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      console.log('File accepted:', file.originalname);
      cb(null, true);
    } else {
      console.log('File rejected:', file.originalname, 'Type:', file.mimetype);
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: error.message });
  } else if (error.message === 'Only Excel files (.xlsx, .xls) are allowed') {
    return res.status(400).json({ error: error.message });
  }
  next(error);
};

// Add CORS middleware specifically for backup routes
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Routes

// Health check endpoint
router.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({
    status: 'OK',
    backupSystem: 'Active',
    timestamp: new Date().toISOString(),
    supportedFormats: ['xlsx', 'xls'],
    availableDataTypes: [
      'customers',
      'vouchers',
      'employees',
      'jewels'
    ]
  });
});

// Get summary of all data types
router.get('/summary', async (req, res) => {
  try {
    console.log('Summary requested');
    await getSummary(req, res);
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

// Get preview data for specific data type
router.get('/data/:dataType', async (req, res) => {
  try {
    console.log('Preview data requested for:', req.params.dataType);
    await getPreviewData(req, res);
  } catch (error) {
    console.error('Preview data error:', error);
    res.status(500).json({ error: 'Failed to get preview data' });
  }
});

// Get backup history
router.get('/history', async (req, res) => {
  try {
    console.log('Backup history requested');
    await getBackupHistory(req, res);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to get backup history' });
  }
});

// Export data to Excel - FIXED ROUTE
router.get('/export/:dataType', async (req, res) => {
  try {
    console.log('Export requested for:', req.params.dataType);
    console.log('Request headers:', req.headers);
    
    // Validate dataType
    const validTypes = ['customers', 'vouchers', 'employees', 'jewels'];
    if (!validTypes.includes(req.params.dataType)) {
      return res.status(400).json({ error: `Invalid data type: ${req.params.dataType}` });
    }
    
    await exportToExcel(req, res);
  } catch (error) {
    console.error('Export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export data: ' + error.message });
    }
  }
});

// Import/restore data from Excel
router.post('/restore/:dataType', 
  upload.single('file'), 
  handleMulterError,
  async (req, res) => {
    try {
      console.log('Restore requested for:', req.params.dataType);
      console.log('File received:', req.file ? req.file.originalname : 'No file');
      
      // Validate dataType
      const validTypes = ['customers', 'vouchers', 'employees', 'jewels'];
      if (!validTypes.includes(req.params.dataType)) {
        return res.status(400).json({ error: `Invalid data type: ${req.params.dataType}` });
      }
      
      await restoreFromExcel(req, res);
    } catch (error) {
      console.error('Restore error:', error);
      res.status(500).json({ error: 'Failed to restore data: ' + error.message });
    }
  }
);

// Delete backup log entry
router.delete('/history/:id', async (req, res) => {
  try {
    console.log('Delete backup log requested for:', req.params.id);
    await deleteBackupLog(req, res);
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete backup log' });
  }
});

// Test upload endpoint
router.post('/test-upload',
  upload.single('file'),
  handleMulterError,
  (req, res) => {
    console.log('Test upload:', req.file);
    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: req.file ? {
        originalname: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : null
    });
  }
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Backup route error:', error);
  if (!res.headersSent) {
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

export default router;