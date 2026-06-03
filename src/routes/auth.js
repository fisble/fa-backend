const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const createToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1d' });
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    const user = await User.create({ name, email, password, role });
    const token = createToken(user);
    res.status(201).json({ success: true, data: { user: { id: user._id, name: user.name, email: user.email, role: user.role }, token } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    console.log('Auth login attempt for', email);
    // Try to find a registered user first
    let user = await User.findOne({ email }).select('+password');
    console.log('Found registered user?', !!user);
    if (user) {
      if (await user.comparePassword(password)) {
        const token = createToken(user);
        return res.json({ success: true, data: { user: { id: user._id, name: user.name, email: user.email, role: user.role }, token } });
      }
      // password mismatch for existing user; fallthrough to student fallback
    }

    // Student fallback: accept students from `students` collection where password equals student id or student.studentId or email local-part
    const Student = require('../models/Student');
    const student = await Student.findOne({ email });
    if (student) {
      console.log('Found student doc:', student._id ? student._id.toString() : null);
      const localId = (student._id || '').toString();
      const studentIdField = (student.studentId || '').toString();
      const emailLocal = (student.email || '').split('@')[0];
      const envStudentId = (process.env.STUDENT_ID || '').toString();
      const envStudentPassword = (process.env.STUDENT_PASSWORD || '').toString();
      console.log('envStudentId, envStudentPassword:', envStudentId, envStudentPassword);
      console.log('password match candidates:', localId, studentIdField, emailLocal);
      console.log('comparisons:',
        'password===localId', password === localId,
        'password===studentIdField', password === studentIdField,
        'password===emailLocal', password === emailLocal,
        'password===envStudentId', password === envStudentId,
        'password===envStudentPassword', password === envStudentPassword
      );
      if (password === localId || password === studentIdField || password === emailLocal || password === envStudentId || password === envStudentPassword) {
        // create a User record for this student if none exists
        if (!user) {
          user = await User.create({ name: student.name || 'Student', email: student.email, password, role: 'student' });
        } else {
          // update existing user's password to match provided (so future logins work)
          user.password = password;
          await user.save();
        }
        const token = createToken(user);
        return res.json({ success: true, data: { user: { id: user._id, name: user.name, email: user.email, role: user.role }, token } });
      }
    }

    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token required' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

module.exports = router;
