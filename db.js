const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

// Determine database file path
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');
const dbDir = path.dirname(dbPath);

// Ensure the data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Connect to SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
  } else {
    console.log(`📦 SQLite database connected at: ${dbPath}`);
  }
});

// Promise-based helpers for async/await in Express controllers
db.runAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

db.getAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

db.allAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

// Initialize database schema
db.serialize(() => {
  // 1. Enquiries Table
  db.run(`
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      course TEXT NOT NULL,
      timing TEXT,
      message TEXT,
      status TEXT DEFAULT 'New',
      source TEXT DEFAULT 'Website Enquiry',
      counsellor_notes TEXT
    )
  `);

  // 2. Students Table (For Student Portal & Admin Student Section)
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roll_no TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      parent_name TEXT,
      parent_mobile TEXT,
      course TEXT NOT NULL,
      batch_timing TEXT NOT NULL,
      admission_date DATE DEFAULT CURRENT_DATE,
      total_fee REAL DEFAULT 35000,
      paid_fee REAL DEFAULT 35000,
      fee_status TEXT DEFAULT 'Paid',
      status TEXT DEFAULT 'Active',
      attendance_pct REAL DEFAULT 95.0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Attendance Table
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'Present',
      batch TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  // 4. Test Results Table
  db.run(`
    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      test_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      max_marks REAL NOT NULL,
      marks_obtained REAL NOT NULL,
      test_date DATE NOT NULL,
      rank INTEGER,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  // 5. Announcements Table
  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      target_course TEXT DEFAULT 'All Batches',
      priority TEXT DEFAULT 'Normal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 6. Study Resources Table
  db.run(`
    CREATE TABLE IF NOT EXISTS study_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      course TEXT NOT NULL,
      file_type TEXT DEFAULT 'PDF',
      file_url TEXT NOT NULL,
      file_size TEXT DEFAULT '2.5 MB',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 7. Doubts / Q&A Table
  db.run(`
    CREATE TABLE IF NOT EXISTS doubts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      question TEXT NOT NULL,
      status TEXT DEFAULT 'Open',
      answer TEXT,
      answered_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  // 8. Admins Table (Authentication)
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'Super Admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Indexes for high performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_no)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_students_mobile ON students(mobile)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_students_course ON students(course)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_test_results_student ON test_results(student_id)`);

  // Ensure description column exists on study_resources
  db.run(`ALTER TABLE study_resources ADD COLUMN description TEXT`, () => {});

  // Seed sample initial data if students table is empty
  seedDatabaseIfEmpty();
});

// Seed function for comprehensive mock data
async function seedDatabaseIfEmpty() {
  try {
    // Ensure default admin user exists
    const adminUser = await db.getAsync(`SELECT * FROM admins WHERE username = 'admin'`);
    if (!adminUser) {
      const defaultUser = process.env.ADMIN_USERNAME || 'admin';
      const defaultPass = process.env.ADMIN_PASSWORD || 'admin123';
      await db.runAsync(`
        INSERT INTO admins (username, password_hash, full_name, role)
        VALUES (?, ?, ?, ?)
      `, [defaultUser, defaultPass, 'Director Sir', 'Super Admin']);
      console.log(`🔐 Default admin user created: "${defaultUser}"`);
    }

    const studentCount = await db.getAsync(`SELECT COUNT(*) as count FROM students`);
    if (studentCount && studentCount.count > 0) {
      return; // Database already seeded
    }

    console.log('🌱 Seeding initial student records and academic data...');

    // 1. Seed Students
    const students = [
      {
        roll_no: 'PCC-1001',
        name: 'Pawan Aher',
        mobile: '9822661307',
        email: 'pawan.aher@example.com',
        parent_name: 'Sanjay Aher',
        parent_mobile: '9822114455',
        course: 'Class X SSC (Maharashtra Board)',
        batch_timing: 'Morning Batch (7:00 AM – 10:30 AM)',
        admission_date: '2026-06-15',
        total_fee: 35000,
        paid_fee: 35000,
        fee_status: 'Paid',
        status: 'Active',
        attendance_pct: 96.5,
        notes: 'Targeting 95%+ in SSC Board Exams. Outstanding in Mathematics.'
      },
      {
        roll_no: 'PCC-1002',
        name: 'Sneha Patil',
        mobile: '9876543210',
        email: 'sneha.patil@example.com',
        parent_name: 'Rajesh Patil',
        parent_mobile: '9876500112',
        course: 'Class XII Science (HSC + MHT-CET)',
        batch_timing: 'Evening Batch (4:00 PM – 8:00 PM)',
        admission_date: '2026-06-20',
        total_fee: 55000,
        paid_fee: 40000,
        fee_status: 'Partial',
        status: 'Active',
        attendance_pct: 93.0,
        notes: 'Preparing for MHT-CET & COEP Engineering admission.'
      },
      {
        roll_no: 'PCC-1003',
        name: 'Aditya Deshmukh',
        mobile: '9422334455',
        email: 'aditya.deshmukh@example.com',
        parent_name: 'Mahesh Deshmukh',
        parent_mobile: '9422009988',
        course: 'Class X SSC (Maharashtra Board)',
        batch_timing: 'Morning Batch (7:00 AM – 10:30 AM)',
        admission_date: '2026-07-01',
        total_fee: 35000,
        paid_fee: 25000,
        fee_status: 'Partial',
        status: 'Active',
        attendance_pct: 88.5,
        notes: 'Very consistent, improving in Geometry proofs.'
      },
      {
        roll_no: 'PCC-1004',
        name: 'Ananya Kulkarni',
        mobile: '9123456780',
        email: 'ananya.k@example.com',
        parent_name: 'Vikas Kulkarni',
        parent_mobile: '9123400011',
        course: 'Class XII Science (HSC + MHT-CET)',
        batch_timing: 'Evening Batch (4:00 PM – 8:00 PM)',
        admission_date: '2026-06-18',
        total_fee: 55000,
        paid_fee: 55000,
        fee_status: 'Paid',
        status: 'Active',
        attendance_pct: 98.0,
        notes: 'Class topper candidate. Scored full marks in Chemistry unit test.'
      },
      {
        roll_no: 'PCC-1005',
        name: 'Rohit Shinde',
        mobile: '9890123456',
        email: 'rohit.shinde@example.com',
        parent_name: 'Anand Shinde',
        parent_mobile: '9890199887',
        course: 'Class IX Foundation (SSC / CBSE)',
        batch_timing: 'Evening Batch (4:30 PM – 7:30 PM)',
        admission_date: '2026-07-10',
        total_fee: 28000,
        paid_fee: 14000,
        fee_status: 'Partial',
        status: 'Active',
        attendance_pct: 86.0,
        notes: 'Enrolled for Olympiad foundation & Science practicals.'
      }
    ];

    for (const s of students) {
      await db.runAsync(`
        INSERT INTO students (roll_no, name, mobile, email, parent_name, parent_mobile, course, batch_timing, admission_date, total_fee, paid_fee, fee_status, status, attendance_pct, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [s.roll_no, s.name, s.mobile, s.email, s.parent_name, s.parent_mobile, s.course, s.batch_timing, s.admission_date, s.total_fee, s.paid_fee, s.fee_status, s.status, s.attendance_pct, s.notes]);
    }

    // 2. Seed Test Results
    const tests = [
      // Pawan Aher (id: 1)
      { student_id: 1, test_name: 'Unit Test 1 - Algebra (Linear Equations)', subject: 'Mathematics I', max_marks: 40, marks_obtained: 40, test_date: '2026-09-12', rank: 1, remarks: 'Flawless score! Exceptional working steps.' },
      { student_id: 1, test_name: 'Preliminary 1 - Science & Technology', subject: 'Science', max_marks: 100, marks_obtained: 95, test_date: '2026-09-28', rank: 2, remarks: 'Accurate ray diagrams and balance chemical equations.' },
      { student_id: 1, test_name: 'Monthly Test - Geometry & Theorems', subject: 'Mathematics II', max_marks: 40, marks_obtained: 38, test_date: '2026-10-15', rank: 1, remarks: 'Great proof structure in Circle theorem.' },
      { student_id: 1, test_name: 'Language Test - English & Grammar', subject: 'English', max_marks: 50, marks_obtained: 46, test_date: '2026-10-22', rank: 3, remarks: 'Impressive essay writing and vocabulary.' },

      // Sneha Patil (id: 2)
      { student_id: 2, test_name: 'MHT-CET Full Length Mock Test 1', subject: 'PCM (Physics, Chem, Math)', max_marks: 200, marks_obtained: 184, test_date: '2026-09-20', rank: 1, remarks: 'Top state percentile level performance!' },
      { student_id: 2, test_name: 'HSC Board Prelim - Organic Chemistry', subject: 'Chemistry', max_marks: 70, marks_obtained: 67, test_date: '2026-10-05', rank: 1, remarks: 'Mastery over reaction mechanisms and IUPAC.' },
      { student_id: 2, test_name: 'HSC Board Prelim - Rotational Dynamics', subject: 'Physics', max_marks: 70, marks_obtained: 64, test_date: '2026-10-18', rank: 2, remarks: 'Solid conceptual grip on torque and angular momentum.' },

      // Aditya Deshmukh (id: 3)
      { student_id: 3, test_name: 'Unit Test 1 - Algebra', subject: 'Mathematics I', max_marks: 40, marks_obtained: 35, test_date: '2026-09-12', rank: 4, remarks: 'Good work, avoid careless calculation mistakes.' },
      { student_id: 3, test_name: 'Preliminary 1 - Science & Technology', subject: 'Science', max_marks: 100, marks_obtained: 84, test_date: '2026-09-28', rank: 5, remarks: 'Revise biology life processes diagrams.' },

      // Ananya Kulkarni (id: 4)
      { student_id: 4, test_name: 'MHT-CET Full Length Mock Test 1', subject: 'PCM', max_marks: 200, marks_obtained: 188, test_date: '2026-09-20', rank: 1, remarks: 'Exceptional speed and precision in Math.' },
      { student_id: 4, test_name: 'HSC Board Prelim - Organic Chemistry', subject: 'Chemistry', max_marks: 70, marks_obtained: 69, test_date: '2026-10-05', rank: 1, remarks: 'Highest score in coaching batch!' }
    ];

    for (const t of tests) {
      await db.runAsync(`
        INSERT INTO test_results (student_id, test_name, subject, max_marks, marks_obtained, test_date, rank, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [t.student_id, t.test_name, t.subject, t.max_marks, t.marks_obtained, t.test_date, t.rank, t.remarks]);
    }

    // 3. Seed Attendance Records (past 10 sessions)
    const dates = ['2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26'];
    for (let sid = 1; sid <= 5; sid++) {
      for (const d of dates) {
        const status = (sid === 3 && d === '2026-10-18') ? 'Absent' : ((sid === 5 && d === '2026-10-22') ? 'Late' : 'Present');
        await db.runAsync(`
          INSERT INTO attendance (student_id, date, status, batch, notes)
          VALUES (?, ?, ?, ?, ?)
        `, [sid, d, status, sid % 2 === 1 ? 'Morning Batch' : 'Evening Batch', status === 'Absent' ? 'Medical leave' : null]);
      }
    }

    // 4. Seed Announcements
    const announcements = [
      {
        title: 'Special Sunday Marathon: Calculus & Geometry Theorems',
        content: 'Director Sir will conduct an intensive 3.5 hour revision session covering high-weightage Board exam questions and shortcuts. Attendance is mandatory for all Class X & XII students.',
        category: 'Exam',
        target_course: 'Class X & XII Batches',
        priority: 'High'
      },
      {
        title: 'Diwali Vacation & Home Assignment Notification',
        content: 'Classes will break for Diwali from Nov 1 to Nov 5. Comprehensive revision worksheets have been uploaded to your Study Material section. Submit completed sheets on re-opening day.',
        category: 'Holiday',
        target_course: 'All Batches',
        priority: 'Normal'
      },
      {
        title: 'Upcoming Parent-Teacher Meeting (PTM)',
        content: 'PTM for reviewing Preliminary Test 1 marks and discussing personalized 90-day Board preparation roadmaps is scheduled this Saturday, 10:00 AM – 1:00 PM.',
        category: 'Schedule',
        target_course: 'Class X SSC Batch',
        priority: 'High'
      }
    ];

    for (const a of announcements) {
      await db.runAsync(`
        INSERT INTO announcements (title, content, category, target_course, priority)
        VALUES (?, ?, ?, ?, ?)
      `, [a.title, a.content, a.category, a.target_course, a.priority]);
    }

    // 5. Seed Study Resources
    const resources = [
      {
        title: 'Class 10 SSC Mathematics Formula & Theorem Handbook',
        subject: 'Mathematics',
        course: 'Class X SSC (Maharashtra Board)',
        file_type: 'PDF',
        file_url: 'study-material.html#math',
        file_size: '3.4 MB'
      },
      {
        title: 'Class 12 HSC Physics High-Yield Derivations & Numericals',
        subject: 'Physics',
        course: 'Class XII Science (HSC + MHT-CET)',
        file_type: 'PDF',
        file_url: 'study-material.html#physics',
        file_size: '5.2 MB'
      },
      {
        title: 'MHT-CET 500+ Solved Shortcuts & Speed Tricks (PCM)',
        subject: 'MHT-CET',
        course: 'Class XII Science (HSC + MHT-CET)',
        file_type: 'PDF',
        file_url: 'study-material.html#mht-cet',
        file_size: '7.8 MB'
      },
      {
        title: 'Class 10 Science Most Expected Diagram Bank & Lab Questions',
        subject: 'Science',
        course: 'Class X SSC (Maharashtra Board)',
        file_type: 'PDF',
        file_url: 'study-material.html#science',
        file_size: '2.8 MB'
      }
    ];

    for (const r of resources) {
      await db.runAsync(`
        INSERT INTO study_resources (title, subject, course, file_type, file_url, file_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [r.title, r.subject, r.course, r.file_type, r.file_url, r.file_size]);
    }

    // 6. Seed Doubts
    const doubts = [
      {
        student_id: 1,
        student_name: 'Pawan Aher',
        subject: 'Mathematics I',
        question: 'Sir, in quadratic equations word problem Exercise 2.6 Q.8, should we discard the negative root for speed and time?',
        status: 'Answered',
        answer: 'Yes! Speed and time can never be negative in physical problems, so always discard the negative root and write the reason in your exam answer sheet.',
        answered_by: 'Director Sir'
      },
      {
        student_id: 2,
        student_name: 'Sneha Patil',
        subject: 'Chemistry',
        question: 'What is the most reliable way to differentiate between Aldol condensation and Cannizzaro reaction in Board questions?',
        status: 'Answered',
        answer: 'Check for alpha-hydrogen! Aldehydes with alpha-H undergo Aldol condensation with dilute alkali. Aldehydes without alpha-H (like HCHO or Benzaldehyde) undergo Cannizzaro reaction with 50% concentrated alkali.',
        answered_by: 'Chemistry Faculty'
      }
    ];

    for (const d of doubts) {
      await db.runAsync(`
        INSERT INTO doubts (student_id, student_name, subject, question, status, answer, answered_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [d.student_id, d.student_name, d.subject, d.question, d.status, d.answer, d.answered_by]);
    }

    console.log('✅ Academic seed data created successfully!');
  } catch (error) {
    console.error('⚠️ Error seeding database:', error.message);
  }
}

module.exports = db;
