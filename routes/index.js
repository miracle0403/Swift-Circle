var express = require('express');
var passport = require('passport')
var router = express.Router();
var db = require('../db.js');
var expressValidator = require('express-validator');

var bcrypt = require('bcrypt');
const saltRounds = 15;

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log(req.user)
  console.log(req.isAuthenticated())
  res.render('index', { title: 'SWIFT CIRCLE' });
});

//test flash
router.get('/addFlash', function (req, res) {
  req.flash('info', 'Flash Message Added');
  res.redirect('/');
});
 
//get register with referral link
router.get('/register/:username', function(req, res, next) {
  const db = require('../db.js');
  var username = req.params.username;
  // get the list of supported countries
  db.query('SELECT * FROM countries_supported', function(err, results, fields){
    if (err) throw err;
    var country = results;
    //get the sponsor name on the registration page
    db.query('SELECT username FROM user WHERE username = ?', [username],
    function(err, results, fields){
      if (err) throw err;

      if (results.length === 0){
        res.render('register')
        console.log('not a valid sponsor name');
      }else{
        var sponsor = results[0].username;
        console.log(sponsor)
        if (sponsor){
          console.log(JSON.stringify(sponsor));
          res.render('register', { title: 'REGISTRATION', country: country, sponsor: sponsor });
        }     
      }
    });  
  });
});

//register get request
router.get('/register', function(req, res, next) {
  // get the list of supported countries
  db.query('SELECT * FROM countries_supported', function(err, results, fields){
    if (err) throw err;
    var country = results;
    res.render('register', { title: 'REGISTRATION', country: country });
  });
});

//get login
router.get('/login', function(req, res, next) {
  res.render('login', { title: 'LOG IN'});
});

//get referrals
router.get('/referrals', authentificationMiddleware(), function(req, res, next) {
  var currentUser = req.session.passport.user.user_id;
  //get sponsor name from database to profile page
  db.query('SELECT sponsor FROM user WHERE user_id = ?', [currentUser], function(err, results, fields){
    if (err) throw err;
    var sponsor = results[0].sponsor;
    db.query('SELECT username FROM user WHERE user_id = ?', [currentUser], function(err, results, fields){
      if (err) throw err;
      //get the referral link to home page
      var website = "localhost:3002/";
      var user = results[0].username;
      var reg = "register/";
      var link = website + user;
      var register = website + reg + user
      db.query('SELECT * FROM user WHERE sponsor = ?', [user], function(err, results, fields){
        if (err) throw err;
        console.log(results)
        res.render('referrals', { title: 'Referrals', register: register, referrals: results, sponsor: sponsor, link: link});
      });
    });
  });
});


//get logout
router.get('/logout', function(req, res, next) {
  req.logout();
  req.session.destroy();
  res.redirect('/');
});

//get dashboard
router.get('/dashboard', authentificationMiddleware(), function(req, res, next) {
  var db = require('../db.js');
  var currentUser = req.session.passport.user.user_id;

  //get sponsor name from database to profile page
  db.query('SELECT sponsor FROM user WHERE user_id = ?', [currentUser], function(err, results, fields){
    if (err) throw err;

    var sponsor = results[0];
    if (sponsor){
      res.render('dashboard', { title: 'USER DASHBOARD', sponsor:sponsor });
    }
  });
});

//get profile
router.get('/profile', authentificationMiddleware(), function(req, res, next) {
  res.render('profile', {title: 'PROFILE'});
});


//post register
router.post('/register', function(req, res, next) {
  console.log(req.body) 
  req.checkBody('sponsor', 'Sponsor must not be empty').notEmpty();
  req.checkBody('sponsor', 'Sponsor must be between 8 to 25 characters').len(8,25);
  req.checkBody('username', 'Username must be between 8 to 25 characters').len(8,25);
  req.checkBody('fullname', 'Full Name must be between 8 to 25 characters').len(8,25);
  req.checkBody('pass1', 'Password must be between 8 to 25 characters').len(8,100);
  req.checkBody('pass2', 'Password confirmation must be between 8 to 100 characters').len(8,100);
  req.checkBody('email', 'Email must be between 8 to 25 characters').len(8,25);
  req.checkBody('email', 'Invalid Email').isEmail();
  req.checkBody('pass1', 'Password must match').equals(req.body.pass2);
  req.checkBody('phone', 'Phone Number must be ten characters').len(10);
  //req.checkBody('pass1', 'Password must have upper case, lower case, symbol, and number').matches(/^(?=,*\d)(?=, *[a-z])(?=, *[A-Z])(?!, [^a-zA-Z0-9]).{8,}$/, "i")
 
  var errors = req.validationErrors();

  if (errors) { 
    console.log(JSON.stringify(errors));
    res.render('register', { title: 'REGISTRATION FAILED', errors: errors});
    //return noreg
  }
  else {
    var username = req.body.username;
    var password = req.body.pass1;
    var cpass = req.body.pass2;
    var email = req.body.email;
    var sponsor = req.body.sponsor;
    var fullname = req.body.fullname;
    var code = req.body.code;
    var phone = req.body.phone

    var db = require('../db.js');
    
    //check if sponsor is valid
    db.query('SELECT username FROM user WHERE username = ?', [sponsor], function(err, results, fields){
      if (err) throw err;
      if(results.length===0){
        var sponsor = "This Sponsor does not exist"
        res.render('register', {title: "REGISTRATION FAILED", sponsor: sponsor});
      }else{
        db.query('SELECT username FROM user WHERE username = ?', [username], function(err, results, fields){
          if (err) throw err;
          if(results.length===1){
            var usernameTaken = "Sorry, this username is taken";
            res.render('register', {title: "REGISTRATION FAILED", username: usernameTaken});
          }else{
            db.query('SELECT email FROM user WHERE email = ?', [email], function(err, results, fields){
              if (err) throw err;
              if(results.length===1){
                var emailTaken = "Sorry, this email is taken";
                res.render('register', {title: "REGISTRATION FAILED", email: emailTaken});
              }else{
                bcrypt.hash(password, saltRounds, function(err, hash){
                  db.query('INSERT INTO user (full_name, phone, code, username, email, sponsor, password, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [fullname, phone, code, username, email, sponsor, hash, 0], function(error, result, fields){
                    if (error) throw error;
                    res.render('register', {title: "REGISTRATION SUCCESSFUL"});  
                  });
                });
              }
            });
          }
        });
      }
    });
  }
});
//Passport login
passport.serializeUser(function(user_id, done){
  done(null, user_id)
});
        
passport.deserializeUser(function(user_id, done){
  done(null, user_id)
});

//authentication middleware snippet
function authentificationMiddleware(){
  return (req, res, next) => {
    console.log(JSON.stringify(req.session.passport));
  if (req.isAuthenticated()) return next();

  res.redirect('/login'); 
  } 
}
router.post('/login', passport.authenticate('local', {
  failureRedirect: '/login',
  successRedirect: '/dashboard'
}));
module.exports = router;