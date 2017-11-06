var express = require('express');
var router = express.Router();
var fs = require("fs");
var path = require('path');
var DataManager = require("../service/DataManager");


DataManager.onDatabaseReady(function () {
	router.post('/:projectName/*', function(req, res, next) {
		var projectName = req.params.projectName;
		var filePath = req.path.substr(projectName.length + 2);

		DataManager.getProjectByName(projectName, function (err, projectConfig) {
			if (err){
				next(err);
				return;
			}

			var projectPath = projectConfig.path;
			var fullFilePath = projectPath + "/" + filePath;
			DataManager.lockFile(fullFilePath, function (err) {
				if (err){
					next(err);
					return;
				}
				console.log("heartbeating");
				res.send("ok");
			})
		})
	});
})
/* GET home page. */




module.exports = router;
