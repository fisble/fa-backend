/**
 * Standalone script to fetch data from the T4E test server API
 * and store it into MongoDB Atlas.
 *
 * Responsibilities (per Q4 – Sync API):
 *  1. Fetch dataset from private API
 *  2. Validate records
 *  3. Normalize values
 *  4. Reject invalid entries
 *  5. Prevent duplicate insertion
 *  6. Persist valid records into MongoDB
 *  7. Return sync summary
 *
 * Usage: node src/fetchAndSync.js
 */
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const Student = require('./models/Student');
const Company = require('./models/Company');
const Drive = require('./models/Drive');
const Application = require('./models/Application');
const Interview = require('./models/Interview');

const TOKEN_URL = process.env.TOKEN_URL || 'https://t4e-testserver.onrender.com/api/public/token';
const STUDENT_ID = process.env.STUDENT_ID || 'E0423002';
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD || '197349';
const MONGO_URI = process.env.MONGO_URI;

// ─── Helpers ───────────────────────────────────────────────────────

function sanitizeString(val, fallback = '') {
  if (val == null) return fallback;
  return String(val).trim() || fallback;
}

function sanitizeEmail(val) {
  if (!val) return '';
  return String(val).trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeNumber(val, fallback = 0) {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}

function sanitizeSkills(val) {
  if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

function sanitizePhone(val) {
  if (!val) return '';
  const p = String(val).trim().replace(/[^0-9+\-() ]/g, '');
  return p;
}

function isValidPhone(phone) {
  // Must be at least 10 digits
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10;
}

// ─── Step 1: Get Token ─────────────────────────────────────────────

async function getToken() {
  console.log('🔑  Requesting token...');
  const res = await axios.post(TOKEN_URL, {
    studentId: STUDENT_ID,
    password: STUDENT_PASSWORD,
    set: 'setA'
  }, {
    headers: { 'Content-Type': 'application/json' }
  });
  const token = res.data?.token;
  const dataUrl = res.data?.dataUrl;
  if (!token) throw new Error('Could not extract token from response');
  console.log('   ✅ Token obtained');
  console.log('   📍 Data URL:', dataUrl);
  return { token, dataUrl };
}

// ─── Step 2: Fetch Data ────────────────────────────────────────────

async function fetchData(token, dataUrl) {
  const fullUrl = `https://t4e-testserver.onrender.com/api${dataUrl}`;
  console.log('📦  Fetching data from:', fullUrl);
  const res = await axios.get(fullUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('   ✅ Data received');
  return res.data;
}

// ─── Step 3: Process Students ──────────────────────────────────────

async function processStudents(records) {
  console.log('\n👨‍🎓  Processing students... (total:', records.length, ')');
  const saved = [];
  const rejected = [];
  const duplicates = [];

  for (const item of records) {
    // Sanitize
    const payload = {
      studentId: sanitizeString(item.studentId),
      name: sanitizeString(item.name),
      email: sanitizeEmail(item.email),
      department: sanitizeString(item.department).toUpperCase(),
      cgpa: sanitizeNumber(item.cgpa, 0),
      skills: sanitizeSkills(item.skills),
      graduationYear: sanitizeNumber(item.graduationYear, 0),
      phone: sanitizePhone(item.phone),
      status: sanitizeString(item.status, 'active'),
    };

    // Validate
    const errors = [];
    if (!payload.studentId) errors.push('missing studentId');
    if (!payload.name) errors.push('missing name');
    if (!payload.email || !isValidEmail(payload.email)) errors.push(`invalid email: "${payload.email}"`);
    if (payload.cgpa < 0 || payload.cgpa > 10) errors.push(`invalid cgpa: ${payload.cgpa}`);
    if (payload.phone && !isValidPhone(payload.phone)) errors.push(`invalid phone: "${payload.phone}"`);

    if (errors.length > 0) {
      rejected.push({ studentId: item.studentId, reasons: errors });
      continue;
    }

    try {
      const student = await Student.findOneAndUpdate(
        { studentId: payload.studentId },
        payload,
        { upsert: true, new: true, runValidators: true }
      );
      saved.push(student);
    } catch (err) {
      if (err.code === 11000) {
        duplicates.push(payload.studentId);
      } else {
        rejected.push({ studentId: item.studentId, reasons: [err.message] });
      }
    }
  }

  console.log(`   ✅ Saved: ${saved.length}  ❌ Rejected: ${rejected.length}  🔁 Duplicates: ${duplicates.length}`);
  if (rejected.length > 0) {
    rejected.forEach(r => console.log(`      ↳ ${r.studentId}: ${r.reasons.join(', ')}`));
  }
  return { saved, rejected };
}

// ─── Step 4: Process Companies ─────────────────────────────────────

async function processCompanies(records) {
  console.log('\n🏢  Processing companies... (total:', records.length, ')');
  const saved = [];
  const rejected = [];

  for (const item of records) {
    const payload = {
      companyId: sanitizeString(item.companyId),
      name: sanitizeString(item.name),
      role: sanitizeString(item.role),
      package: sanitizeNumber(item.package, 0),
      eligibleDepartments: Array.isArray(item.eligibleDepartments) ? item.eligibleDepartments : [],
      minimumCgpa: sanitizeNumber(item.minimumCgpa, 0),
      driveDate: sanitizeString(item.driveDate),
      status: sanitizeString(item.status, 'upcoming'),
    };

    if (!payload.companyId) { rejected.push({ id: item.companyId, reason: 'missing companyId' }); continue; }
    if (!payload.name) { rejected.push({ id: item.companyId, reason: 'missing name' }); continue; }

    try {
      const company = await Company.findOneAndUpdate(
        { companyId: payload.companyId },
        payload,
        { upsert: true, new: true, runValidators: true }
      );
      saved.push(company);
    } catch (err) {
      rejected.push({ id: item.companyId, reason: err.message });
    }
  }

  console.log(`   ✅ Saved: ${saved.length}  ❌ Rejected: ${rejected.length}`);
  return { saved, rejected };
}

// ─── Step 5: Process Drives ────────────────────────────────────────

async function processDrives(records, companyObjMap) {
  console.log('\n🚗  Processing drives... (total:', records.length, ')');
  const saved = [];
  const rejected = [];

  for (const item of records) {
    const payload = {
      driveId: sanitizeString(item.driveId),
      companyId: sanitizeString(item.companyId),
      title: sanitizeString(item.title),
      mode: sanitizeString(item.mode),
      location: sanitizeString(item.location),
      registrationDeadline: sanitizeString(item.registrationDeadline),
      rounds: Array.isArray(item.rounds) ? item.rounds : [],
      status: sanitizeString(item.status, 'open'),
    };

    // Link to Company ObjectId
    if (payload.companyId && companyObjMap[payload.companyId]) {
      payload.company = companyObjMap[payload.companyId];
    }

    if (!payload.driveId) { rejected.push({ id: item.driveId, reason: 'missing driveId' }); continue; }
    if (!payload.title) { rejected.push({ id: item.driveId, reason: 'missing title' }); continue; }

    try {
      const drive = await Drive.findOneAndUpdate(
        { driveId: payload.driveId },
        payload,
        { upsert: true, new: true, runValidators: true }
      );
      saved.push(drive);
    } catch (err) {
      rejected.push({ id: item.driveId, reason: err.message });
    }
  }

  console.log(`   ✅ Saved: ${saved.length}  ❌ Rejected: ${rejected.length}`);
  return { saved, rejected };
}

// ─── Step 6: Process Applications ──────────────────────────────────

async function processApplications(records, studentObjMap, driveObjMap) {
  console.log('\n📝  Processing applications... (total:', records.length, ')');
  const saved = [];
  const rejected = [];

  for (const item of records) {
    const payload = {
      applicationId: sanitizeString(item.applicationId),
      studentId: sanitizeString(item.studentId),
      driveId: sanitizeString(item.driveId),
      currentRound: sanitizeString(item.currentRound),
      status: sanitizeString(item.status, 'pending'),
      appliedAt: item.appliedAt ? new Date(item.appliedAt) : new Date(),
    };

    // Link ObjectIds
    if (payload.studentId && studentObjMap[payload.studentId]) {
      payload.student = studentObjMap[payload.studentId];
    }
    if (payload.driveId && driveObjMap[payload.driveId]) {
      payload.drive = driveObjMap[payload.driveId];
    }

    if (!payload.applicationId) { rejected.push({ id: item.applicationId, reason: 'missing applicationId' }); continue; }

    try {
      const app = await Application.findOneAndUpdate(
        { applicationId: payload.applicationId },
        payload,
        { upsert: true, new: true, runValidators: true }
      );
      saved.push(app);
    } catch (err) {
      rejected.push({ id: item.applicationId, reason: err.message });
    }
  }

  console.log(`   ✅ Saved: ${saved.length}  ❌ Rejected: ${rejected.length}`);
  return { saved, rejected };
}

// ─── Step 7: Process Interviews ────────────────────────────────────

async function processInterviews(records, appObjMap) {
  console.log('\n🎤  Processing interviews... (total:', records.length, ')');
  const saved = [];
  const rejected = [];

  for (const item of records) {
    const payload = {
      interviewId: sanitizeString(item.interviewId),
      applicationId: sanitizeString(item.applicationId),
      interviewer: sanitizeString(item.interviewer),
      round: sanitizeString(item.round),
      scheduledAt: item.interviewDate ? new Date(item.interviewDate) : new Date(),
      result: sanitizeString(item.result),
    };

    // Link ObjectId
    if (payload.applicationId && appObjMap[payload.applicationId]) {
      payload.application = appObjMap[payload.applicationId];
    }

    if (!payload.interviewId) { rejected.push({ id: item.interviewId, reason: 'missing interviewId' }); continue; }

    try {
      const interview = await Interview.findOneAndUpdate(
        { interviewId: payload.interviewId },
        payload,
        { upsert: true, new: true, runValidators: true }
      );
      saved.push(interview);
    } catch (err) {
      rejected.push({ id: item.interviewId, reason: err.message });
    }
  }

  console.log(`   ✅ Saved: ${saved.length}  ❌ Rejected: ${rejected.length}`);
  return { saved, rejected };
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  PCP Data Sync – Fetch & Store to MongoDB');
  console.log('  Student: ' + STUDENT_ID + '  |  Set: A');
  console.log('═══════════════════════════════════════════════\n');

  // Connect to MongoDB
  console.log('🗄️  Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('   ✅ Connected to MongoDB\n');

  try {
    // 1. Get token
    const { token, dataUrl } = await getToken();

    // 2. Fetch data
    const rawData = await fetchData(token, dataUrl);
    const data = rawData.data || rawData;

    const students = data.students || [];
    const companies = data.companies || [];
    const drives = data.drives || [];
    const applications = data.applications || [];
    const interviews = data.interviews || [];

    console.log('\n📊  Fetched Data Summary:');
    console.log(`   Students:     ${students.length}`);
    console.log(`   Companies:    ${companies.length}`);
    console.log(`   Drives:       ${drives.length}`);
    console.log(`   Applications: ${applications.length}`);
    console.log(`   Interviews:   ${interviews.length}`);

    // Maps: source ID -> MongoDB ObjectId
    const studentObjMap = {};  // STU1001 -> ObjectId
    const companyObjMap = {};  // CMP501 -> ObjectId
    const driveObjMap = {};    // DRV101 -> ObjectId
    const appObjMap = {};      // APP9001 -> ObjectId

    // 3. Process companies (needed by drives)
    if (companies.length > 0) {
      const result = await processCompanies(companies);
      result.saved.forEach(c => { companyObjMap[c.companyId] = c._id; });
    }

    // 4. Process students
    if (students.length > 0) {
      const result = await processStudents(students);
      result.saved.forEach(s => { studentObjMap[s.studentId] = s._id; });
    }

    // 5. Process drives (links to companies)
    if (drives.length > 0) {
      const result = await processDrives(drives, companyObjMap);
      result.saved.forEach(d => { driveObjMap[d.driveId] = d._id; });
    }

    // 6. Process applications (links to students & drives)
    if (applications.length > 0) {
      const result = await processApplications(applications, studentObjMap, driveObjMap);
      result.saved.forEach(a => { appObjMap[a.applicationId] = a._id; });
    }

    // 7. Process interviews (links to applications)
    if (interviews.length > 0) {
      await processInterviews(interviews, appObjMap);
    }

    // 8. Final summary
    const finalCounts = {
      students: await Student.countDocuments(),
      companies: await Company.countDocuments(),
      drives: await Drive.countDocuments(),
      applications: await Application.countDocuments(),
      interviews: await Interview.countDocuments(),
    };

    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ Sync Complete!');
    console.log('═══════════════════════════════════════════════');
    console.log('  Final DB Counts:');
    Object.entries(finalCounts).forEach(([k, v]) => {
      console.log(`   ${k.padEnd(15)} ${v}`);
    });
    console.log('═══════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ Error during sync:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🗄️  Disconnected from MongoDB');
  }
}

main();
