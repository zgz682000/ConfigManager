
var MongoClient = require('mongodb').MongoClient;
var mongoConfg = require("../config/Database.json").mongo;
var EventEmitter = require("events").EventEmitter;
var mongoUrl = "mongodb://" + mongoConfg.host + ":" + mongoConfg.port + "/" + mongoConfg.db;
var eventEmitter = new EventEmitter();
var kOnDateBaseReadyEvent = "database_ready";
var kOnDateBaseErrorEvent = "database_error"


exports.onDatabaseReady = function (callback) {
	eventEmitter.addListener(kOnDateBaseReadyEvent, callback);
}
exports.onDatabaseError = function (callback) {
	eventEmitter.addListener(kOnDateBaseErrorEvent, callback);
}

exports.connectDatabase = function () {
	MongoClient.connect(mongoUrl, {native_parser: true}, function (err, db) {
		if (err){
			eventEmitter.emit(kOnDateBaseErrorEvent)
			db.close();
			return;
		}else {
			eventEmitter.emit(kOnDateBaseReadyEvent)
		}
		exports.getUserByName = function(userName, callback) {
			var userCollection = db.collection(mongoConfg.users_collection);
			userCollection.findOne({name : userName}, function (mongoError, result) {
				if (mongoError){
					callback(mongoError);
					return;
				}
				if (!result){
					callback(new Error("user " + userName + " not found"));
				}
				callback(null, result);
			});
		}

		exports.getProjectByName = function(projectName, callback) {
			var projectCollection = db.collection(mongoConfg.projects_collection);
			projectCollection.findOne({name : projectName}, function (mongoError, result) {
				if (mongoError){
					callback(mongoError);
					return;
				}
				if (!result){
					callback(new Error("project " + projectName + " not found"));
				}
				callback(null, result);
			});
		}

		exports.getAllProjects = function (callback) {
			var projectCollection = db.collection(mongoConfg.projects_collection);
			projectCollection.find({}).toArray(function (mongoError, objects) {
				if (mongoError){
					callback(mongoError);
					return;
				}
				callback(null, objects);
			});
		}

		exports.disconnectDatabase = function () {
			db.close();
		};


		exports.isFileLocked = function(filePath, callback){
			var cacheCollection = db.collection(mongoConfg.file_locks_collection);
			cacheCollection.findOne({file_path : filePath}, function (err, result) {
				if (err){
					callback(err);
					return;
				}
				if (!result){
					callback(null, false);
				}else {
					callback(null, true);
				}
			});
		}
		exports.lockFile = function(filePath, callback){

			var cacheCollection = db.collection(mongoConfg.file_locks_collection);
			
			cacheCollection.findOne({file_path : filePath}, function (err, result) {
				if (err){
					callback(err);
					return;
				}
				if (!result){
					cacheCollection.insertOne({file_path : filePath, lock_date : new Date()}, function (err, result) {
						if (err){
							callback(err);
						}else if (result.result.ok !== 1){
							callback(new Error("insert executed not correctly : " + filePath));
						}else {
							callback(null);
						}
					})
				}else {
					cacheCollection.updateOne({file_path : filePath}, {$set : {lock_date : new Date()}}, function (err, result) {
						if (err){
							callback(err);
						}else if (result.result.ok !== 1){
							callback(new Error("update executed not correctly : " + filePath));
						}else {
							callback(null);
						}
					});
				}
			})
		}

		exports.unlockFile = function(filePath, callback){
			var cacheCollection = db.collection(mongoConfg.file_locks_collection);

			cacheCollection.findOne({file_path : filePath}, function (err, result) {
				if (err){
					callback(err);
					return;
				}
				if (!result){
					callback(null);
				}else {
					cacheCollection.deleteOne({file_path : filePath}, function (err, result) {
						if (err){
							callback(err);
						}else if (result.result.ok !== 1){
							callback(new Error("delete executed not correctly : " + filePath));
						}else {
							callback(null);
						}
					});
				}
			})
		}


		function isFileLocked(filePath) {
			if (lockedFiles.hasOwnProperty(filePath)){
				var fileLock = lockedFiles[filePath];
				var fileLockDate = fileLock["date"];
				var diff = Date.now() - fileLockDate;
				console.log(diff);
				if (diff >= 15000){
					delete lockedFiles[filePath];
					return false;
				}
				return true;
			}
			return false;
		}
	});
}
