var _ = require('underscore');
var User = require('../models/User');
var Settings = require('../models/Settings');

var jwt       = require('jsonwebtoken');

var request = require('request');

var validator = require('validator');
var moment = require('moment');

var SettingsController = {};

SettingsController.getLog = function() {
    return Settings.getLog();
};

SettingsController.getPublicSettings = function(callback){
    Settings.getPublicSettings(callback);
};

SettingsController.getPrivateSettings = function(callback){
    Settings.getPrivateSettings(callback);
};

module.exports = SettingsController;