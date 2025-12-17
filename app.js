// app.js
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const morgan = require('morgan');
const methodOverride = require('method-override');
const path = require('path');

const authRoutes = require('./routes/auth');
const scheduleRoutes = require('./routes/schedules');
const groupRoutes = require('./routes/groups');
console.log('authRoutes:', typeof authRoutes);
console.log('scheduleRoutes:', typeof scheduleRoutes);
console.log('groupRoutes:', typeof groupRoutes);


const app = express();

// view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(morgan('dev'));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite' }),
  secret: 'change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

// expose user to templates
app.use((req, res, next) => { res.locals.user = req.session.user || null; next(); });

// routes
app.use('/', authRoutes);
app.use('/schedules', scheduleRoutes);
app.use('/groups', groupRoutes);

// default route
app.get('/', (req, res) => res.redirect(req.session.user ? '/schedules/me' : '/login'));

// start server
app.listen(3000, () => console.log('http://localhost:3000'));
