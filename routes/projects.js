/**
 * Created by zhangguozhi on 16/7/6.
 */

var express = require('express');
var router = express.Router();
var process = require('child_process');
var async = require("async");
var fs = require("fs");
var path = require('path');
var DataManager = require("../service/DataManager");
var multer = require('multer')
var upload = multer()
var deleteFolderRecursive = function(path) {

	var files = [];

	if( fs.existsSync(path) ) {

		files = fs.readdirSync(path);

		files.forEach(function(file,index){

			var curPath = path + "/" + file;

			if(fs.statSync(curPath).isDirectory()) { // recurse

				deleteFolderRecursive(curPath);

			} else { // delete file

				fs.unlinkSync(curPath);

			}

		});

		fs.rmdirSync(path);

	}

};

DataManager.onDatabaseReady(function () {
	router.get('/', function(req, res, next) {
		DataManager.getAllProjects(function (err, projects) {
			if (err){
				next(err);
				return;
			}
			var projectDatas = [];
			for(var i in projects){
				var projectConfig = projects[i];
				projectDatas.push({
					path:projectConfig.name,
					type:"directory",
					isProject: true
				});
			}
			res.render('files', { title: "Config Manager", projectPath : '/', fileDatasString : JSON.stringify(projectDatas)});
		});
	});

	router.post('/:projectName', upload.single("upload_file"), function(req, res, next) {
		var projectName = req.params.projectName;
		
		DataManager.getProjectByName(projectName, function (err, projectConfig) {
			if (err){
				next(err);
				return;
			}

			if(req.query.hasOwnProperty("commit") && projectConfig.hasOwnProperty("commit_trigger_command")){
				var commitTriggerCommand = projectConfig.commit_trigger_command;
				process.exec(commitTriggerCommand, function (err, stdout, stderr) {
					console.log("stdout : " + stdout);
					console.log("stderr : " + stderr);
					res.send({
						result: "ok",
						stdout: stdout,
						stderr: stderr
					});
				});
			}

			else if(req.query.hasOwnProperty("revert") && projectConfig.hasOwnProperty("revert_trigger_command")){
				var revertTriggerCommand = projectConfig.revert_trigger_command;
				process.exec(revertTriggerCommand, function (err, stdout, stderr) {
					console.log("stdout : " + stdout);
					console.log("stderr : " + stderr);
					res.send({
						result : "ok",
						stdout : stdout,
						stderr: stderr
					});
				});
			} 
			else if (req.query.hasOwnProperty("upload")) {
				console.log(">>>>req.files = " + JSON.stringify(req.file));
				if (req.file && req.file.originalname && req.file.buffer){
					
					var directoryPath = req.path.substr(projectName.length + 2);
					var fullDirectoryPath = projectConfig.path + "/" + directoryPath;
					if (!fs.existsSync(fullDirectoryPath)) {
						next(new Error("path not exist " + projectName + "/" + directoryPath));
						return;
					}
					var uploadFilePath = fullDirectoryPath + "/" + req.file.originalname

					if (fs.existsSync(uploadFilePath)){
						fs.unlinkSync(uploadFilePath);
					}
					fs.writeFile(uploadFilePath, req.file.buffer, function(err){
						if (err){
							res.send({
								result: "error",
								stdout: "",
								stderr: err
							});
							return;
						}else{
							res.send({
								result: "ok",
								stdout: "",
								stderr: ""
							});
						}
					});
				}else{
					res.send({
						result: "error",
						stdout: "",
						stderr: "file upload error"
					});
				}
				
			}

		});

	});

	router.get('/:projectName', function(req, res, next) {
		var projectName = req.params.projectName;


		DataManager.getProjectByName(projectName, function (err, projectConfig) {
			if (err) {
				next(err);
				return;
			}

			var projectPath = projectConfig.path;


			async.waterfall(
				[
					function (callback) {
						if (req.query.hasOwnProperty("new")) {
							var newName = req.query.new;
							var newPath = projectPath + "/" + newName;
							if (newName.endsWith(".json") || newName.endsWith(".plist")) {
								if (!fs.existsSync(newPath)) {
									fs.writeFileSync(newPath, "{}");
								}
							} else {
								if (!fs.existsSync(newPath)) {
									fs.mkdirSync(newPath);
								}
							}
							callback(null);
						}
						else if (projectConfig.hasOwnProperty("open_trigger_command")) {
							var openTriggerCommand = projectConfig.open_trigger_command;
							process.exec(openTriggerCommand, function (err, stdout, stderr) {
								console.log("stdout : " + stdout);
								console.log("stderr : " + stderr);
								callback(null, stdout, stderr);
							});
						}
					},

					function (stdout, stderr, callback) {
						var projectFileDatas = [];
						var files = fs.readdirSync(projectPath);
						for (var i in files) {
							var file = files[i];
							var fileStat = fs.statSync(projectPath + "/" + file);
							if (fileStat.isDirectory()) {
								projectFileDatas.push(
									{
										path: projectName + "/" + file,
										type: 'directory'
									}
								);
							} else {
								if (path.extname(file) !== ".json" && path.extname(file) !== ".plist") {
									continue;
								}
								
								projectFileDatas.push(
									{
										path: projectName + "/" + file,
										name: file,
										type: 'file',
										size: fileStat.size,
										modified: fileStat.mtime
									}
								);
							}
						}
						res.render('files', {
							isProjectRoot: true,
							title: projectName,
							projectPath: projectName,
							fileDatasString: JSON.stringify(projectFileDatas)
						});
						callback(null);
					}
				],
				function (err) {
					if (err){
						next(err);
					}
				}
			);
		});
	});


	router.get('/:projectName/*', function(req, res, next) {
		var projectName = req.params.projectName;
		var directoryPath = req.path.substr(projectName.length + 2);
		DataManager.getProjectByName(projectName, function (err, projectConfig) {
			if (err) {
				next(err);
				return;
			}

			var projectPath = projectConfig.path;
			var fullDirectoryPath = projectPath + "/" + directoryPath;
			if (!fs.existsSync(fullDirectoryPath)) {
				next(new Error("path not exist " + projectName + "/" + directoryPath));
				return;
			}
			
			if (req.query.hasOwnProperty("new")) {
				var newName = req.query.new;
				var newPath = fullDirectoryPath + "/" + newName;
				if (newName.endsWith(".json")) {
					if (!fs.existsSync(newPath)) {
						fs.writeFileSync(newPath, "{}");
					}
				}else if (newName.endsWith(".plist")) {
					if (!fs.existsSync(newPath)) {
						fs.writeFileSync(newPath, '<?xml version="1.0" encoding="UTF - 8"?>\
							< !DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd" >\
							<plist version="1.0">\
								<dict>\
								</dict>\
							</plist>');
					}
				} else {
					if (!fs.existsSync(newPath)) {
						fs.mkdirSync(newPath);
					}
				}
			}
			var projectFileDatas = [];
			var files = fs.readdirSync(fullDirectoryPath);
			for (var i in files) {
				var file = files[i];
				var fileStat = fs.statSync(fullDirectoryPath + "/" + file);
				if (fileStat.isDirectory()) {
					projectFileDatas.push(
						{
							path: projectName + "/" + directoryPath + "/" + file,
							type: 'directory',
						}
					);
				} else {
					if (path.extname(file) !== ".json" && path.extname(file) !== ".plist") {
						continue;
					}
					projectFileDatas.push(
						{
							path: projectName + "/" + directoryPath + "/" + file,
							type: 'file',
							size: fileStat.size,
							modified: fileStat.mtime
						}
					);
				}
			}
			res.render('files', {
				isProjectRoot: false,
				title: req.path.substr(1),
				projectPath: projectName + "/" + directoryPath,
				fileDatasString: JSON.stringify(projectFileDatas)
			});
		});
	});
})

/* GET home page. */


module.exports = router;
