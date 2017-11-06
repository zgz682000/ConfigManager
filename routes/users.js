
var DataManager = require("../service/DataManager");
var express = require('express');
var router = express.Router();


router.get('/login', function(req, res, next) {
	res.render("login", {title : "ConfigManager"});
});

DataManager.onDatabaseReady(function () {
	/* GET users listing. */


	router.get('/authorize', function(req, res, next){
		var username = req.query.username;
		var password = req.query.password;

		DataManager.getUserByName(username, function (err, userObj) {
			if (err) {
				next(err);
				return;
			}
			if (userObj && userObj.password === password){
				res.cookie("session", username);
				if (req.cookies.authorizeSuccessRedirect && req.cookies.authorizeSuccessRedirect !== "/favicon.ico"){
					res.redirect(req.cookies.authorizeSuccessRedirect);
				}else{
					res.redirect("/projects");
				}
			}else{
				res.redirect("/users/login");
			}
		});


	});
})


module.exports = router;