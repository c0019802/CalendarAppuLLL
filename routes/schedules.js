const express = require('express');
const { v4: uuid } = require('uuid');
const { startOfDay, endOfDay, isAfter, parseISO, formatISO } = require('date-fns');
const db = require('../db');

const router = express.Router();

function requireAuth(req,res,next){
  if(!req.session.user) return res.redirect('/login');
  next();
}

const qToday = db.prepare('SELECT * FROM events WHERE user_id=? AND starts_at BETWEEN ? AND ? ORDER BY starts_at');
const qUpcoming = db.prepare('SELECT * FROM events WHERE user_id=? AND starts_at > ? ORDER BY starts_at LIMIT 20');
const insertEvent = db.prepare('INSERT INTO events (id,user_id,title,description,starts_at,ends_at,created_at) VALUES (?,?,?,?,?,?,?)');
const deleteEvent = db.prepare('DELETE FROM events WHERE id=? AND user_id=?');

router.get('/me', requireAuth, (req,res)=>{
  const now = new Date();
  const today = qToday.all(req.session.user.id, formatISO(startOfDay(now)), formatISO(endOfDay(now)));
  const upcoming = qUpcoming.all(req.session.user.id, formatISO(now));
  res.render('my-schedule',{ today, upcoming });
});

router.post('/me/events', requireAuth, (req,res)=>{
  const { title, description, starts_at, ends_at } = req.body;
  if(!title || !starts_at) return res.redirect('/schedules/me');
  insertEvent.run(uuid(), req.session.user.id, title, description || null, starts_at, ends_at || null, formatISO(new Date()));
  res.redirect('/schedules/me');
});

router.post('/me/events/:id/delete', requireAuth, (req,res)=>{
  deleteEvent.run(req.params.id, req.session.user.id);
  res.redirect('/schedules/me');
});

module.exports = router;
