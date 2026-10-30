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

// Student Dashboard route aliases
app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'student-dashboard.html'));
});
app.get('/student-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'student-dashboard.html'));
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
 * Get Comprehensive Dashboard Statistics (Enquiries + Students + Financials)
 * GET /api/stats
 */
app.get('/api/stats', async (req, res) => {
  try {
    // Enquiry stats
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

    // Student stats
    const studentTotalRow = await db.getAsync('SELECT COUNT(*) as count FROM students');
    const studentActiveRow = await db.getAsync("SELECT COUNT(*) as count FROM students WHERE status = 'Active'");
    const feeRow = await db.getAsync('SELECT SUM(total_fee) as totalExpected, SUM(paid_fee) as totalCollected, AVG(attendance_pct) as avgAttendance FROM students');
    const testsRow = await db.getAsync('SELECT COUNT(*) as count FROM test_results');
    const resourcesRow = await db.getAsync('SELECT COUNT(*) as count FROM study_resources');
    const announcementsRow = await db.getAsync('SELECT COUNT(*) as count FROM announcements');

    const totalExpected = (feeRow && feeRow.totalExpected) || 0;
    const totalCollected = (feeRow && feeRow.totalCollected) || 0;
    const pendingFees = Math.max(0, totalExpected - totalCollected);
    const avgAttendance = feeRow && feeRow.avgAttendance ? Math.round(feeRow.avgAttendance * 10) / 10 : 92.5;

    return res.json({
      success: true,
      stats: {
        total: totalRow ? totalRow.count : 0,
        newCount: newRow ? newRow.count : 0,
        contactedCount: contactedRow ? contactedRow.count : 0,
        demoCount: demoRow ? demoRow.count : 0,
        enrolledCount: enrolledRow ? enrolledRow.count : 0,
        courseBreakdown,
        // Academic & Student Metrics
        totalStudents: studentTotalRow ? studentTotalRow.count : 0,
        activeStudents: studentActiveRow ? studentActiveRow.count : 0,
        totalFeesExpected: totalExpected,
        totalFeesCollected: totalCollected,
        pendingFees: pendingFees,
        averageAttendance: avgAttendance,
        totalTests: testsRow ? testsRow.count : 0,
        totalResources: resourcesRow ? resourcesRow.count : 0,
        announcementsCount: announcementsRow ? announcementsRow.count : 0
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

// ============================================================================
// STUDENT SECTION & ACADEMIC APIS (ADMIN & STUDENT PORTAL)
// ============================================================================

/**
 * Get All Enrolled Students (with search & filtering)
 * GET /api/students
 */
app.get('/api/students', async (req, res) => {
  try {
    const { search, course, fee_status, status } = req.query;
    let query = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ' AND (name LIKE ? OR roll_no LIKE ? OR mobile LIKE ? OR parent_mobile LIKE ?)';
      params.push(term, term, term, term);
    }

    if (course && course.trim()) {
      query += ' AND course = ?';
      params.push(course.trim());
    }

    if (fee_status && fee_status.trim()) {
      query += ' AND fee_status = ?';
      params.push(fee_status.trim());
    }

    if (status && status.trim()) {
      query += ' AND status = ?';
      params.push(status.trim());
    }

    query += ' ORDER BY id DESC';
    const students = await db.allAsync(query, params);
    return res.json({ success: true, count: students.length, students });
  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve students list.' });
  }
});

/**
 * Add New Student to Coaching Database
 * POST /api/students
 */
app.post('/api/students', async (req, res) => {
  try {
    const { name, mobile, email, parent_name, parent_mobile, course, batch_timing, total_fee, paid_fee, notes, roll_no } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Student full name is required.' });
    }
    if (!mobile || !mobile.trim()) {
      return res.status(400).json({ success: false, error: 'Student contact number is required.' });
    }
    if (!course || !course.trim()) {
      return res.status(400).json({ success: false, error: 'Course enrollment is required.' });
    }

    // Auto generate roll number if not provided
    let finalRoll = roll_no && roll_no.trim();
    if (!finalRoll) {
      const countRow = await db.getAsync('SELECT MAX(id) as maxId FROM students');
      const nextNum = (countRow && countRow.maxId ? countRow.maxId : 0) + 1001;
      finalRoll = `PCC-${nextNum}`;
    }

    const tFee = parseFloat(total_fee) || 35000;
    const pFee = parseFloat(paid_fee) || 0;
    let feeStatus = 'Pending';
    if (pFee >= tFee && tFee > 0) feeStatus = 'Paid';
    else if (pFee > 0) feeStatus = 'Partial';

    const insertResult = await db.runAsync(`
      INSERT INTO students (
        roll_no, name, mobile, email, parent_name, parent_mobile,
        course, batch_timing, total_fee, paid_fee, fee_status, status, attendance_pct, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', 100.0, ?)
    `, [
      finalRoll,
      name.trim(),
      mobile.trim(),
      email ? email.trim() : null,
      parent_name ? parent_name.trim() : null,
      parent_mobile ? parent_mobile.trim() : null,
      course.trim(),
      batch_timing ? batch_timing.trim() : 'Morning Batch (7:00 AM – 10:30 AM)',
      tFee,
      pFee,
      feeStatus,
      notes ? notes.trim() : null
    ]);

    const newStudent = await db.getAsync('SELECT * FROM students WHERE id = ?', [insertResult.id]);
    return res.status(201).json({ success: true, message: 'Student registered successfully!', student: newStudent });
  } catch (error) {
    console.error('Error adding student:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, error: 'Roll number or student already exists.' });
    }
    return res.status(500).json({ success: false, error: 'Failed to add student.' });
  }
});

/**
 * Get Single Student Details
 * GET /api/students/:id
 */
app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await db.getAsync('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }
    const tests = await db.allAsync('SELECT * FROM test_results WHERE student_id = ? ORDER BY test_date DESC', [student.id]);
    const attendance = await db.allAsync('SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 30', [student.id]);
    return res.json({ success: true, student, tests, attendance });
  } catch (error) {
    console.error('Error fetching student details:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve student profile.' });
  }
});

/**
 * Update Student Details / Fees
 * PATCH /api/students/:id
 */
app.patch('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, email, parent_name, parent_mobile, course, batch_timing, total_fee, paid_fee, status, notes } = req.body;

    const student = await db.getAsync('SELECT * FROM students WHERE id = ?', [id]);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    const tFee = total_fee !== undefined ? parseFloat(total_fee) : student.total_fee;
    const pFee = paid_fee !== undefined ? parseFloat(paid_fee) : student.paid_fee;
    let feeStatus = student.fee_status;
    if (pFee >= tFee && tFee > 0) feeStatus = 'Paid';
    else if (pFee > 0) feeStatus = 'Partial';
    else feeStatus = 'Pending';

    await db.runAsync(`
      UPDATE students SET
        name = COALESCE(?, name),
        mobile = COALESCE(?, mobile),
        email = COALESCE(?, email),
        parent_name = COALESCE(?, parent_name),
        parent_mobile = COALESCE(?, parent_mobile),
        course = COALESCE(?, course),
        batch_timing = COALESCE(?, batch_timing),
        total_fee = ?,
        paid_fee = ?,
        fee_status = ?,
        status = COALESCE(?, status),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `, [
      name ? name.trim() : null,
      mobile ? mobile.trim() : null,
      email ? email.trim() : null,
      parent_name ? parent_name.trim() : null,
      parent_mobile ? parent_mobile.trim() : null,
      course ? course.trim() : null,
      batch_timing ? batch_timing.trim() : null,
      tFee,
      pFee,
      feeStatus,
      status ? status.trim() : null,
      notes !== undefined ? notes : null,
      id
    ]);

    const updated = await db.getAsync('SELECT * FROM students WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Student profile updated.', student: updated });
  } catch (error) {
    console.error('Error updating student:', error);
    return res.status(500).json({ success: false, error: 'Failed to update student profile.' });
  }
});

/**
 * Delete Student
 * DELETE /api/students/:id
 */
app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.runAsync('DELETE FROM students WHERE id = ?', [id]);
    await db.runAsync('DELETE FROM test_results WHERE student_id = ?', [id]);
    await db.runAsync('DELETE FROM attendance WHERE student_id = ?', [id]);
    return res.json({ success: true, message: 'Student removed successfully.' });
  } catch (error) {
    console.error('Error deleting student:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete student.' });
  }
});

/**
 * Export Students to CSV
 * GET /api/students/export/csv
 */
app.get('/api/students/export/csv', async (req, res) => {
  try {
    const students = await db.allAsync('SELECT * FROM students ORDER BY roll_no ASC');
    const headers = ['Roll No', 'Name', 'Mobile', 'Email', 'Parent Name', 'Parent Mobile', 'Course', 'Batch Timing', 'Admission Date', 'Total Fee', 'Paid Fee', 'Fee Status', 'Attendance %', 'Status', 'Notes'];
    const rows = students.map((s) => [
      `"${s.roll_no}"`,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${s.mobile || ''}"`,
      `"${s.email || ''}"`,
      `"${(s.parent_name || '').replace(/"/g, '""')}"`,
      `"${s.parent_mobile || ''}"`,
      `"${(s.course || '').replace(/"/g, '""')}"`,
      `"${(s.batch_timing || '').replace(/"/g, '""')}"`,
      `"${s.admission_date || ''}"`,
      s.total_fee || 0,
      s.paid_fee || 0,
      `"${s.fee_status || ''}"`,
      `${s.attendance_pct || 0}%`,
      `"${s.status || ''}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Perfect_Coaching_Students_${Date.now()}.csv`);
    return res.send(csvContent);
  } catch (error) {
    console.error('Error exporting students CSV:', error);
    return res.status(500).send('Failed to export students.');
  }
});

// ============================================================================
// STUDENT PORTAL AUTH & DATA AGGREGATION
// ============================================================================

/**
 * Get Complete Student Portal Package (By Roll Number or Mobile Number)
 * GET /api/student/portal/:identifier
 */
app.get('/api/student/portal/:identifier', async (req, res) => {
  try {
    const rawId = (req.params.identifier || '').trim();
    const cleanDigits = rawId.replace(/[^0-9]/g, '');

    let student = null;

    // Search by exact roll number first (case-insensitive)
    student = await db.getAsync('SELECT * FROM students WHERE LOWER(roll_no) = LOWER(?)', [rawId]);

    // Fallback: search by 10-digit mobile
    if (!student && cleanDigits.length >= 10) {
      student = await db.getAsync('SELECT * FROM students WHERE mobile LIKE ?', [`%${cleanDigits}%`]);
    }

    // Default fallback to first student for easy demonstration if keyword 'demo' or empty
    if (!student && (rawId.toLowerCase() === 'demo' || rawId === 'default')) {
      student = await db.getAsync('SELECT * FROM students ORDER BY id ASC LIMIT 1');
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        error: `No enrolled student found matching "${rawId}". Please check your Roll Number (e.g. PCC-1001) or 10-digit Mobile Number.`
      });
    }

    // Fetch student's test results
    const tests = await db.allAsync(
      'SELECT * FROM test_results WHERE student_id = ? ORDER BY test_date DESC',
      [student.id]
    );

    // Fetch student's attendance history
    const attendance = await db.allAsync(
      'SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 40',
      [student.id]
    );

    // Calculate dynamic attendance stats
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'Present').length;
    const computedPct = totalDays > 0 ? Math.round((presentDays / totalDays) * 1000) / 10 : student.attendance_pct;

    // Fetch announcements (targeted or general)
    const announcements = await db.allAsync(`
      SELECT * FROM announcements
      ORDER BY id DESC
      LIMIT 10
    `);

    // Fetch study resources
    const resources = await db.allAsync(`
      SELECT * FROM study_resources
      ORDER BY id DESC
      LIMIT 12
    `);

    // Fetch student doubts
    const doubts = await db.allAsync(
      'SELECT * FROM doubts WHERE student_id = ? ORDER BY created_at DESC',
      [student.id]
    );

    return res.json({
      success: true,
      student: {
        ...student,
        computedAttendancePct: computedPct,
        totalClassesAttended: presentDays,
        totalClassesConducted: totalDays
      },
      tests,
      attendance,
      announcements,
      resources,
      doubts
    });
  } catch (error) {
    console.error('Error fetching student portal payload:', error);
    return res.status(500).json({ success: false, error: 'Failed to load student dashboard data.' });
  }
});

// ============================================================================
// ATTENDANCE MANAGEMENT APIS
// ============================================================================

/**
 * Get Attendance Records
 * GET /api/attendance
 */
app.get('/api/attendance', async (req, res) => {
  try {
    const { date, batch, student_id } = req.query;
    let query = `
      SELECT a.*, s.name as student_name, s.roll_no, s.course, s.batch_timing
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ' AND a.date = ?';
      params.push(date);
    }
    if (batch) {
      query += ' AND (a.batch = ? OR s.batch_timing LIKE ?)';
      params.push(batch, `%${batch}%`);
    }
    if (student_id) {
      query += ' AND a.student_id = ?';
      params.push(student_id);
    }

    query += ' ORDER BY a.date DESC, s.roll_no ASC';
    const records = await db.allAsync(query, params);
    return res.json({ success: true, count: records.length, records });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve attendance logs.' });
  }
});

/**
 * Batch Submit Attendance for Multiple Students
 * POST /api/attendance/batch
 */
app.post('/api/attendance/batch', async (req, res) => {
  try {
    const { date, batch, records } = req.body;
    if (!date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'Attendance date and records array are required.' });
    }

    for (const item of records) {
      // Check if attendance already recorded for this student on this date
      const existing = await db.getAsync(
        'SELECT id FROM attendance WHERE student_id = ? AND date = ?',
        [item.student_id, date]
      );

      if (existing) {
        await db.runAsync(
          'UPDATE attendance SET status = ?, batch = ?, notes = ? WHERE id = ?',
          [item.status || 'Present', batch || null, item.notes || null, existing.id]
        );
      } else {
        await db.runAsync(
          'INSERT INTO attendance (student_id, date, status, batch, notes) VALUES (?, ?, ?, ?, ?)',
          [item.student_id, date, item.status || 'Present', batch || null, item.notes || null]
        );
      }

      // Recalculate student overall attendance pct
      const stats = await db.getAsync(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present
        FROM attendance WHERE student_id = ?
      `, [item.student_id]);

      if (stats && stats.total > 0) {
        const pct = Math.round((stats.present / stats.total) * 1000) / 10;
        await db.runAsync('UPDATE students SET attendance_pct = ? WHERE id = ?', [pct, item.student_id]);
      }
    }

    return res.json({ success: true, message: `Attendance for ${records.length} students recorded for ${date}.` });
  } catch (error) {
    console.error('Error saving batch attendance:', error);
    return res.status(500).json({ success: false, error: 'Failed to record attendance.' });
  }
});

// ============================================================================
// TEST RESULTS & MARKS APIS
// ============================================================================

/**
 * Get Test Results
 * GET /api/tests/results
 */
app.get('/api/tests/results', async (req, res) => {
  try {
    const { student_id, test_name, subject } = req.query;
    let query = `
      SELECT t.*, s.name as student_name, s.roll_no, s.course
      FROM test_results t
      JOIN students s ON t.student_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (student_id) {
      query += ' AND t.student_id = ?';
      params.push(student_id);
    }
    if (test_name) {
      query += ' AND t.test_name LIKE ?';
      params.push(`%${test_name}%`);
    }
    if (subject) {
      query += ' AND t.subject LIKE ?';
      params.push(`%${subject}%`);
    }

    query += ' ORDER BY t.test_date DESC, t.marks_obtained DESC';
    const results = await db.allAsync(query, params);
    return res.json({ success: true, count: results.length, results });
  } catch (error) {
    console.error('Error fetching test results:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve test marks.' });
  }
});

/**
 * Record New Test Marks
 * POST /api/tests/results
 */
app.post('/api/tests/results', async (req, res) => {
  try {
    const { student_id, test_name, subject, max_marks, marks_obtained, test_date, rank, remarks } = req.body;

    if (!student_id || !test_name || !subject || max_marks === undefined || marks_obtained === undefined) {
      return res.status(400).json({ success: false, error: 'Student ID, test name, subject, max marks, and marks obtained are required.' });
    }

    const tDate = test_date || new Date().toISOString().split('T')[0];
    const result = await db.runAsync(`
      INSERT INTO test_results (student_id, test_name, subject, max_marks, marks_obtained, test_date, rank, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [student_id, test_name.trim(), subject.trim(), parseFloat(max_marks), parseFloat(marks_obtained), tDate, rank ? parseInt(rank) : null, remarks ? remarks.trim() : null]);

    const created = await db.getAsync('SELECT * FROM test_results WHERE id = ?', [result.id]);
    return res.status(201).json({ success: true, message: 'Test score published!', result: created });
  } catch (error) {
    console.error('Error adding test result:', error);
    return res.status(500).json({ success: false, error: 'Failed to record test marks.' });
  }
});

/**
 * Delete Test Score Record
 * DELETE /api/tests/results/:id
 */
app.delete('/api/tests/results/:id', async (req, res) => {
  try {
    await db.runAsync('DELETE FROM test_results WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Test record deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete test record.' });
  }
});

// ============================================================================
// ANNOUNCEMENTS & NOTICE BOARD APIS
// ============================================================================

/**
 * Get Announcements
 * GET /api/announcements
 */
app.get('/api/announcements', async (req, res) => {
  try {
    const items = await db.allAsync('SELECT * FROM announcements ORDER BY created_at DESC');
    return res.json({ success: true, announcements: items });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch notices.' });
  }
});

/**
 * Post Announcement
 * POST /api/announcements
 */
app.post('/api/announcements', async (req, res) => {
  try {
    const { title, content, category, target_course, priority } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Notice title and message are required.' });
    }
    const result = await db.runAsync(`
      INSERT INTO announcements (title, content, category, target_course, priority)
      VALUES (?, ?, ?, ?, ?)
    `, [title.trim(), content.trim(), category || 'General', target_course || 'All Batches', priority || 'Normal']);

    const created = await db.getAsync('SELECT * FROM announcements WHERE id = ?', [result.id]);
    return res.status(201).json({ success: true, message: 'Notice published to student noticeboard!', announcement: created });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to publish notice.' });
  }
});

/**
 * Delete Announcement
 * DELETE /api/announcements/:id
 */
app.delete('/api/announcements/:id', async (req, res) => {
  try {
    await db.runAsync('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Notice removed.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete notice.' });
  }
});

// ============================================================================
// STUDY RESOURCES APIS
// ============================================================================

/**
 * Get Study Resources
 * GET /api/resources
 */
app.get('/api/resources', async (req, res) => {
  try {
    const items = await db.allAsync('SELECT * FROM study_resources ORDER BY id DESC');
    return res.json({ success: true, resources: items });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch resources.' });
  }
});

/**
 * Add Study Resource
 * POST /api/resources
 */
app.post('/api/resources', async (req, res) => {
  try {
    const { title, subject, course, file_type, file_url, file_size } = req.body;
    if (!title || !subject || !course) {
      return res.status(400).json({ success: false, error: 'Resource title, subject, and course are required.' });
    }
    const result = await db.runAsync(`
      INSERT INTO study_resources (title, subject, course, file_type, file_url, file_size)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title.trim(), subject.trim(), course.trim(), file_type || 'PDF', file_url || 'study-material.html', file_size || '3.5 MB']);

    const created = await db.getAsync('SELECT * FROM study_resources WHERE id = ?', [result.id]);
    return res.status(201).json({ success: true, message: 'Study material uploaded for students!', resource: created });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to upload resource.' });
  }
});

/**
 * Delete Resource
 * DELETE /api/resources/:id
 */
app.delete('/api/resources/:id', async (req, res) => {
  try {
    await db.runAsync('DELETE FROM study_resources WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Resource removed.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete resource.' });
  }
});

// ============================================================================
// DOUBTS & Q&A APIS
// ============================================================================

/**
 * Get Doubts
 * GET /api/doubts
 */
app.get('/api/doubts', async (req, res) => {
  try {
    const { student_id } = req.query;
    let query = 'SELECT * FROM doubts';
    const params = [];
    if (student_id) {
      query += ' WHERE student_id = ?';
      params.push(student_id);
    }
    query += ' ORDER BY created_at DESC';
    const items = await db.allAsync(query, params);
    return res.json({ success: true, doubts: items });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch doubts.' });
  }
});

/**
 * Ask / Submit a Doubt (From Student Portal)
 * POST /api/doubts
 */
app.post('/api/doubts', async (req, res) => {
  try {
    const { student_id, student_name, subject, question } = req.body;
    if (!student_id || !question || !question.trim()) {
      return res.status(400).json({ success: false, error: 'Doubt question content is required.' });
    }
    const result = await db.runAsync(`
      INSERT INTO doubts (student_id, student_name, subject, question, status)
      VALUES (?, ?, ?, ?, 'Open')
    `, [student_id, student_name || 'Enrolled Student', subject || 'General', question.trim()]);

    const created = await db.getAsync('SELECT * FROM doubts WHERE id = ?', [result.id]);
    return res.status(201).json({ success: true, message: 'Doubt submitted to faculty! Teacher will answer shortly.', doubt: created });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to submit doubt.' });
  }
});

/**
 * Answer / Resolve Doubt (From Admin Dashboard)
 * PATCH /api/doubts/:id
 */
app.patch('/api/doubts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { answer, answered_by } = req.body;
    if (!answer || !answer.trim()) {
      return res.status(400).json({ success: false, error: 'Answer content is required.' });
    }
    await db.runAsync(`
      UPDATE doubts SET
        answer = ?,
        answered_by = ?,
        status = 'Answered'
      WHERE id = ?
    `, [answer.trim(), answered_by || 'Director Sir', id]);

    const updated = await db.getAsync('SELECT * FROM doubts WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Answer published to student portal!', doubt: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update doubt answer.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🚀 Perfect Coaching Classes Backend Server Running!`);
  console.log(`🌐 Website URL:       http://localhost:${PORT}/`);
  console.log(`📊 Admin Portal:      http://localhost:${PORT}/admin`);
  console.log(`🎓 Student Dashboard: http://localhost:${PORT}/student`);
  console.log(`🔌 API Health:        http://localhost:${PORT}/api/health`);
  console.log(`================================================================`);
});

