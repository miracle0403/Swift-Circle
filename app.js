var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var mysql = require('mysql');

//Authentication packages
var bcrypt = require('bcrypt');
var securePin = require('secure-pin');
var passport = require('passport');
var localStrategy = require('passport-local'),Strategy;
var session = require('express-session');
var MySQLStore = require ('express-mysql-session')(session);
var flash = require('connect-flash');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var db = require('./db.js');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var options = {
  host: "localhost",
  user: "swift", 
  password: "Swift1",
  database: "miracledb"
};

var sessionStore = new MySQLStore(options);
  
app.use(session({
  secret: 'hfgdhfjdhfvg',
  resave: false,
  store: sessionStore,
  saveUninitialized: false,
  /**cookie:
    #secure: true**/
  }));

  // express connect flash
app.use(flash());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

  //passport
app.use(passport.initialize());
app.use(passport.session());

// middle ware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressValidator());

app.use(function(req, res, next){
  res.locals.isAuthenticated = req.isAuthenticated();
  next(); 
})
app.use('/', indexRouter);
app.use('/users', usersRouter);

passport.use(new localStrategy(function(username, password, done){
    console.log(username);
    console.log(password);
    const db = require('./db.js');

    db.query('SELECT user_id, password FROM user WHERE username = ?', [username], function (err, results, fields){
      if (err) {done(err)};
      if (results.length === 0){
        done(null, false);
      }
      else {
        console.log(results[0]);
        const hash = results[0].password.toString();

        bcrypt.compare(password, hash, function(err, response){
          if (response === true){
            return done(null, {user_id: results[0].user_id});
          }
          else{
            return done(null, false);
        }
      });
      
      }
      
    });

    
}))
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
