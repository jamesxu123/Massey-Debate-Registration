/* globals localStorage */

import $       from 'jquery';
import Session from './Session';

module.exports = {
    getFields(callback) {
        Session.sendRequest('GET', '/api/fields', {}, (err, data) => {
            return callback(err, data)
        })
    },

    getStatistics(callback) {
        Session.sendRequest('GET', '/api/stats', {}, (err, data) => {
            return callback(err, data)
        })
    },

    getUsers(query, callback) {
        Session.sendRequest('GET', '/api/users', query, (err, data) => {
            return callback(err, data)
        })
    },

    getUser(id, callback) {
        Session.sendRequest('GET', '/api/user/' + id, {}, (err, data) => {
            return callback(err, data)
        })
    }
}