const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const Student = require('../models/Student');
const Company = require('../models/Company');
const Drive = require('../models/Drive');
const Application = require('../models/Application');
const Interview = require('../models/Interview');

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
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10;
}

async function getToken(tokenUrl, studentId, studentPassword, set) {
  const body = { studentId, password: studentPassword };
  if (set) body.set = set;
  const res = await axios.post(tokenUrl, body, { headers: { 'Content-Type': 'application/json' } });
  return { token: res.data?.token, dataUrl: res.data?.dataUrl, raw: res.data };
}

async function fetchData(token, dataUrl) {
  const fullUrl = dataUrl.startsWith('http') ? dataUrl : `https://t4e-testserver.onrender.com/api${dataUrl}`;
  const res = await axios.get(fullUrl, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}

async function processStudents(records) {
  const saved = [];
  const rejected = [];
  const duplicates = [];
  for (const item of records) {
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
      if (err.code === 11000) duplicates.push(payload.studentId);
      else rejected.push({ studentId: item.studentId, reasons: [err.message] });
    }
  }
  return { saved, rejected, duplicates };
}

async function processCompanies(records) {
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
    if (!payload.companyId || !payload.name) { rejected.push({ id: item.companyId, reason: 'missing fields' }); continue; }
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
  return { saved, rejected };
}

async function processDrives(records, companyObjMap) {
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
    if (payload.companyId && companyObjMap[payload.companyId]) payload.company = companyObjMap[payload.companyId];
    if (!payload.driveId || !payload.title) { rejected.push({ id: item.driveId, reason: 'missing fields' }); continue; }
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
  return { saved, rejected };
}

async function processApplications(records, studentObjMap, driveObjMap) {
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
    if (payload.studentId && studentObjMap[payload.studentId]) payload.student = studentObjMap[payload.studentId];
    if (payload.driveId && driveObjMap[payload.driveId]) payload.drive = driveObjMap[payload.driveId];
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
  return { saved, rejected };
}

async function processInterviews(records, appObjMap) {
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
    if (payload.applicationId && appObjMap[payload.applicationId]) payload.application = appObjMap[payload.applicationId];
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
  return { saved, rejected };
}

async function syncAll(options = {}) {
  const {
    tokenUrl = process.env.TOKEN_URL || 'https://t4e-testserver.onrender.com/api/public/token',
    studentId = process.env.STUDENT_ID || 'E0423002',
    studentPassword = process.env.STUDENT_PASSWORD || '197349',
    set = 'setA',
    dataUrl = process.env.DATA_URL,
    manageConnection = true,
    mongoUri = process.env.MONGO_URI,
  } = options;

  let connectedHere = false;
  if (manageConnection) {
    if (!mongoUri) throw new Error('MONGO_URI is required when manageConnection is true');
    await mongoose.connect(mongoUri);
    connectedHere = true;
  }

  try {
    const { token, dataUrl: returnedDataUrl } = await getToken(tokenUrl, studentId, studentPassword, set);
    const finalDataUrl = dataUrl || returnedDataUrl || process.env.DATA_URL;
    if (!token) throw new Error('Failed to obtain token');
    const raw = await fetchData(token, finalDataUrl);
    const data = raw.data || raw;

    const students = data.students || [];
    const companies = data.companies || [];
    const drives = data.drives || [];
    const applications = data.applications || [];
    const interviews = data.interviews || [];

    const studentObjMap = {};
    const companyObjMap = {};
    const driveObjMap = {};
    const appObjMap = {};

    const compRes = await processCompanies(companies);
    compRes.saved.forEach(c => { companyObjMap[c.companyId] = c._id; });

    const stuRes = await processStudents(students);
    stuRes.saved.forEach(s => { studentObjMap[s.studentId] = s._id; });

    const driveRes = await processDrives(drives, companyObjMap);
    driveRes.saved.forEach(d => { driveObjMap[d.driveId] = d._id; });

    const appRes = await processApplications(applications, studentObjMap, driveObjMap);
    appRes.saved.forEach(a => { appObjMap[a.applicationId] = a._id; });

    const intRes = await processInterviews(interviews, appObjMap);

    const finalCounts = {
      students: await Student.countDocuments(),
      companies: await Company.countDocuments(),
      drives: await Drive.countDocuments(),
      applications: await Application.countDocuments(),
      interviews: await Interview.countDocuments(),
    };

    return {
      success: true,
      summary: {
        processed: { students: students.length, companies: companies.length, drives: drives.length, applications: applications.length, interviews: interviews.length },
        saved: { students: stuRes.saved.length, companies: compRes.saved.length, drives: driveRes.saved.length, applications: appRes.saved.length, interviews: intRes.saved.length },
        rejected: { students: stuRes.rejected.length, companies: compRes.rejected.length, drives: driveRes.rejected.length, applications: appRes.rejected.length, interviews: intRes.rejected.length },
        finalCounts
      }
    };
  } finally {
    if (connectedHere) await mongoose.disconnect();
  }
}

module.exports = { syncAll };
