/**
 * Created by zhangguozhi on 16/7/7.
 */

var express = require('express');
var router = express.Router();
var fs = require("fs");
var path = require('path');
var DataManager = require("../service/DataManager");


DataManager.onDatabaseReady(function () {
	router.post('/:projectName/*', function(req, res, next) {
		var projectName = req.params.projectName;
		var filePath = req.path.substr(projectName.length + 2);
		DataManager.getProjectByName(projectName, function (err, projectObj) {
			if (err){
				next(err);
				return;
			}
			var projectPath = projectObj.path;
			var fullFilePath = projectPath + "/" + filePath;
			DataManager.unlockFile(fullFilePath, function (err) {
				if (err){
					next(err);
					return;
				}
				res.send("ok");
			})
		})
	});
});





module.exports = router;
