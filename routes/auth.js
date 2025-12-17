
const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuid } = require('uuid');
const { addMinutes, formatISO } = require('date-fns'); 
const db = require('../db');

const router = express.Router();


const findUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const insertUser = db.prepare('INSERT INTO users (id,name,email,password_hash,created_at) VALUES (?,?,?,?,?)');

const insertToken = db.prepare('INSERT INTO password_resets (token,user_id,expires_at) VALUES (?,?,?)');
const getToken = db.prepare('SELECT * FROM password_resets WHERE token = ?');
const deleteToken = db.prepare('DELETE FROM password_resets WHERE token = ?');
const deleteTokensByUser = db.prepare('DELETE FROM password_resets WHERE user_id = ?'); // NEW
const updatePass = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');


function requireGuest(req, res, next) {
  if (req.session.user) return res.redirect('/schedules/me');
  next();
}
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}


router.get('/register', requireGuest, (req, res) => res.render('register', { error: null }));
router.post('/register', requireGuest, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.render('register', { error: 'All fields required.' });
  if (findUserByEmail.get(email)) return res.render('register', { error: 'Email already registered.' });
  const hash = await bcrypt.hash(password, 12);
  const user = { id: uuid(), name, email, password_hash: hash, created_at: formatISO(new Date()) };
  insertUser.run(user.id, user.name, user.email, user.password_hash, user.created_at);
  req.session.user = { id: user.id, name: user.name, email: user.email };
  res.redirect('/schedules/me');
});

router.get('/login', requireGuest, (req, res) => res.render('login', { error: null }));
router.post('/login', requireGuest, async (req, res) => {
  const { email, password } = req.body;
  const user = findUserByEmail.get(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.render('login', { error: 'Invalid credentials.' });
  }
  req.session.user = { id: user.id, name: user.name, email: user.email };
  res.redirect('/schedules/me');
});

router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

router.get('/forgot', requireGuest, (req, res) => {
  res.render('forgot', {
    step: 'request',
    error: null,
    email: '',
    devCode: null
  });
});


router.post('/forgot', requireGuest, (req, res) => {
  const { email } = req.body;
  const user = findUserByEmail.get(email);

  if (!user) {
    return res.render('forgot', {
      step: 'request',
      error: 'No account for that email.',
      email: '',
      devCode: null
    });
  }

 
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = formatISO(addMinutes(new Date(), 15));

  
  deleteTokensByUser.run(user.id);
  insertToken.run(code, user.id, expires);

  
  console.log(`Password reset code for ${email}: ${code}`);

  res.render('forgot', {
    step: 'verify',
    error: null,
    email,
    devCode: code 
  });
});


router.post('/forgot/verify', requireGuest, async (req, res) => {
  const { email, code, password } = req.body;
  const user = findUserByEmail.get(email);

  if (!user) {
    return res.render('forgot', {
      step: 'request',
      error: 'No account for that email.',
      email: '',
      devCode: null
    });
  }

  const rec = getToken.get(code);
  if (!rec || rec.user_id !== user.id) {
    return res.render('forgot', {
      step: 'verify',
      error: 'Invalid code.',
      email,
      devCode: null
    });
  }

  if (new Date(rec.expires_at) < new Date()) {
    deleteToken.run(code);
    return res.render('forgot', {
      step: 'request',
      error: 'Code has expired. Please request a new one.',
      email: '',
      devCode: null
    });
  }

  const hash = await bcrypt.hash(password, 12);
  updatePass.run(hash, user.id);
  deleteToken.run(code); 

  res.redirect('/login');
});


module.exports = router; 
