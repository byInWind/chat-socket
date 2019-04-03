var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
app.use(express.static('public'))

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});
var i = 0;
io.on('connection', function (socket) {
    i++;
    var name;
    socket.on('chat message', function (msg) {
        io.emit('chat message', msg);
    });

    socket.on('user name', function (info) {
        name = info.name;
        //进入时
        socket.broadcast.emit('chat message', {name: name, msg: name + "进入群聊", type: 1})

    });
    socket.on('is typing',function () {
        socket.broadcast.emit('is typing',{})
    })
    //离开时
    socket.on('disconnect', function () {
        socket.broadcast.emit('chat message', {name: name, msg: name + "离开群聊", type: 1})
    });
});

http.listen(3002, function () {
    console.log('listening on *:3002');
});
