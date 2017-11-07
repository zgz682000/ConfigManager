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

	router.post('/:projectName', function(req, res, next) {
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
						if (req.query.hasOwnProperty("delete")) {
							var deleteName = req.query.delete;
							var deletePath = projectPath + "/" + deleteName;
							if (deleteName.endsWith(".json")) {
								if (fs.existsSync(deletePath)) {
									fs.unlinkSync(deletePath);
								}
							} else {
								if (fs.existsSync(deletePath)) {
									deleteFolderRecursive(deletePath);
								}
							}
							callback(null);
						}
						else if (req.query.hasOwnProperty("new")) {
							var newName = req.query.new;
							var newPath = projectPath + "/" + newName;
							if (newName.endsWith(".json")) {
								if (!fs.existsSync(deletePath)) {
									fs.writeFileSync(newPath, "{}");
								}
							} else {
								if (!fs.existsSync(deletePath)) {
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
								if (path.extname(file) !== ".json") {
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
			if (req.query.hasOwnProperty("delete")) {
				var deleteName = req.query.delete;
				var deletePath = fullDirectoryPath + "/" + deleteName;
				if (deleteName.endsWith(".json")) {
					if (fs.existsSync(deletePath)) {
						fs.unlinkSync(deletePath);
					}
				} else {
					if (fs.existsSync(deletePath)) {
						deleteFolderRecursive(deletePath);
					}
				}

			}
			if (req.query.hasOwnProperty("new")) {
				var newName = req.query.new;
				var newPath = fullDirectoryPath + "/" + newName;
				if (newName.endsWith(".json")) {
					if (!fs.existsSync(deletePath)) {
						fs.writeFileSync(newPath, "{}");
					}
				} else {
					if (!fs.existsSync(deletePath)) {
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
					if (path.extname(file) != ".json") {
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
