var express = require('express');
var http = require('http');
var socketio = require('socket.io');
var mongojs = require('mongojs');
const { Socket } = require('dgram');

var ObjectID = mongojs.ObjectID;
var db = mongojs(process.env.MONGO_URL || 'mongodb://localhost:27017/local');
var app = express();
var server = http.Server(app);
var websocket = socketio(server);
server.listen(3000, () => console.log('listen on : ' = ':3000'));

var clients = {};
var users = {};

var chatId = 1;

websocket.on('connection', (socket) => {
    clients[socket.id] = socket;
    socket.on('userJoined', (userId) => onUserJoined(userId, socket));
    socket.on('message', (message) => onMessageRecieved(message, socket));
})

function onUserJoined(userId, socket) {
    try {
        if (!userId) {
            var user = db.collection('users').insert({}, (err, user) => {
                socket.emit('userJoined', userId);
                users[socket.id] = user._id;
                _sendExistingMessages(socket);
            });
        } else {
            users[socket.id] = userId;
            _sendExistingMessages(socket);
        }

    } catch (err) {
        console.err(err);
    }
}

function onMessageRecieved(message, senderSocket) {
    var userId = users[senderSocket.id];
    if (!userId) return;

    _sendAndSaveMessage(message, senderSocket);
}


function _sendExistingMessages(socket) {
    var messages = db.collection('messages')
        .find({ chatId })
        .sort({ createdAt: 1 })
        .toArray((err, messages) => {
            if (!messages.length) return;
            socket.emit('message', messages.reverse());
        })

}

function _sendAndSaveMessage(message, socket, fromServer) {
    var messageData = {
        text: message.text,
        user: message.user,
        createdAt: new Date(message.createdAt),
        chatId: chatId
    };

    db.collection('messages').insert(messageData, (err, message) => {
        var emmiter = fromServer ? websocket : socket.broadcast;
        emmiter.emit('message', [message]);

    })

    var stdin = process.openStdin();
    stdin.addListener('data', function(d) {
        _sendAndSaveMessage({
            text: d.toString().trim(),
            createdAt: new Date(),
            user: { _id: 'robot' }
        })
    }, null, true);
}