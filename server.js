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

app.use(express.static(publicPath));
app.set("views",path.resolve(__dirname , "views"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:false}));


app.get('/',function(request,response){
    response.render("index")
});

var dab;

MongoClient.connect(url, function (err, database) {
    if (err) return console.log(err);
    console.log("Connected successfully to server");
    dab = database.db('mydb')
});

app.get('/displayleads', function (request, response) {
    var entries = dab.collection('leads').find().toArray(function (err, result) {
    if (err) return err
    console.log(result)
    response.render('displayleads',{ entries:result })    
    })
});

app.get('/displayleads/:name',function(request,response){
    //console.log(request)
    var seplead =  dab.collection('leads').findOne({name:request.params.name},function(err,eachlead){
    if(err) throw err
    //console.log(eachlead)
    return response.render('eachleads',{seplead:eachlead})
    })
});

app.get('/displayleads/:name/edit', function (request, response) {
    //console.log(request)
    var seplead = dab.collection('leads').findOne({ name: request.params.name }, function (err, eachlead) {
        if (err) throw err
        console.log(eachlead)
        console.log('edit leads works')
        return response.render('editleads', { seplead: eachlead })
    })
});

app.post('/displayleads/:name/edit', function (request, response) {

    if (!request.body.uname || !request.body.score) {
        response.send("<h1> Please fill in the form</h1>")
    }
    else
    {
        var upleads = dab.collection('leads').updateOne({ name: request.params.name }, { $set: { name: request.body.uname, score: request.body.score}} , function (err, res) {
        if (err) throw err
        return res
        console.log('update lead works ')
        
    })
        return response.redirect('/displayleads')
}
});

app.get('/newleads', function (request, response) {
    response.render("newleads")
});

app.post('/newleads',function(request,response){
    if( !request.body.uname || !request.body.score ){
        response.send("<h1> Please fill in the form</h1>")
    }
    else
    {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("mydb");
            var myobj = { name: request.body.uname, score: request.body.score };
            dbo.collection("leads").insertOne(myobj)
    });
response.redirect('/displayleads')
    }
});



app.get('/displayleads/:name/delete',function(request,response){
    dab.collection('leads').deleteOne({name:request.params.name},function(err,res){
        if (err) throw err
        console.log('deleted')
        response.redirect('/displayleads')
    })
})

app.use(function (request, response) {
    response.statusCode = 404;
    response.end("404!");
});

http.createServer(app).listen(8000)
