import { print } from 'util';

/**
 * Created by zhangguozhi on 16/7/7.
 */
var express = require('express');
var router = express.Router();
var fs = require("fs");
var async = require("async");
var DataManager = require("../service/DataManager");
DataManager.onDatabaseReady(function () {
	/* GET home page. */
	router.get('/:projectName/*', function(req, res, next) {
		var projectName = req.params.projectName;
		var filePath = req.path.substr(projectName.length + 2);
		filePath = decodeURI(filePath);
		console.log("decoded filepath = " + filePath);

		DataManager.getProjectByName(projectName, function (err, projectConfig) {
			if (err){
				next(err);
				return;
			}
			var projectPath = projectConfig.path;
			var fullFilePath = projectPath + "/" + filePath;
			if (!fs.existsSync(fullFilePath)){
				next(new Error("file not exists " + filePath));
				return;
			}

			async.waterfall(
				[
					function (callback) {
						DataManager.isFileLocked(fullFilePath, function (err, isLocked){
							callback(err, isLocked);
						});
					},
					function (isLocked, callback) {
						if (!isLocked){
							DataManager.lockFile(fullFilePath, function (err) {
								callback(err, isLocked)
							});
						}else {
							callback(null, isLocked);
						}
					},

					function (isLocked, callback) {
						var schemaString = null;
						if (projectConfig.schema_path){
							var schemaPath = projectConfig.schema_path + "/" + filePath;
							if (fs.existsSync(schemaPath)){
								schemaString = fs.readFileSync(schemaPath);
							}
						}
						if (filePath.endsWith(".json")) {
							fs.readFile(fullFilePath,null,function(err, data){
								if (err){
									callback(err);
									return;
								}
								var jsonString = data.toString();
								res.render("editor", { title: projectName + "/" + filePath, json: jsonString, schema: schemaString, lock: isLocked });
							});
						} else if (filePath.endsWith(".plist")) {
							fs.readFile(fullFilePath, null, function (err, data) {
								if (err) {
									callback(err);
									return;
								}
								var plist = require('plist');
								var plistObj = plist.parse(data.toString());
								var jsonString = JSON.stringify(plistObj);
								res.render("editor", { title: projectName + "/" + filePath, json: jsonString, schema: schemaString, lock: isLocked });
							});
						}else{
							res.sendFile(fullFilePath);
						}
					}
				],
				function (err) {
					if (err){
						next(err);
					}
				}
			)
		});
	});
});


module.exports = router;
