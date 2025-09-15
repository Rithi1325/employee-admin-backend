import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Fix __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models with better error handling
let BackupLog, Customer, Jewel, Voucher, Employee;

// FIXED: Better model loading with proper error handling
const importModel = async (modelPath, modelName) => {
  try {
    console.log(`Attempting to load ${modelName} from ${modelPath}...`);
    const module = await import(modelPath);
    if (module.default) {
      console.log(`✅ ${modelName} model loaded successfully`);
      return module.default;
    } else {
      console.warn(`⚠️ ${modelName} model loaded but no default export found`);
      return null;
    }
  } catch (error) {
    console.warn(`⚠️ ${modelName} model not found:`, error.message);
    return null;
  }
};

// FIXED: Load models with better error handling and verification
const loadModels = async () => {
  try {
    console.log('🔄 Loading models...');
    
    // Load BackupLog model first (most important)
    BackupLog = await importModel('../models/backuprestore.js', 'BackupLog');
    
    // Verify BackupLog model is working
    if (BackupLog) {
      try {
        // Test the model by counting documents
        const testCount = await BackupLog.countDocuments();
        console.log(`✅ BackupLog model verified - found ${testCount} existing logs`);
      } catch (testError) {
        console.error('❌ BackupLog model test failed:', testError.message);
        // Try to create the collection if it doesn't exist
        try {
          const testLog = new BackupLog({
            type: 'export',
            dataType: 'customers',
            filename: 'test_connection.xlsx'
          });
          await testLog.validate(); // Just validate, don't save
          console.log('✅ BackupLog model structure is valid');
        } catch (validationError) {
          console.error('❌ BackupLog model validation failed:', validationError.message);
        }
      }
    }
    
    // Load other models
    Customer = await importModel('../models/Customer.js', 'Customer');
    Jewel = await importModel('../models/Jewel.js', 'Jewel');
    Voucher = await importModel('../models/Voucher.js', 'Voucher');
    Employee = await importModel('../models/Employee.js', 'Employee');
    
    console.log('📊 Model loading summary:');
    console.log('- BackupLog:', BackupLog ? '✅ Loaded' : '❌ Failed');
    console.log('- Customer:', Customer ? '✅ Loaded' : '❌ Failed');
    console.log('- Jewel:', Jewel ? '✅ Loaded' : '❌ Failed');
    console.log('- Voucher:', Voucher ? '✅ Loaded' : '❌ Failed');
    console.log('- Employee:', Employee ? '✅ Loaded' : '❌ Failed');
    
  } catch (error) {
    console.error('❌ Error loading models:', error);
  }
};

// Load models immediately
await loadModels();

// Model mapping - only include models that exist in your project
const modelMapping = {
  customers: Customer,
  jewels: Jewel,
  vouchers: Voucher,
  employees: Employee
};

// FIXED: Enhanced backup log helper functions
const createBackupLog = async (logData) => {
  if (!BackupLog) {
    console.warn('⚠️ BackupLog model not available, skipping log creation');
    return null;
  }
  
  try {
    console.log('📝 Creating backup log:', logData);
    
    // Ensure required fields are present
    const completeLogData = {
      type: logData.type || 'export',
      dataType: logData.dataType || 'unknown',
      filename: logData.filename || 'unknown.xlsx',
      userId: logData.userId || null,
      status: 'pending',
      recordCount: 0,
      metadata: logData.metadata || {}
    };
    
    const log = new BackupLog(completeLogData);
    const savedLog = await log.save();
    console.log('✅ Backup log created successfully:', savedLog._id);
    return savedLog;
  } catch (error) {
    console.error('❌ Error creating backup log:', error);
    console.error('Log data that failed:', logData);
    return null;
  }
};

const updateBackupLog = async (log, updates) => {
  if (!log || !BackupLog) {
    console.warn('⚠️ Cannot update backup log - log or model not available');
    return null;
  }
  
  try {
    console.log('📝 Updating backup log:', log._id, 'with:', updates);
    
    // Update the log object
    Object.assign(log, updates);
    const savedLog = await log.save();
    console.log('✅ Backup log updated successfully:', savedLog._id);
    return savedLog;
  } catch (error) {
    console.error('❌ Error updating backup log:', error);
    console.error('Update data that failed:', updates);
    return null;
  }
};

// Get summary of all data types
export const getSummary = async (req, res) => {
  try {
    console.log('📊 Getting data summary...');
    const summary = {};
    
    for (const [key, model] of Object.entries(modelMapping)) {
      if (model) {
        try {
          const count = await model.countDocuments();
          summary[key] = count;
          console.log(`${key}: ${count} records`);
        } catch (error) {
          console.warn(`Error counting ${key}:`, error.message);
          summary[key] = 0;
        }
      } else {
        summary[key] = 0;
      }
    }
    
    console.log('📊 Data summary:', summary);
    res.status(200).json(summary);
  } catch (error) {
    console.error('❌ Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch data summary' });
  }
};

// Get preview data for a specific type
export const getPreviewData = async (req, res) => {
  try {
    const { dataType } = req.params;
    const limit = parseInt(req.query.limit) || 3;
    
    console.log(`👀 Getting preview data for: ${dataType}, limit: ${limit}`);
    
    const model = modelMapping[dataType];
    
    if (!model) {
      console.error(`❌ Invalid data type: ${dataType}`);
      return res.status(400).json({ error: `Invalid data type: ${dataType}` });
    }
    
    let data = [];
    
    try {
      if (dataType === 'vouchers' && Voucher) {
        data = await model.find({})
          .populate('customer', 'customerId fullName phoneNumber')
          .limit(limit)
          .lean();
      } else {
        data = await model.find({}).limit(limit).lean();
      }
      
      console.log(`✅ Found ${data.length} records for ${dataType}`);
    } catch (error) {
      console.error(`❌ Error fetching ${dataType} data:`, error);
      return res.status(500).json({ error: `Failed to fetch ${dataType} data` });
    }
    
    res.status(200).json({ 
      dataType,
      count: data.length,
      data: data.slice(0, limit)
    });
  } catch (error) {
    console.error('❌ Error fetching preview data:', error);
    res.status(500).json({ error: 'Failed to fetch preview data' });
  }
};

// Export data to Excel - ENHANCED WITH BETTER LOGGING
export const exportToExcel = async (req, res) => {
  let backupLog = null;
  
  try {
    const { dataType } = req.params;
    
    console.log(`\n=== EXPORT STARTED ===`);
    console.log(`📤 Data type: ${dataType}`);
    console.log(`🔗 Request method: ${req.method}`);
    console.log(`🌐 Request URL: ${req.url}`);
    console.log(`📝 BackupLog model available: ${BackupLog ? 'Yes' : 'No'}`);
    
    const model = modelMapping[dataType];
    
    if (!model) {
      console.error(`❌ Invalid data type: ${dataType}`);
      return res.status(400).json({ error: `Invalid data type: ${dataType}` });
    }

    // FIXED: Create backup log entry with better error handling
    try {
      console.log('📝 Creating backup log entry...');
      backupLog = await createBackupLog({
        type: 'export',
        dataType,
        filename: '',  // Will be updated later
        userId: req.user?.id || null
      });
      
      if (backupLog) {
        console.log('✅ Backup log created:', backupLog._id);
      } else {
        console.warn('⚠️ Backup log creation failed, continuing without logging');
      }
    } catch (logError) {
      console.error('❌ Error creating backup log:', logError);
      console.warn('⚠️ Continuing export without logging');
    }

    let data = [];
    
    try {
      console.log(`📊 Fetching ${dataType} data from database...`);
      
      if (dataType === 'vouchers' && Voucher) {
        data = await model.find({})
          .populate('customer', 'customerId fullName phoneNumber fatherSpouse altPhoneNumber govIdType govIdNumber address')
          .lean();
      } else {
        data = await model.find({}).lean();
      }
      
      console.log(`✅ Successfully fetched ${data.length} records for ${dataType}`);
    } catch (error) {
      console.error(`❌ Error fetching ${dataType} data:`, error);
      if (backupLog) {
        await updateBackupLog(backupLog, {
          status: 'failed',
          errorMessage: `Failed to fetch ${dataType} data: ${error.message}`
        });
      }
      return res.status(500).json({ error: `Failed to fetch ${dataType} data: ${error.message}` });
    }
    
    if (data.length === 0) {
      console.warn(`⚠️ No data found for ${dataType}`);
      if (backupLog) {
        await updateBackupLog(backupLog, {
          status: 'failed',
          errorMessage: 'No data found to export'
        });
      }
      return res.status(404).json({ error: 'No data found to export' });
    }

    console.log('🔄 Processing data for Excel export...');

    // Clean data for Excel export
    const cleanData = data.map(item => {
      const { _id, __v, ...cleanItem } = item;
      
      Object.keys(cleanItem).forEach(key => {
        if (cleanItem[key] instanceof Date) {
          cleanItem[key] = cleanItem[key].toLocaleDateString('en-IN') + ' ' + 
                          cleanItem[key].toLocaleTimeString('en-IN');
        }
        if (key === 'customer' && cleanItem[key] && typeof cleanItem[key] === 'object') {
          cleanItem['customerId'] = cleanItem[key].customerId || '';
          cleanItem['customerName'] = cleanItem[key].fullName || '';
          cleanItem['customerPhone'] = cleanItem[key].phoneNumber || '';
          cleanItem['customerAddress'] = cleanItem[key].address || '';
          delete cleanItem[key];
        }
        if (cleanItem[key] && typeof cleanItem[key] === 'object' && cleanItem[key]._id) {
          cleanItem[key] = cleanItem[key]._id.toString();
        }
      });
      
      return cleanItem;
    });

    console.log('📊 Creating Excel workbook...');

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(cleanData);
    
    // Auto-adjust column widths
    const colWidths = [];
    if (cleanData.length > 0) {
      Object.keys(cleanData[0]).forEach((key, index) => {
        const maxLength = Math.max(
          key.length,
          ...cleanData.map(row => String(row[key] || '').length)
        );
        colWidths[index] = { wch: Math.min(maxLength + 2, 50) };
      });
      ws['!cols'] = colWidths;
    }
    
    XLSX.utils.book_append_sheet(wb, ws, dataType);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10) + '_' + 
      new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
    const filename = `${dataType}_backup_${timestamp}.xlsx`;
    
    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('📁 Created temp directory:', tempDir);
    }
    
    const filepath = path.join(tempDir, filename);
    console.log('💾 Writing file to:', filepath);
    
    try {
      XLSX.writeFile(wb, filepath);
      console.log('✅ Excel file created successfully');
    } catch (writeError) {
      console.error('❌ Error writing Excel file:', writeError);
      throw new Error('Failed to create Excel file: ' + writeError.message);
    }
    
    if (!fs.existsSync(filepath)) {
      throw new Error('Failed to create Excel file - file does not exist');
    }
    
    const fileStats = fs.statSync(filepath);
    console.log(`✅ File created successfully: ${filepath}, Size: ${fileStats.size} bytes`);
    
    // FIXED: Update backup log with better error handling
    if (backupLog) {
      try {
        await updateBackupLog(backupLog, {
          filename,
          recordCount: data.length,
          status: 'success',
          metadata: {
            fileSize: fileStats.size,
            originalName: filename,
            exportedAt: new Date(),
            recordsProcessed: data.length
          }
        });
        console.log('✅ Backup log updated successfully');
      } catch (updateError) {
        console.error('❌ Error updating backup log:', updateError);
      }
    }

    // Set headers for Excel download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileStats.size);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    console.log('📤 Sending file to client...');

    // Send file and clean up
    res.sendFile(filepath, (err) => {
      if (err) {
        console.error('❌ Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download file' });
        }
      } else {
        console.log('✅ File sent successfully');
      }
      
      // Clean up file after delay
      setTimeout(() => {
        try {
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            console.log('🧹 Temp file cleaned up:', filename);
          }
        } catch (cleanupError) {
          console.error('❌ Error cleaning up file:', cleanupError);
        }
      }, 30000);
    });

    console.log(`=== EXPORT COMPLETED ===\n`);

  } catch (error) {
    console.error('\n=== EXPORT ERROR ===');
    console.error('❌ Export error:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (backupLog) {
      try {
        await updateBackupLog(backupLog, {
          status: 'failed',
          errorMessage: error.message
        });
      } catch (updateError) {
        console.error('❌ Error updating backup log with failure:', updateError);
      }
    }
    
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export data: ' + error.message });
    }
    console.error('===================\n');
  }
};

// Restore data from Excel - ENHANCED
export const restoreFromExcel = async (req, res) => {
  let backupLog = null;
  
  try {
    const { dataType } = req.params;
    const { replaceExisting } = req.body;
    
    console.log(`\n=== RESTORE STARTED ===`);
    console.log(`📥 Starting restore for dataType: ${dataType}`);
    console.log('📄 Request file:', req.file ? req.file.originalname : 'No file');
    console.log(`📝 BackupLog model available: ${BackupLog ? 'Yes' : 'No'}`);
    
    const model = modelMapping[dataType];
    
    if (!model) {
      return res.status(400).json({ error: `Invalid data type: ${dataType}` });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // FIXED: Create backup log entry for import
    try {
      backupLog = await createBackupLog({
        type: 'import',
        dataType,
        filename: req.file.originalname,
        userId: req.user?.id || null,
        metadata: {
          fileSize: req.file.size,
          originalName: req.file.originalname,
          uploadedAt: new Date()
        }
      });
      
      if (backupLog) {
        console.log('✅ Restore backup log created:', backupLog._id);
      }
    } catch (logError) {
      console.error('❌ Error creating backup log:', logError);
    }

    console.log('📖 Reading Excel file:', req.file.path);

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${jsonData.length} records in Excel file`);

    if (jsonData.length === 0) {
      if (backupLog) {
        await updateBackupLog(backupLog, {
          status: 'failed',
          errorMessage: 'No data found in Excel file'
        });
      }
      return res.status(400).json({ error: 'No data found in Excel file' });
    }

    let imported = 0;
    let updated = 0;
    const errors = [];

    console.log('🔄 Processing records...');

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const record = jsonData[i];
        
        const cleanRecord = {};
        Object.keys(record).forEach(key => {
          if (record[key] !== null && record[key] !== undefined && record[key] !== '') {
            if (typeof record[key] === 'string' && record[key].includes('/') && record[key].includes(':')) {
              try {
                cleanRecord[key] = new Date(record[key]);
              } catch (e) {
                cleanRecord[key] = record[key];
              }
            } else {
              cleanRecord[key] = record[key];
            }
          }
        });

        let existingRecord = null;
        if (dataType === 'customers' && Customer) {
          if (cleanRecord.customerId) {
            existingRecord = await model.findOne({ customerId: cleanRecord.customerId });
          } else if (cleanRecord.phoneNumber) {
            existingRecord = await model.findOne({ phoneNumber: cleanRecord.phoneNumber });
          }
        } else if (dataType === 'jewels' && Jewel) {
          if (cleanRecord.itemId) {
            existingRecord = await model.findOne({ itemId: cleanRecord.itemId });
          }
        } else if (dataType === 'vouchers' && Voucher) {
          if (cleanRecord.billNo) {
            existingRecord = await model.findOne({ billNo: cleanRecord.billNo });
          }
        } else if (dataType === 'employees' && Employee) {
          if (cleanRecord.employeeId) {
            existingRecord = await model.findOne({ employeeId: cleanRecord.employeeId });
          }
        }

        if (existingRecord) {
          await model.findByIdAndUpdate(existingRecord._id, cleanRecord);
          updated++;
        } else {
          await model.create(cleanRecord);
          imported++;
        }
        
        if ((imported + updated) % 10 === 0) {
          console.log(`✅ Processed ${imported + updated} records...`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing record ${i + 1}:`, error.message);
        errors.push({
          row: i + 1,
          error: error.message,
          data: jsonData[i]
        });
      }
    }

    console.log(`📊 Import complete: ${imported} imported, ${updated} updated, ${errors.length} errors`);

    // FIXED: Update backup log with results
    if (backupLog) {
      try {
        await updateBackupLog(backupLog, {
          recordCount: imported + updated,
          status: errors.length === jsonData.length ? 'failed' : 'success',
          metadata: {
            ...backupLog.metadata,
            imported,
            updated,
            errors: errors.slice(0, 10),
            processedAt: new Date(),
            totalRecords: jsonData.length
          },
          errorMessage: errors.length === jsonData.length ? 'All records failed to import' : null
        });
        console.log('✅ Restore backup log updated successfully');
      } catch (updateError) {
        console.error('❌ Error updating restore backup log:', updateError);
      }
    }

    // Clean up uploaded file
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('🧹 Uploaded file cleaned up');
      }
    } catch (cleanupError) {
      console.error('❌ Error cleaning up uploaded file:', cleanupError);
    }

    console.log(`=== RESTORE COMPLETED ===\n`);

    res.json({
      success: true,
      result: {
        imported,
        updated,
        total: jsonData.length,
        errors
      }
    });

  } catch (error) {
    console.error('\n=== RESTORE ERROR ===');
    console.error('❌ Restore error:', error);
    
    if (backupLog) {
      try {
        await updateBackupLog(backupLog, {
          status: 'failed',
          errorMessage: error.message
        });
      } catch (updateError) {
        console.error('❌ Error updating backup log with failure:', updateError);
      }
    }
    
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('❌ Error cleaning up uploaded file:', cleanupError);
      }
    }
    
    console.error('===================\n');
    res.status(500).json({ error: 'Failed to restore data: ' + error.message });
  }
};

// FIXED: Get backup history with better error handling
export const getBackupHistory = async (req, res) => {
  try {
    console.log('📚 Fetching backup history...');
    
    if (!BackupLog) {
      console.warn('⚠️ BackupLog model not available, returning empty history');
      return res.json({
        history: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        },
        message: 'BackupLog model not available'
      });
    }

    const { dataType, type } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const filter = {};
    if (dataType && Object.keys(modelMapping).includes(dataType)) {
      filter.dataType = dataType;
    }
    if (type && ['export', 'import'].includes(type)) {
      filter.type = type;
    }

    console.log('🔍 Backup history filter:', filter);

    try {
      const history = await BackupLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'name email')
        .lean();

      const total = await BackupLog.countDocuments(filter);

      console.log(`✅ Found ${history.length} backup logs out of ${total} total`);

      res.json({
        history,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (queryError) {
      console.error('❌ Error querying backup logs:', queryError);
      res.status(500).json({ 
        error: 'Failed to fetch backup history',
        details: queryError.message 
      });
    }
  } catch (error) {
    console.error('❌ Error fetching backup history:', error);
    res.status(500).json({ error: 'Failed to fetch backup history' });
  }
};

// Delete backup log entry
export const deleteBackupLog = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting backup log:', id);
    
    if (!BackupLog) {
      return res.json({ message: 'Backup log deleted successfully (simulated - model not available)' });
    }
    
    const backupLog = await BackupLog.findById(id);
    if (!backupLog) {
      return res.status(404).json({ error: 'Backup log not found' });
    }

    // Delete associated file if it exists
    if (backupLog.filename) {
      const filepath = path.join(__dirname, '..', 'temp', backupLog.filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log('🧹 Deleted associated file:', backupLog.filename);
      }
    }

    await BackupLog.findByIdAndDelete(id);
    console.log('✅ Backup log deleted successfully');
    
    res.json({ message: 'Backup log deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting backup log:', error);
    res.status(500).json({ error: 'Failed to delete backup log' });
  }
};