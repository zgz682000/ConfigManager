/**
 * Created by zhangguozhi on 16/7/7.
 */

var express = require('express');
var router = express.Router();
var fs = require("fs");

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
			var fileContent = null;
			if (filePath.endsWith(".json")){
				fileContent = JSON.stringify(req.body, null, '\t');
			}else if (filePath.endsWith(".plist")){
				var plist = require("plist");
				fileContent = plist.build(req.body);
			}
			fs.writeFile(fullFilePath, fileContent, null, function(err){
				if (err){
					next(err);
					return;
				}
				res.send("ok");
			});
		})
	});
})
/* GET home page. */




module.exports = router;
