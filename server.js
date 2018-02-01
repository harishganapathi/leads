var express = require("express")
var http = require("http")
var app = express()
var path = require('path')
var bodyParser = require('body-parser')
var logger = require('morgan')
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
const assert = require('assert');
var publicPath = path.resolve(__dirname,"public")
var passport = require('passport')
var cookieParser = require('cookie-parser')
var expressSession = require('express-session')
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash-plus');
var bCrypt = require('bcrypt');
var mongoose = require('mongoose');
var User       = require('./public/user');
var configDB = 'mongodb://localhost/passport'
mongoose.connect(configDB); 

app.use(expressSession({secret:'secretssh'}))
app.use(passport.initialize())
app.use(passport.session());
app.use(flash())
app.use(express.static(publicPath));
app.set("views",path.resolve(__dirname , "views"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser())

passport.serializeUser(function (user, done) {
    done(null, user._id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});
// mongodb connect function 
var dab;
MongoClient.connect(url, function (err, database) {
    if (err) return console.log(err);
    console.log("Connected successfully to server");
    dab = database.db('mydb')
});
//routes goes this way 
app.get('/displayleads',logincheck, function (request, response) {
    var entries = dab.collection('leads').find().toArray(function (err, result) {
    if (err) return err
    response.render('displayleads',{ entries:result })    
    })
});

app.get('/displayleads/:name',logincheck,function(request,response){
    var seplead =  dab.collection('leads').findOne({name:request.params.name},function(err,eachlead){
    if(err) throw err
    return response.render('eachleads',{seplead:eachlead})
    })
});

app.get('/displayleads/:name/edit', logincheck,function (request, response) {
    var seplead = dab.collection('leads').findOne({ name: request.params.name }, function (err, eachlead) {
        if (err) throw err
        console.log(eachlead)
        console.log('edit leads works')
        return response.render('editleads', { seplead: eachlead })
    })
});

app.post('/displayleads/:name/edit',logincheck, function (request, response) {
    if (!request.body.uname || !request.body.score) {
        response.send("<h1> Please fill in the form</h1>")
    }
    else
    {  
        dab.collection('leads').findOne({ name: request.params.name }, function (err, res) {
           if(request.user.local.email == res.creator)
        
        {
            var upleads = dab.collection('leads').updateOne({ name: request.params.name }, { $set: { name: request.body.uname, score: request.body.score}} , function (err, res) {
            if (err) throw err
            })    
            return response.redirect('/displayleads')
        }
        else
        {
            return response.redirect('/displayleads')
        }
            })
    }
});

app.get('/newleads', logincheck,function (request, response) {
    response.render("newleads")
});

app.post('/newleads',function(request,response){
    //console.log(response)
    if( !request.body.uname || !request.body.score ){
        response.send("<h1> Please fill in the form</h1>")
    }
    else
    {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("mydb");
            var myobj = { name: request.body.uname, score: request.body.score ,creator :request.user.local.email };
            dbo.collection("leads").insertOne(myobj)
    });
response.redirect('/displayleads')
    }
});



app.get('/displayleads/:name/delete',logincheck,function(request,response){
dab.collection('leads').findOne({ name: request.params.name }, function (err, res) {
           if(request.user.local.email == res.creator)
        
        {
        dab.collection('leads').deleteOne({name:request.params.name},function(err,res){
        if (err) throw err
        console.log('deleted')
        response.redirect('/displayleads')
        })
        }
        else
        {
            return response.redirect('/displayleads')
        }
            })




  
})
app.get('/signup', function (request, response) {
    response.render('signup');
});

app.get('/', function (request, response) {
    // Display the Login page with any flash message, if any
    response.render('index');
});

app.post('/', passport.authenticate('local-login', {
    successRedirect: '/displayleads',
    failureRedirect: '/',
    failureFlash: false
}));

app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/displayleads',
    failureRedirect: '/',
    failureFlash: true
}));
app.get('/logout',logincheck, function(request, response) {
        request.logout();
        response.redirect('/');
    });

app.use(function (request, response) {
    response.statusCode = 404;
    response.end("404!");
});
 // end of routes 


//server listen
http.createServer(app).listen(8000)


//strategy passport 
passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, email, password, done) {
        if (email)
            email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

        // asynchronous
        process.nextTick(function() {
            // if the user is not already logged in:
            if (!req.user) {
                User.findOne({ 'local.email' :  email }, function(err, user) {
                    // if there are any errors, return the error
                    if (err)
                        return done(err);

                    // check to see if theres already a user with that email
                    if (user) {
                        return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
                    } else {

                        // create the user
                        var newUser            = new User();

                        newUser.local.email    = email;
                        newUser.local.password = newUser.generateHash(password);

                        newUser.save(function(err) {
                            if (err)
                                return done(err);

                            return done(null, newUser);
                        });
                    }

                });
            // if the user is logged in but has no local account...
            } else if ( !req.user.local.email ) {
                // ...presumably they're trying to connect a local account
                // BUT let's check if the email used to connect a local account is being used by another user
                User.findOne({ 'local.email' :  email }, function(err, user) {
                    if (err)
                        return done(err);
                    
                    if (user) {
                        return done(null, false, req.flash('loginMessage', 'That email is already taken.'));
                        // Using 'loginMessage instead of signupMessage because it's used by /connect/local'
                    } else {
                        var user = req.user;
                        user.local.email = email;
                        user.local.password = user.generateHash(password);
                        user.save(function (err) {
                            if (err)
                                return done(err);
                            
                            return done(null,user);
                        });
                    }
                });
            } else {
                // user is logged in and already has a local account. Ignore signup. (You should log out before trying to create a new account, user!)
                return done(null, req.user);
            }

        });

    }));

passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, email, password, done) {
        if (email)
            email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

        // asynchronous
        process.nextTick(function() {
            User.findOne({ 'local.email' :  email }, function(err, user) {
                // if there are any errors, return the error
                if (err)
                    return done(err);

                // if no user is found, return the message
                if (!user)
                    return done(null, false, req.flash('loginMessage', 'No user found.'));

                if (!user.validPassword(password))
                    return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));

                // all is well, return user
                else
                    return done(null, user);
            });
        });

    }));


    //check user is authenticated 

function logincheck(request,response,next){
        if(request.isAuthenticated())
        return next();

        response.redirect('/')
}

var createHash = function (password) {
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}