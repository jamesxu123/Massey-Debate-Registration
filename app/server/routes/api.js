var jwt                = require('jsonwebtoken');
var validator          = require('validator');
var express            = require('express');

var User               = require('../models/User');
var Logs               = require('../models/Logs');
var UserController     = require('../controllers/UserController');
var SettingsController = require('../controllers/SettingsController');

var permissions        = require('../services/permissions');
var logger             = require('../services/logger');

require('dotenv').config({path: '../../../.env'});

JWT_SECRET             = process.env.JWT_SECRET;

module.exports = function(router) {
    router.use(express.json());

    // Developer
    // View system log
    router.post('/log', permissions.isDeveloper, function (req, res) {
        Logs.getLog(logger.defaultResponse(req, res));
    });

    /*
    // Developer
    // Inject votes accept
    router.post('/injectVoteAdmit', permissions.isDeveloper, function (req, res) {

        if (req.userExecutedminUser) {
            if (err) {
                logger.defaultResponse(req, r;es)(err)
            }
        }


        var userID = req.body.userID;
     rController.injectAdmitUser(admiUserl, userID, logger.defaultResponse(req, res));
    })
    });

    // Developer
    // Inject votes reject
    router.post('/injectVoteReject', permissions.isDeveloper, function (req, res) {
        // Accept the hacker. Admin only

        i
            if (err) {
                log

        var userID = req.body.userID;
        UserController.injectRejectUsUserminEmail, userID, logger.defaultResponse(req, res));

    });*/

    // Developer
    // Reset votes
    router.post('/voteReset', permissions.isDeveloper, function (req, res) {
        var userID = req.body.userID;
        UserController.resetVotes(req.userExecute, userID, logger.defaultResponse(req, res));
    });

    // Owner
    // Force accept
    router.post('/forceAccept', permissions.isOwner, function (req, res) {
        var userID = req.body.userID;
        UserController.admitUser(req.userExecute, userID, logger.defaultResponse(req, res));
    });

    // Owner
    // Force reject
    router.post('/forceReject', permissions.isOwner, function (req, res) {
        var userID = req.body.userID;
        UserController.rejectUser(req.userExecute, userID, logger.defaultResponse(req, res));
    });

    // Owner
    // Reset admission state
    router.post('/resetAdmissionState', permissions.isOwner, function (req, res) {
        var userID = req.body.userID;
        UserController.resetAdmissionState(req.userExecute, userID, logger.defaultResponse(req, res));
    });

    // Owner
    // Flush email queue for user
    router.post('/flushEmailQueue', permissions.isOwner, function (req, res) {
        var userID = req.body.userID;
       UserController.flushEmailQueue(req.userExecute, userID, logger.defaultResponse(req, res));
    });

    // Owner
    // Delete user
    router.post('/deleteUser', permissions.isOwner, function (req, res) {
        var userID = req.body.userID;
        UserController.remove(req.userExecute, userID, logger.defaultResponse(req, res));
    });

    // General
    // Send slack invite
    router.post('/slack', permissions.isVerified, function(req, res){
        var user = req.user;

        UserController.inviteToSlack(user._id, function(err, data){
            if (err) {
                return logger.defaultResponse(req, res)(err);
            }

            return logger.defaultResponse(req, res)(null, data);
        });
    });

    // General
    // Send join team
    router.post('/joinTeam', permissions.isVerified, function(req, res){
        var user = req.user;
        var teamCode = req.body.teamCode;

        UserController.joinTeam(user._id, teamCode, function(err, data){
            if (err) {
                return logger.defaultResponse(req, res)(err);
            }

            return logger.defaultResponse(req, res)(null, data);
        });
    });


    // General
    // Change password
    router.post('/changePassword', permissions.isVerified, function (req, res) {
        var token = permissions.getToken(req);
        var newPassword = req.body.newPassword;
        var oldPassword = req.body.oldPassword;

        UserController.selfChangePassword(token, oldPassword, newPassword, logger.defaultResponse(req, res));
    });


    // Change password
    router.post('/adminChangePassword', permissions.isOwner, function (req, res) {
        var userID = req.body.userID;
        var password = req.body.password;
        UserController.adminChangePassword(req.userExecute, userID, password, logger.defaultResponse(req, res));
    });


    // Owner
    // Send admit emails
    router.post('/sendAcceptanceEmails', permissions.isOwner, function (req, res) {

    });

    // Owner
    // Send reject emails
    router.post('/sendRejectionEmails', permissions.isOwner, function (req, res) {

    });

    // Owner
    // Send reminder emails
    router.post('/sendReminderEmails', permissions.isOwner, function (req, res) {

    });

    // Owner
    // Reject everyone without status
    router.post('/rejectNoStates', permissions.isOwner, function (req, res) {
        User.find({
            'permission.level': 1,
            'status.admitted': false,
            'status.rejected': false,
            'status.waitlisted' : false
        }, function(err, users) {
            console.log(users);

            logger.logAction(req.userExecute.email, user.email, "Changed this user's password.");
            /**
             * To-Do: Add async for each here
             */
        });
    });

    // Owner
    // Activate account
    router.post('/activateAccount', permissions.isOwner, function (req, res) {
        var userID = req.body.userID;
        UserController.activate(req.userExecute, userID, logger.defaultResponse(req, res));
    });

    // Owner
    // Deactivate account
    router.post('/deactivateAccount', permissions.isOwner, function (req, res) {
        var userID = req.body.userID;
        UserController.deactivate(req.userExecute, userID, logger.defaultResponse(req, res));
    });

    // Reviewer
    // Votes admit
    router.post('/voteAdmit', permissions.isReviewer, function (req, res) {
        var userID = req.body.userID;
        UserController.voteAdmitUser(req.userExecute, userID, logger.defaultResponse(req, res));
    });

    // Reviewer
    // Votes reject
    router.post('/voteReject', permissions.isReviewer, function (req, res) {
        var userID = req.body.userID;
        UserController.voteRejectUser(req.userExecute, userID, logger.defaultResponse(req, res));
    });

    // Checkin
    // Checkin user
    router.post('/checkIn', permissions.isCheckin, function (req, res) {
        var userID = req.body.userID;
        UserController.checkIn(req.userExecute, userID, logger.defaultResponse(req, res));
    });

    // Checkin
    // Checkout user
    router.post('/checkOut', permissions.isCheckin, function (req, res) {
        var userID = req.body.userID;
        UserController.checkOut(req.userExecute, userID, logger.defaultResponse(req, res));
    });

    // Checkin
    // Waiver in
    router.post('/waiverIn', permissions.isCheckin, function (req, res) {
        var userID = req.body.userID;
        UserController.waiverIn(req.userExecute, userID, logger.defaultResponse(req, res));
    });

    // Checkin
    // Waiver out
    router.post('/waiverOut', permissions.isCheckin, function (req, res) {
        var userID = req.body.userID;
        UserController.waiverOut(req.userExecute, userID, logger.defaultResponse(req, res));
    });

    router.get('/', function (req, res) {
        res.json({'error' : 'lol what are you doing here?'});
    });
};