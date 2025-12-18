
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const morgan = require('morgan');
const methodOverride = require('method-override');
const path = require('path');

const compression = require('compression');

const authRoutes = require('./routes/auth');
const scheduleRoutes = require('./routes/schedules');
const groupRoutes = require('./routes/groups');
console.log('authRoutes:', typeof authRoutes);
console.log('scheduleRoutes:', typeof scheduleRoutes);
console.log('groupRoutes:', typeof groupRoutes);


const app = express();


app.use(compression());


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


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


app.use((req, res, next) => { res.locals.user = req.session.user || null; next(); });


app.use('/', authRoutes);
app.use('/schedules', scheduleRoutes);
app.use('/groups', groupRoutes);


app.get('/', (req, res) => res.redirect(req.session.user ? '/schedules/me' : '/login'));


app.listen(3000, () => console.log('http://localhost:3000'));

app.use(express.static('public', {
  maxAge: '1d',       // Cache CSS/images for 24h
  etag: true,
  lastModified: true
}));
