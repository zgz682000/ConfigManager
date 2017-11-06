var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');
var projects = require("./routes/projects");
var editor = require("./routes/editor");
var save = require("./routes/save");
var close = require("./routes/close");
var heartbeating = require("./routes/heartbeating");
var app = express();
var DataManager = require("./service/DataManager");

DataManager.connectDatabase();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: false , limit: '50mb'}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use(require("./middlewear/Authorizer"));

app.use('/', routes);
app.use('/users', users);
app.use("/projects", projects);
app.use('/editor', editor);
app.use('/save', save);
app.use('/close', close);
app.use('/heartbeating', heartbeating);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

process.on('exit', function(code) {
  console.log("process exit");
  if (DataManager.disconnectDatabase){
    DataManager.disconnectDatabase();
  }
});

module.exports = app;
