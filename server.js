const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS so the API works from any port (Live Server 3000, 5500, or direct 5000)
app.use(cors());

// Parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname)));

// Admin route alias
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * Health Check Endpoint
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: 'sqlite'
  });
});

/**
 * Submit New Admission Enquiry or Demo Booking
 * POST /api/enquiries
 */
app.post('/api/enquiries', async (req, res) => {
  try {
    const { name, mobile, email, course, timing, message, source } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Student full name is required.' });
    }

    const cleanMobile = (mobile || '').toString().trim().replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) {
      return res.status(400).json({ success: false, error: 'A valid 10-digit mobile number is required.' });
    }

    if (!course || typeof course !== 'string' || course.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Please select an interested standard or course.' });
    }

    // Determine enquiry source
    let detectedSource = source || 'Website Enquiry';
    if (!source && message && message.includes('[FREE 2-DAY DEMO BOOKING]')) {
      detectedSource = 'Demo Class Booking';
    }

    const sql = `
      INSERT INTO enquiries (name, mobile, email, course, timing, message, status, source)
      VALUES (?, ?, ?, ?, ?, ?, 'New', ?)
    `;
    const params = [
      name.trim(),
      cleanMobile,
      (email || '').trim() || null,
      course.trim(),
      (timing || 'Flexible').trim(),
      (message || '').trim() || null,
      detectedSource
    ];

    const result = await db.runAsync(sql, params);

    console.log(`📥 [Enquiry #${result.id}] Received from ${name} (${cleanMobile}) for ${course}`);

    return res.status(201).json({
      success: true,
      id: result.id,
      message: 'Enquiry successfully submitted and recorded in database.'
    });
  } catch (error) {
    console.error('Error inserting enquiry:', error);
    return res.status(500).json({ success: false, error: 'Internal server error while saving enquiry.' });
  }
});

/**
 * Get All Enquiries (With search, filter, and pagination)
 * GET /api/enquiries
 */
app.get('/api/enquiries', async (req, res) => {
  try {
    const { search, status, source, limit = 100, offset = 0 } = req.query;

    let sql = 'SELECT * FROM enquiries WHERE 1=1';
    const params = [];

    if (status && status !== 'All') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (source && source !== 'All') {
      sql += ' AND source = ?';
      params.push(source);
    }

    if (search && search.trim().length > 0) {
      const q = `%${search.trim()}%`;
      sql += ' AND (name LIKE ? OR mobile LIKE ? OR email LIKE ? OR course LIKE ?)';
      params.push(q, q, q, q);
    }

    // Total count query
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countRow = await db.getAsync(countSql, params);
    const total = countRow ? countRow.count : 0;

    // Order & pagination
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const enquiries = await db.allAsync(sql, params);

    return res.json({
      success: true,
      total,
      count: enquiries.length,
      enquiries
    });
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve enquiries.' });
  }
});

/**
 * Get Single Enquiry by ID
 * GET /api/enquiries/:id
 */
app.get('/api/enquiries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const enquiry = await db.getAsync('SELECT * FROM enquiries WHERE id = ?', [id]);

    if (!enquiry) {
      return res.status(404).json({ success: false, error: 'Enquiry not found.' });
    }

    return res.json({ success: true, enquiry });
  } catch (error) {
    console.error('Error fetching enquiry:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve enquiry.' });
  }
});

/**
 * Update Enquiry Status & Counsellor Notes
 * PATCH /api/enquiries/:id
 */
app.patch('/api/enquiries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, counsellor_notes } = req.body;

    const existing = await db.getAsync('SELECT * FROM enquiries WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Enquiry not found.' });
    }

    const updates = [];
    const params = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (counsellor_notes !== undefined) {
      updates.push('counsellor_notes = ?');
      params.push(counsellor_notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No update fields provided.' });
    }

    params.push(id);
    const sql = `UPDATE enquiries SET ${updates.join(', ')} WHERE id = ?`;
    await db.runAsync(sql, params);

    const updated = await db.getAsync('SELECT * FROM enquiries WHERE id = ?', [id]);
    return res.json({ success: true, enquiry: updated });
  } catch (error) {
    console.error('Error updating enquiry:', error);
    return res.status(500).json({ success: false, error: 'Failed to update enquiry.' });
  }
});

/**
 * Delete Enquiry by ID
 * DELETE /api/enquiries/:id
 */
app.delete('/api/enquiries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.runAsync('DELETE FROM enquiries WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Enquiry not found.' });
    }

    return res.json({ success: true, message: 'Enquiry successfully deleted.' });
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete enquiry.' });
  }
});

/**
 * Get Enquiry Statistics
 * GET /api/stats
 */
app.get('/api/stats', async (req, res) => {
  try {
    const totalRow = await db.getAsync('SELECT COUNT(*) as count FROM enquiries');
    const newRow = await db.getAsync("SELECT COUNT(*) as count FROM enquiries WHERE status = 'New'");
    const contactedRow = await db.getAsync("SELECT COUNT(*) as count FROM enquiries WHERE status = 'Contacted'");
    const demoRow = await db.getAsync("SELECT COUNT(*) as count FROM enquiries WHERE source = 'Demo Class Booking' OR status = 'Demo Scheduled'");
    const enrolledRow = await db.getAsync("SELECT COUNT(*) as count FROM enquiries WHERE status = 'Enrolled'");

    const courseBreakdown = await db.allAsync(`
      SELECT course, COUNT(*) as count
      FROM enquiries
      GROUP BY course
      ORDER BY count DESC
      LIMIT 6
    `);

    return res.json({
      success: true,
      stats: {
        total: totalRow ? totalRow.count : 0,
        newCount: newRow ? newRow.count : 0,
        contactedCount: contactedRow ? contactedRow.count : 0,
        demoCount: demoRow ? demoRow.count : 0,
        enrolledCount: enrolledRow ? enrolledRow.count : 0,
        courseBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve stats.' });
  }
});

/**
 * Export Enquiries to CSV
 * GET /api/enquiries/export/csv
 */
app.get('/api/enquiries/export/csv', async (req, res) => {
  try {
    const enquiries = await db.allAsync('SELECT * FROM enquiries ORDER BY created_at DESC');

    const headers = ['ID', 'Date', 'Name', 'Mobile', 'Email', 'Course', 'Batch Timing', 'Status', 'Source', 'Message', 'Counsellor Notes'];
    const rows = enquiries.map((e) => [
      e.id,
      `"${new Date(e.created_at).toLocaleString('en-IN')}"`,
      `"${(e.name || '').replace(/"/g, '""')}"`,
      `"${e.mobile || ''}"`,
      `"${(e.email || '').replace(/"/g, '""')}"`,
      `"${(e.course || '').replace(/"/g, '""')}"`,
      `"${(e.timing || '').replace(/"/g, '""')}"`,
      `"${e.status || ''}"`,
      `"${e.source || ''}"`,
      `"${(e.message || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${(e.counsellor_notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Perfect_Coaching_Enquiries_${Date.now()}.csv`);
    return res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return res.status(500).send('Failed to generate CSV export.');
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🚀 Perfect Coaching Classes Backend Server Running!`);
  console.log(`🌐 Website URL:  http://localhost:${PORT}/`);
  console.log(`📊 Admin Portal: http://localhost:${PORT}/admin`);
  console.log(`🔌 API Health:   http://localhost:${PORT}/api/health`);
  console.log(`================================================================`);
});
