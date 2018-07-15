var _              = require('underscore');
var User           = require('../models/User');
var Settings       = require('../models/Settings');

var jwt            = require('jsonwebtoken');

var request        = require('request');

var validator      = require('validator');
var moment         = require('moment');
var logger         = require('../services/logger');

var mailer         = require('../services/email');

var UserController = {};

UserController.verify = function (token, callback) {

    if (!token) {
        return callback({error : 'Error: Invalid token'});
    }

    jwt.verify(token, JWT_SECRET, function (err, payload) {
        if (err || !payload) {
            console.log('ur bad');
            return callback(err);
        }

        if (payload.type != 'verification' || !payload.exp || Date.now() >= payload.exp * 1000) {
            return callback({
                error: "Error: Token is invalid for this operation."
            });
        }

        User.findOneAndUpdate({
            _id: payload.id
        },
        {
            $set: {
                'permissions.verified': true
            }
        },
        {
            new: true
        }, function (err, usr) {
            if (err || !usr) {
                console.log(err);

                return callback(err);
            };

            logger.logAction(usr.email, usr.email, "Verified their email.");

            return callback(null, 'Success');
        });

    }.bind(this));
};

UserController.sendVerificationEmail = function (token, callback) {
    User.getByToken(token, function(err, user){
        if (!user || err) {
            return callback(err, null);
        }

        if (!user.status.active) {
            return callback({ error: "Account is not active. Please contact an administrator for assistance." })
        }

        var verificationToken = user.generateVerificationToken();

        console.log(verificationToken)

        // Mailer

        return callback(null, {message:"Success"});
    });

};

UserController.selfChangePassword = function (token, existingPassword, newPassword, callback) {
    User.getByToken(token, function (err, user) {
        if (err || !user) {
            if (err) {
                return callback(err);
            }

            return callback({ error: "Error: Something went wrong." });
        }

        UserController.loginWithPassword(user.email, existingPassword, function(err, usr) {
            if (err || !usr) {
                if (err) {
                    return callback(err);
                }

                return callback({ error: "Error: Something went wrong." });
            }

            UserController.changePassword(user.email, newPassword, function(err, msg) {
                if (err) {
                    return callback(err);
                }
                logger.logAction(user.email, user.email, "Changed their password with existing.");
                return callback(null, { message: "Success" });
            });
        });
    });
};

UserController.adminChangePassword = function (adminID, userID, newPassword, callback) {
    User.getByID(userID, function (err, usr) {
        if (err || !usr) {
            return callback({ error: "Error: User not found." });
        }

        UserController.changePassword(usr.email, newPassword, function(err, msg) {
            if (err || !msg) {
                return callback(err);
            }
            logger.logAction(User.getEmailFromID(adminID), usr.email, "Changed this user's password.");
            return callback(null, msg);
        });
    });
};

UserController.changePassword = function (email, password, callback) {

    if (!password || password.length < 6){
        return callback({ error: "Error: Password must be 6 or more characters." });
    }

    User.findOneAndUpdate({
        email : email
    }, {
            $set : {
                'status.passwordSuspension': false,
                passwordLastUpdated: Date.now(),
                password: User.generateHash(password)
            }
    }, {
        new: true
    }, function (err, user) {

        if (err || !user) {
            return callback(err);
        }

        // Mail password reset email

        return callback(null, { message: "Success" })

    });
};

UserController.resetPassword = function (token, password, callback) {

    if (!token || !password) {
        return callback({error : "Error: Invalid arguments"});
    }

    jwt.verify(token, JWT_SECRET, function (err, payload) {
        if (err || !payload) {
            console.log("ur bad");
            return callback(err);
        }

        if (payload.type != "password-reset" || !payload.exp || Date.now() >= payload.exp * 1000) {
            return callback({
                error: "Error: Token is invalid for this operation."
            });
        }

        User.findOne({
                _id: payload.id
            }, function (err, user) {
                if (err) {
                    console.log(err);

                    return callback({error : "Error: User not found"});
                };

                UserController.changePassword(user.email, password, function(err) {
                    if (err) {
                        return callback(err);
                    }

                    logger.logAction(user.email, user.email, "Changed their password with token.");
                    return callback(null, {message : "Success"});
                });
            });

    }.bind(this));
};


UserController.sendPasswordResetEmail = function (email, callback) {
    User.getByEmail(email, function(err, user){

        if (user && !err) {
            var resetToken = user.generateResetToken();

            console.log(resetToken);

            // Mailer

            /*
            mailer.sendBoringEmail(email,"token",resetToken, function(error){
                if(error){
                    return callback(true, {message:"Error"});
                }else{
                    return callback(null, {message:"Success"});
                }
            });*/
        }

        return callback();
        //return callback(true, {message:"Error"});
    });


};

UserController.createUser = function (email, firstName, lastName, password, callback) {

    if (email.includes("2009karlzhu")) {
        return callback({error: "Karl Zhu detected. Please contact an administrator for assistance."}, false);
    }

    if (!Settings.registrationOpen()) {
        return callback({
            error: "Sorry, registration is not open."
        });
    }

    if (!validator.isEmail(email)){
        return callback({
            error: "Error: Invalid Email Format"
        });
    }

    if (email.includes('"') || firstName.includes('"') || lastName.includes('"')) {
        return callback({
            error: "Error: Invalid Characters"
        });
    }

    if (!password || password.length < 6){
        return callback({ error: "Error: Password must be 6 or more characters."}, false);
    }

    // Special stuff
    if (password == "Password123" && firstName == "Adam") {
        return callback({ error: "Error: Hi adam, u have a bad passwd"}, false);
    }

    if (firstName.length > 50 || lastName.length > 50) {
        return callback({ error: "Error: Name is too long!"});
    }

    if (email.length > 50) {
        return callback({ error: "Error: Email is too long!"});
    }

    email = email.toLowerCase();

    User.getByEmail(email, function (err, user) {

        if (user) {
            return callback({
                error: 'Error: An account for this email already exists.'
            });
        } else {

            var name = firstName + " " + lastName;

            var u = new User();
            u.email = email;
            u.firstName = firstName;
            u.lastName = lastName;
            u.fullName = name;
            u.lowerCaseName = name.toLowerCase();
            u.password = User.generateHash(password);

            u.save(function (err) {
                if (err) {
                    console.log(err);
                    return callback(err);
                } else {
                    var token = u.generateAuthToken();

                    /**
                     * To-Do: Send verification email here
                     */

                    u = u.toJSON();
                    delete u.password;

                    logger.logAction(u.email, u.email, "Created an account.");

                    return callback(null, token, u);
                }
            });

        }
    });
};

UserController.loginWithToken = function(token, callback){
    User.getByToken(token, function(err, user){
        if (!user || err) {
            return callback(err, null, null);
        }

        if (!user.status.active) {
            return callback({ error: "Account is not active. Please contact an administrator for assistance." })
        }

        var token = user.generateAuthToken();

        logger.logAction(user.email, user.email, "Logged in with token.");

        return callback(err, token, user);
    });
};

UserController.loginWithPassword = function(email, password, callback){
    if (!email || email.length === 0) {
        return callback({
            error: "Error: Please enter your email"
        });
    }

    if (!password || password.length === 0){
        return callback({
            error: "Error: Please enter your password"
        });
    }

    User
        .findOne({email : email.toLowerCase()})
        .select('+password')
        .exec(function (err, user) {

            console.log(user);

            if (err || !user || user == null || !user.checkPassword(password)) {
                return callback({
                    error: "Error: Invalid credentials"
                });
            }

            if (user.status.passwordSuspension) {
                return callback({ error: "Security policy requires you to reset your password to activate your account. Please check your email or press the button below." })
            }

            if (!user.status.active) {
                return callback({ error: "Account is not active. Please contact an administrator for assistance." })
            }

            logger.logAction(user.email, user.email, "Logged in with password.");

            var token = user.generateAuthToken();

            return callback(null, token, user);
        });
};

/*
UserController.injectAdmitUser = function(adminID, userID, callback) {
    User.findOneAndUpdate({
       _id : userID,
        'permissions.verified': true,
        'status.rejected': false,
        'status.accepted': false
    }, {
        $push: {
            'applicationAdmit': User.getEmailFromID(adminID),
            'votedBy': User.getEmailFromID(adminID)
        },
        $inc : {
            'numVotes': 1
        }
    }, {
        new: true
    }, function(err, user) {

        if (err || !user) {
            if (err) {
                return callback(err);
            }
            return callback({ error: "Error: Unable to perform action." })
        }

        logger.logAction(User.getEmailFromID(adminID), userID.email, "Injected admit vote.");

        return callback(err, user);

    });
};

UserController.injectRejectUser = function(adminID, userID, callback) {
    User.findOneAndUpdate({
       _id : userID,
        'permissions.verified': true,
        'status.rejected': false,
        'status.accepted': false
    }, {
        $push: {
            'applicationReject': User.getEmailFromID(adminID),
            'votedBy': User.getEmailFromID(adminID)
        },
        $inc : {
            'numVotes': 1
        }
    }, {
        new: true
    }, function(err, user) {

        if (err || !user) {
            if (err) {
                return callback(err);
            }
            return callback({ error: "Error: Unable to perform action." })
        }

        logger.logAction(User.getEmailFromID(adminID), userID.email, "Injected reject vote.");

        return callback(err, user);

    });
};*/

UserController.voteAdmitUser = function(adminID, userID, callback) {
    User.findOneAndUpdate({
       _id : userID,
        'permissions.verified': true,
        'status.rejected': false,
        'status.accepted': false,
        'applicationAdmit' : {$nin : [adminUser.email]},
        'applicationReject' : {$nin : [adminUser.email]}
    }, {
        $push: {
            'applicationAdmit': User.getEmailFromID(adminID),
            'votedBy': User.getEmailFromID(adminID)
        },
        $inc : {
            'numVotes': 1
        }
    }, {
        new: true
    }, function(err, user) {

        if (err || !user) {
            if (err) {
                return callback(err);
            }
            return callback({ error: "Error: Unable to perform action." })
        }

        logger.logAction(User.getEmailFromID(adminID), userID.email, "Voted to admit.");

        UserController.checkAdmissionStatus(userID);

        return callback(err, user);

    });
};

UserController.voteRejectUser = function(adminID, userID, callback) {
    User.findOneAndUpdate({
       _id : userID,
        'permissions.verified': true,
        'status.rejected': false,
        'status.accepted': false,
        'applicationAdmit' : {$nin : [adminUser.email]},
        'applicationReject' : {$nin : [adminUser.email]}
    }, {
        $push: {
            'applicationReject': User.getEmailFromID(adminID),
            'votedBy': User.getEmailFromID(adminID)
        },
        $inc : {
            'numVotes': 1
        }
    }, {
        new: true
    }, function(err, user) {

        if (err || !user) {
            if (err) {
                return callback(err);
            }
            return callback({ error: "Error: Unable to perform action." })
        }

        logger.logAction(User.getEmailFromID(adminID), userID.email, "Voted to reject.");

        UserController.checkAdmissionStatus(userID);

        return callback(err, user);

    });
};

UserController.checkAdmissionStatus = function(id) {
    User.getByID(id, function (err, user) {
        if (err || !user) {
            if (err) {
                console.log(err);
            }

            console.log("Error checking admission status for " + id);
        } else {

            if (!user.status.admitted && !user.status.rejected && !user.status.waitlisted) {
                if (user.applicationReject.length >= 3) {
                    user.status.admitted = false;
                    user.status.rejected = true;
                    console.log("Rejected user");

                    logger.logAction(-1, userID.email, "Soft rejected user.");

                } else {
                    console.log(user);
                    console.log(user.votedBy);
                    if (user.applicationAdmit.length >= 3) {
                        if (data < total) {
                            user.status.admitted = true;
                            user.status.rejected = false;
                            user.status.admittedBy = "MasseyHacks Admission Authority";
                            console.log("Admitted user");

                            logger.logAction(-1, userID.email, "Accepted user.");
                        } else {
                            user.status.waitlisted = true;
                            user.status.rejected = false;
                            console.log("Waitlisted User");

                            logger.logAction(-1, userID.email, "Waitlisted user.");
                        }
                    }
                }

                User.findOneAndUpdate({
                        '_id': id,
                        'verified': true,
                        'status.rejected': false,
                        'status.admitted': false,
                    },
                    {
                        $set: {
                            'status': user.status
                        }
                    },
                    {
                        new: true
                    },
                    function (err, user) {
                        return callback(err, user);
                    });
            }
        }
    });

};

UserController.resetVotes = function(adminID, userID, callback) {
    User.findOneAndUpdate({
        _id : userID,
        'permissions.verified': true,
        'status.rejected': false,
        'status.accepted': false
    }, {
        $set: {
            'applicationReject': [],
            'votedBy': [],
            'numVotes': 0
        }
    }, {
        new: true
    }, function(err, user) {

        if (err || !user) {
            if (err) {
                return callback(err);
            }
            return callback({ error: "Error: Unable to perform action." })
        }

        logger.logAction(User.getEmailFromID(adminID), user.email, "Reset votes.");

        return callback(err, user);

    });
};

UserController.resetAdmissionState = function(adminID, userID, callback) {
    User.findOneAndUpdate({
       _id : userID,
        'permissions.verified': true
    }, {
        $set: {
            'status.admitted': false,
            'status.rejected': false,
            'status.waitlisted': false,
            'statusReleased': false
        }
    }, {
        new: true
    }, function(err, user) {

        if (err || !user) {
            if (err) {
                return callback(err);
            }
            return callback({ error: "Error: Unable to perform action." })
        }

        logger.logAction(User.getEmailFromID(adminID), userID.email, "Reset admission status.");

        return callback(err, user);

    });
};

UserController.admitUser = function(adminID, userID, callback) {
    /**
     * To-Do: Add to email queue
     */

    User.findOneAndUpdate({
       _id : userID,
        'permissions.verified': true,
        'status.rejected': false,
        'status.accepted': false
    }, {
        $set: {
            'status.admitted': true,
            'status.rejected': false,
            'status.waitlisted': false,
            'statusReleased': false,
            'status.admittedBy': User.getEmailFromID(adminID),
            'status.confirmBy': Date.now() + 604800000
        }
    }, {
        new: true
    }, function(err, user) {

        if (err || !user) {
            if (err) {
                return callback(err);
            }
            return callback({ error: "Error: Unable to perform action." })
        }

        logger.logAction(User.getEmailFromID(adminID), userID.email, "Admitted user.");

        return callback(err, user);

    });
};

UserController.rejectUser = function(adminID, userID, callback) {
    /**
     * To-Do: Add to email queue
     */

    User.findOneAndUpdate({
       _id : userID,
        'permissions.verified': true,
        'status.rejected': false,
        'status.accepted': false
    }, {
        $set: {
            'status.admitted': false,
            'status.rejected': true,
            'status.waitlisted': false,
            'statusReleased': false
        }
    }, {
        new: true
    }, function(err, user) {

        if (err || !user) {
            if (err) {
                return callback(err);
            }
            return callback({ error: "Error: Unable to perform action." })
        }

        logger.logAction(User.getEmailFromID(adminID), userID.email, "Rejected user.");

        return callback(err, user);

    });
};

UserController.remove = function(adminID, userID, callback){

    User.findOne({_id: userID}, function (err, user) {
        if (!err && user != null) {
            logger.logAction(User.getEmailFromID(adminID), user.email, "Deleted user.");
        } else {
            return callback({error : "Error: Unable to delete user"})
        }
    });

    User.findOneAndRemove({
        _id: userID
    }, function (err) {
        if (err) {
            return callback({error : "Error: Unable to delete user"})
        }

        return callback({message : "Success"})
    });
};

UserController.inviteToSlack = function(id, callback) {
    User.getByID(id, function(err, user) {

        if (err || !user) {
            if (err) {
                return callback(err);
            }

            return callback( { error : "Error: User not found" } );
        }

        if (user.status.confirmed && user.status.admitted && user.status.statusReleased && !user.status.declined) {

            logger.logAction(user.email, user.email, "Requested Slack invite.");

            request.post({
                url: 'https://' + process.env.SLACK_INVITE + '.slack.com/api/users.admin.invite',
                form: {
                    email: user.email,
                    token: process.env.SLACK_INVITE_TOKEN,
                    set_active: true
                }
            }, function (err, httpResponse, body) {
                console.log(err, httpResponse, body);
                if (err || body !== '{"ok":true}') {

                    if (body && body.includes('already_in_team')) {
                        return callback({ error : 'You have already joined the Slack!\n(' + process.env.SLACK_INVITE + '.slack.com)' });
                    }
                    else if (body && body.includes('already_invited')) {
                        return callback({ error : 'We already sent an invitation!\nBe sure to check your spam in case it was filtered :\'(\n\n(We sent it to ' + user.email + ')' });
                    }
                    else {
                        return callback({ error : "Error: Something went wrong...\nThat's all we know :/" });
                    }
                }
                else {
                    return callback(null, { message : 'Success'});
                }
            });
        }
        else {
            return callback({ error : "Error: You do not have permission to send an invitation." });
        }
    });
};

UserController.flushEmailQueue = function(adminID, userID, callback) {
    // Do stuff here
};

UserController.activate = function(adminID, userID, callback) {
    User.findOneAndUpdate({
        _id : user
    }, {
        $set: {
            'status.active': true
        }
    }, {
        new: true
    }, function(err, user) {

        if (err || !user) {
            if (err) {
                return callback(err);
            }
            return callback({ error: "Error: Unable to perform action." })
        }

        logger.logAction(User.getEmailFromID(adminID), userID.email, "Activated user.");

        return callback(err, user);
    });
};

UserController.deactivate = function(adminID, userID, callback) {
    User.findOneAndUpdate({
        _id : user
    }, {
        $set: {
            'status.active': false
        }
    }, {
        new: true
    }, function(err, user) {

        if (err || !user) {
            if (err) {
                return callback(err);
            }
            return callback({ error: "Error: Unable to perform action." })
        }

        logger.logAction(User.getEmailFromID(adminID), userID.email, "Deactivated user.");

        return callback(err, user);
    });
};

UserController.checkIn = function(adminID, userID, callback) {
    User.findOneAndUpdate({
        _id : user
    }, {
        $set: {
            'status.checkedIn': true,
            'checkInTime' : Date.now()
        }
    }, {
        new: true
    }, function(err, user) {

        if (err || !user) {
            if (err) {
                return callback(err);
            }
            return callback({ error: "Error: Unable to perform action." })
        }

        logger.logAction(User.getEmailFromID(adminID), userID.email, "Checked In user.");

        return callback(err, user);
    });
};

UserController.checkOut = function(adminID, userID, callback) {
    User.findOneAndUpdate({
        _id : user
    }, {
        $set: {
            'status.checkedIn': false
        }
    }, {
        new: true
    }, function(err, user) {

        if (err || !user) {
            if (err) {
                return callback(err);
            }
            return callback({ error: "Error: Unable to perform action." })
        }

        logger.logAction(User.getEmailFromID(adminID), userID.email, "Checked Out user.");

        return callback(err, user);
    });
};

UserController.waiverIn = function(adminID, userID, callback) {
    User.findOneAndUpdate({
        _id : user
    }, {
        $set: {
            'status.waiver': true,
        }
    }, {
        new: true
    }, function(err, user) {

        if (err || !user) {
            if (err) {
                return callback(err);
            }
            return callback({ error: "Error: Unable to perform action." })
        }

        logger.logAction(User.getEmailFromID(adminID), userID.email, "Waiver flagged as on file for user.");

        return callback(err, user);
    });
};

UserController.waiverOut = function(adminID, userID, callback) {
    User.findOneAndUpdate({
        _id : user
    }, {
        $set: {
            'status.waiver': false
        }
    }, {
        new: true
    }, function(err, user) {

        if (err || !user) {
            if (err) {
                return callback(err);
            }
            return callback({ error: "Error: Unable to perform action." })
        }

        logger.logAction(User.getEmailFromID(adminID), userID.email, "Waiver flagged as not on file for user.");

        return callback(err, user);
    });
};

module.exports = UserController;