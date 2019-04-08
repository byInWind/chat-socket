$(function () {
    var FADE_TIME = 150; // 淡入时间 ms
    var TYPING_TIMER_LENGTH = 400; // 键入计时器长度 ms
 
    // 初始化变量
    var $window = $(window);
    var $usernameInput = $('.usernameInput'); // Input for username
    var $messages = $('.messages'); // Messages area
    var $inputMessage = $('.inputMessage'); // Input message input box

    var $loginPage = $('.login.page'); // The login page
    var $chatPage = $('.chat.page'); // The chatroom page

    // 提示设置用户名
    var username;
    var connected = false;
    var typing = false;   //正在输入
    var lastTypingTime;
    var $currentInput = $usernameInput.focus();
    var timer; // 时间戳

    var socket = io();
    //添加参与者消息
    const addParticipantsMessage = (data) => {
        var message = '';
        message += "当前群聊人数为 " + data.numUsers;
        log(message);
    }

    // 设置用户名
    const setUsername = () => {
        username = cleanInput($usernameInput.val().trim());

        // If the username is valid
        if (username) {
            $loginPage.fadeOut();
            $chatPage.show();
            $loginPage.off('click');
            $currentInput = $inputMessage.focus();
console.log('add user 了')
            // Tell the server your username
            timer = new Date().getTime();
            socket.emit('add user',{'username': username, timer: timer});
            console.log('add user 了')
        }
    }

    // 发送消息
    const sendMessage = () => {
        console.log(4)
        var message = $inputMessage.val();
        //防止将标记注入消息中
        message = cleanInput(message);
        //如果有非空消息和套接字连接
        console.log(999,message,connected)
        if (message && connected) {
            console.log(5)
            $inputMessage.val('');
            addChatMessage({
                username: username,
                message: message
            });

            //告诉服务器执行“new message”并发送一个参数
            socket.emit('new message', message);
        }
    }

    // Log a message
    const log = (message, options) => {
        var $el = $('<p>').addClass('log').text(message);
        addMessageElement($el, options);
    }

    // 将聊天消息和记录添加到消息列表
    const addChatMessage = (data, options) => {
        // 如果有“xxx正在输入”，不要插入消息
        var $typingMessages = getTypingMessages(data);
        options = options || {};
        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }
        console.log(6)
        /*以登录用户名与data返回的用户名相同做判断，这里存在注册昵称相同触发的问题
         改 发送的消息里加上是否是自己的变量 _self，值为true false */
        if (timer === data.timer) {
            console.log(7)
            // 自己的消息
            var $usernameDivSelf =
                $('<div class="list-right"/>').html('<div class="user">' + data.username + '</div>' +
                    ' <p class="word_warp session right_self">' + data.message + '</p>');

            addMessageElement($usernameDivSelf, options);
        } else {
            // 其它人的消息
            var $usernameDivOther =
                $('<div class="list"/>').html('<div class="user">' + data.username + '</div>' +
                    ' <p class="word_warp session">' + data.message + '</p>');

            var typingClass = data.typing ? 'typing' : '';
            var $messageDiv = $('<div class="list"/>')
                .data('username', data.username)
                .addClass(typingClass)
                .append($usernameDivOther);
            addMessageElement($messageDiv, options);
        }
    }

    // 添加正在输入消息
    const addChatTyping = (data) => {
        data.typing = true;
        data.message = 'is typing';
        addChatMessage(data);
    }

    // 删除正在输入消息
    const removeChatTyping = (data) => {
        getTypingMessages(data).fadeOut(function () {
            $(this).remove();
        });
    }

    // 向消息添加消息列表并滚动到底部
    // el - 作为消息添加的元素
    // options.fade - If the element should fade-in (default = true)
    // options.prepend - If the element should prepend
    //   all other messages (default = false)
    const addMessageElement = (el, options) => {
        var $el = $(el);

        // 设置默认选项
        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }

        // 应用选项
        if (options.fade) {
            //闪烁一次
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            //消息列表顶部插入消息   仅登录时插入
            $messages.prepend($el);
        } else {
            $messages.append($el);
        }
        $messages[0].scrollTop = $messages[0].scrollHeight;
    }

    // 转码<>等符号
    const cleanInput = (input) => {
        var htmlEncode = $('<div/>').text(input).html();
        return $('<div/>').html(htmlEncode).text();
    }

    // 更新正在输入事件
    const updateTyping = () => {
        if (connected) {
            if (!typing) {
                typing = true;  //节流，如果连续输入间隔小于400ms,不再重复发送事件
                socket.emit('typing');
            }
            //如果连续输入间隔大于400ms并且typing = true，发送'stop typing'
            lastTypingTime = (new Date()).getTime();
            setTimeout(() => {
                var typingTimer = (new Date()).getTime();
                var timeDiff = typingTimer - lastTypingTime;  //时间差
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    socket.emit('stop typing');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    }

    // 获取用户的“x正在键入”消息
    const getTypingMessages = (data) => {
        return $('.list.typing').filter(function (i) {
            return $(this).data('username') === data.username;
        });
    }

    // Keyboard events

    $window.keydown(event => {
        // Auto-focus the current input when a key is typed
        if (!(event.ctrlKey || event.metaKey || event.altKey)) {
            $currentInput.focus();
        }
        //点击 Enter键时
        if (event.which === 13) {
            console.log(1)
            if (username) {
                console.log(2,username)
                sendMessage();
                socket.emit('stop typing');
                typing = false;
            } else {
                console.log(3)
                setUsername();
            }
        }
    });

    $inputMessage.on('input', () => {
        updateTyping();
    });

    // Click events

    // 在登录页面上单击任意位置时聚焦
    $loginPage.click(() => {
        $currentInput.focus();
    });

    // Socket events

    // 每当服务器 emits'login'时，记录登录消息
    socket.on('login', (data) => {
        console.log('login ssss')
        connected = true;
        timer = data.timer;
        addParticipantsMessage(data);
    });

    // Whenever the server emits 'new message', update the chat body
    socket.on('new message', (data) => {
        console.log('new message new message')
        addChatMessage(data);
    });

    // Whenever the server emits 'user joined', 记录它 in the chat body
    socket.on('user joined', (data) => {
        log(data.username + ' 进入群聊');
        addParticipantsMessage(data);
    });

    // Whenever the server emits 'user leave', log it in the chat body
    socket.on('user leave', (data) => {
        log(data.username + ' 离开了');
        addParticipantsMessage(data);
        removeChatTyping(data);
    });

    // Whenever the server emits 'typing', show the typing message
    socket.on('typing', (data) => {
        addChatTyping(data);
    });

    // Whenever the server emits 'stop typing', kill the typing message
    socket.on('stop typing', (data) => {
        removeChatTyping(data);
    });

    socket.on('disconnect', () => {
        log('您已离开聊天');
    });

    socket.on('reconnect', () => {
        log('您已重新连接成功');
        if (username) {
            socket.emit('add user',{'username': username});
        }
    });

    socket.on('reconnect_error', () => {
        log('尝试重新连接失败');
    });

})
