# Perfect Coaching Classes — Full-Stack Web Application

A full-stack website and student enquiry management system for **Perfect Coaching Classes, Nashik Road**.

---

## 🌟 Architecture Overview

This project has been detached from third-party BaaS (Supabase) and now operates on an independent, self-hosted Node.js + Express + SQLite backend.

- **Frontend**: Responsive HTML5, Vanilla CSS3, Modern JavaScript
- **Backend**: Node.js & Express REST API (`server.js`)
- **Database**: Embedded SQLite (`./data/database.sqlite`), zero external database configuration required
- **Admin Dashboard**: Built-in management portal (`admin.html`) with real-time stats, 1-click WhatsApp/calling, status tracking, counsellor notes, and CSV export.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
# Production start
npm start

# Development mode with auto-reload (Node.js 18+)
npm run dev
```

### 3. Open in Browser
- **Main Website**: [http://localhost:5000/](http://localhost:5000/)
- **Admin Enquiries Portal**: [http://localhost:5000/admin](http://localhost:5000/admin)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 📁 Project Structure

```
coaching-classes/
├── admin.html               # Admin Dashboard for student enquiries & demo bookings
├── index.html               # Home page with Toppers gallery & booking modal
├── about.html               # About Us page
├── courses.html             # Courses brochure & syllabus breakdown
├── results.html             # Hall of Fame, board toppers & Silk Book awards
├── study-material.html      # Free study guides & download resources
├── contact.html             # Contact page with interactive admission form
├── style.css                # Main stylesheet
├── pages.css                # Inner page shared styles
├── script.js                # Frontend client logic & REST API integration
├── server.js                # Express REST API backend server
├── db.js                    # SQLite database connection & schema migrations
├── .env                     # Local environment configuration
├── .env.example             # Template configuration
├── package.json             # NPM dependencies & scripts
├── data/
│   └── database.sqlite      # SQLite database file (created automatically)
└── assets/                  # Images, banners, and student award posters
```

---

## 🔌 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server uptime & status |
| `POST` | `/api/enquiries` | Submit admission enquiry or demo class booking |
| `GET` | `/api/enquiries` | Fetch enquiries (supports `?search=`, `?status=`, `?limit=`) |
| `GET` | `/api/enquiries/:id` | Fetch details of a single enquiry |
| `PATCH` | `/api/enquiries/:id` | Update enquiry status or counsellor notes |
| `DELETE` | `/api/enquiries/:id` | Delete an enquiry |
| `GET` | `/api/stats` | Aggregated dashboard stats (totals, new, demos, enrolled) |
| `GET` | `/api/enquiries/export/csv` | Download full enquiries spreadsheet as CSV |

### Sample POST Request Payload:
```json
{
  "name": "Rohan Sharma",
  "mobile": "9822661307",
  "email": "rohan@example.com",
  "course": "Class X SSC (Maharashtra Board)",
  "timing": "Morning Batch (7:00 AM – 10:30 AM)",
  "message": "Interested in Sunday Test Series.",
  "source": "Website Contact Form"
}
```

---

## 🛠️ Configuration (`.env`)

```env
PORT=5000
NODE_ENV=development
DB_PATH=./data/database.sqlite
```

---

## 🔐 Admin Dashboard Features

1. **Live Enquiries Table**: Inspect incoming student inquiries in real time.
2. **Instant Contact**: Click-to-call (`tel:`) and 1-click WhatsApp (`https://wa.me/...`) with pre-filled greeting.
3. **Status Workflow**: Manage student lifecycle: `New` ➔ `Contacted` ➔ `Demo Scheduled` ➔ `Enrolled` ➔ `Closed`.
4. **Counsellor Notes**: Save private follow-up remarks for each student.
5. **CSV Export**: One-click download for Excel or Google Sheets reporting.
