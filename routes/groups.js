
const express = require('express');
const { v4: uuid } = require('uuid');
const { formatISO } = require('date-fns');
const db = require('../db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

const qMyGroups = db.prepare(`
  SELECT g.*, gm.role FROM groups g
  JOIN group_members gm ON gm.group_id = g.id
  WHERE gm.user_id = ?
  ORDER BY g.name
`);
const qMembers = db.prepare(`
  SELECT u.id, u.name, u.email, gm.role FROM group_members gm
  JOIN users u ON u.id = gm.user_id
  WHERE gm.group_id = ?
  ORDER BY u.name
`);
const qGroup = db.prepare('SELECT * FROM groups WHERE id = ?');
const isAdmin = db.prepare("SELECT 1 FROM group_members WHERE group_id=? AND user_id=? AND role='admin'");
const addMember = db.prepare('INSERT OR IGNORE INTO group_members (group_id,user_id,role) VALUES (?,?,?)');
const removeMember = db.prepare('DELETE FROM group_members WHERE group_id=? AND user_id=?');
const findUserByEmail = db.prepare('SELECT * FROM users WHERE email=?');

const qEvents = db.prepare(`
  SELECT ge.*, u.name AS creator, r.response AS my_response
  FROM group_events ge
  LEFT JOIN users u ON u.id = ge.created_by
  LEFT JOIN group_event_rsvps r ON r.event_id = ge.id AND r.user_id = ?
  WHERE ge.group_id=?
  ORDER BY ge.starts_at
`);

const getEvent = db.prepare('SELECT * FROM group_events WHERE id=? AND group_id=?');

const addEvent = db.prepare(
  'INSERT INTO group_events (id,group_id,created_by,title,description,starts_at,ends_at,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)'
);
const updateEvent = db.prepare(
  'UPDATE group_events SET title=?, description=?, starts_at=?, ends_at=? WHERE id=? AND group_id=?'
);
const cancelEvent = db.prepare(
  "UPDATE group_events SET status='cancelled' WHERE id=? AND group_id=?"
);

const deleteEvent = db.prepare(
  'DELETE FROM group_events WHERE id=? AND group_id=?'
);

const deleteGroup = db.prepare('DELETE FROM groups WHERE id=?');

const qRsvpsForGroup = db.prepare(`
  SELECT r.event_id, u.name, u.email, r.response
  FROM group_event_rsvps r
  JOIN users u ON u.id = r.user_id
  JOIN group_events ge ON ge.id = r.event_id
  WHERE ge.group_id = ?
`);

const upsertRsvp = db.prepare(`
  INSERT INTO group_event_rsvps (event_id,user_id,response,responded_at)
  VALUES (?,?,?,?)
  ON CONFLICT(event_id,user_id)
  DO UPDATE SET response=excluded.response, responded_at=excluded.responded_at
`);

router.get('/', requireAuth, (req, res) => {
  const groups = qMyGroups.all(req.session.user.id);
  res.render('shared-schedules', { groups, active: null, events: [], members: [] });
});

router.get('/:id', requireAuth, (req, res) => {
  const groups = qMyGroups.all(req.session.user.id);
  const group = qGroup.get(req.params.id);
  if (!group) return res.redirect('/groups');


  if (!groups.find(g => g.id === group.id)) return res.redirect('/groups');

  const events = qEvents.all(req.session.user.id, group.id);
  const members = qMembers.all(group.id);
  const rsvps = qRsvpsForGroup.all(group.id);


  const eventMap = Object.create(null);
  for (const e of events) {
    e.rsvpYes = 0;
    e.rsvpNo = 0;
    e.rsvpMaybe = 0;
    e.rsvps = [];
    eventMap[e.id] = e;
  }

  for (const r of rsvps) {
    const e = eventMap[r.event_id];
    if (!e) continue;
    if (r.response === 'yes') e.rsvpYes++;
    else if (r.response === 'no') e.rsvpNo++;
    else if (r.response === 'maybe') e.rsvpMaybe++;
    e.rsvps.push(r);
  }

  res.render('shared-schedules', {
    groups,
    active: group,
    events,
    members
  });
});

router.get('/:id/events/:eventId/edit', requireAuth, (req, res) => {
  const groupId = req.params.id;
  const eventId = req.params.eventId;

  if (!isAdmin.get(groupId, req.session.user.id)) {
    return res.redirect(`/groups/${groupId}`);
  }

  const groups = qMyGroups.all(req.session.user.id);
  const group = qGroup.get(groupId);
  const event = getEvent.get(eventId, groupId);

  if (!group || !event) return res.redirect('/groups');

  res.render('edit-group-event', { group, groups, event });
});

router.post('/:id/events/:eventId/edit', requireAuth, (req, res) => {
  const groupId = req.params.id;
  const eventId = req.params.eventId;

  if (!isAdmin.get(groupId, req.session.user.id)) {
    return res.redirect(`/groups/${groupId}`);
  }

  const { title, description, starts_at, ends_at } = req.body;
  updateEvent.run(title, description || null, starts_at, ends_at || null, eventId, groupId);
  res.redirect(`/groups/${groupId}`);
});

router.post('/:id/events/:eventId/cancel', requireAuth, (req, res) => {
  const groupId = req.params.id;
  const eventId = req.params.eventId;

  if (!isAdmin.get(groupId, req.session.user.id)) {
    return res.redirect(`/groups/${groupId}`);
  }

  cancelEvent.run(eventId, groupId);
  res.redirect(`/groups/${groupId}`);
});

router.post('/:id/events/:eventId/delete', requireAuth, (req, res) => {
  const groupId = req.params.id;
  const eventId = req.params.eventId;

  if (!isAdmin.get(groupId, req.session.user.id)) {
    return res.redirect(`/groups/${groupId}`);
  }

  deleteEvent.run(eventId, groupId);
  res.redirect(`/groups/${groupId}`);
});




router.post('/:id/events/:eventId/rsvp', requireAuth, (req, res) => {
  const groupId = req.params.id;
  const eventId = req.params.eventId;

  const membership = qMyGroups.all(req.session.user.id).find(g => g.id === groupId);
  if (!membership) return res.redirect('/groups');

  const { response } = req.body;
  const valid = ['yes', 'no', 'maybe'];
  if (!valid.includes(response)) return res.redirect(`/groups/${groupId}`);

  upsertRsvp.run(eventId, req.session.user.id, response, formatISO(new Date()));
  res.redirect(`/groups/${groupId}`);
});

router.get('/new/create', requireAuth, (req, res) =>
  res.render('create-group', { error: null })
);

router.post('/new', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name) return res.render('create-group', { error: 'Group name required.' });

  const id = uuid();
  const now = formatISO(new Date());
  db.prepare('INSERT INTO groups (id,name,created_by,created_at) VALUES (?,?,?,?)')
    .run(id, name, req.session.user.id, now);
  addMember.run(id, req.session.user.id, 'admin'); 
  res.redirect(`/groups/${id}`);
});

router.post('/:id/events', requireAuth, (req, res) => {
  const { title, description, starts_at, ends_at } = req.body;
  const groupId = req.params.id;
  const membership = qMyGroups.all(req.session.user.id).find(g => g.id === groupId);
  if (!membership) return res.redirect('/groups');

  addEvent.run(
    uuid(),
    groupId,
    req.session.user.id,
    title,
    description || null,
    starts_at,
    ends_at || null,
    'active',
    formatISO(new Date())
  );
  res.redirect(`/groups/${groupId}`);
});

router.post('/:id/members', requireAuth, (req, res) => {
  const groupId = req.params.id;
  if (!isAdmin.get(groupId, req.session.user.id)) return res.redirect(`/groups/${groupId}`);
  const { email } = req.body;
  const user = findUserByEmail.get(email);
  if (user) addMember.run(groupId, user.id, 'member');
  res.redirect(`/groups/${groupId}`);
});

router.post('/:id/members/:userId/remove', requireAuth, (req, res) => {
  const groupId = req.params.id;
  if (!isAdmin.get(groupId, req.session.user.id)) return res.redirect(`/groups/${groupId}`);
  removeMember.run(groupId, req.params.userId);
  res.redirect(`/groups/${groupId}`);
});

router.post('/:id/delete', requireAuth, (req, res) => {
  const groupId = req.params.id;
  if (!isAdmin.get(groupId, req.session.user.id)) return res.redirect(`/groups/${groupId}`);
  deleteGroup.run(groupId); 
  res.redirect('/groups');
});

module.exports = router;
