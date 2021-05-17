/*
  启动聊天的服务端程序
*/
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
// 用户信息
const userList = []


// express处理静态资源: 把puclic 目录设置为静态资源目录
app.use(require('express').static('public'))

app.get('/', (req, res) => {
  // 重定向到 public下的 index.html
  res.redirect('/index.html')
});

// 监听用户连接
io.on('connection', socket => {
  console.log('新用户连接了');

  // 登录
  socket.on('login', data => {
    // 判断用户名是否存在   some()方法用于检测数组中是否有满足条件的元素 返回布尔值
    let loginState = userList.some(item => item.userName === data.userName)

    // 登录成功
    if (!loginState) {
      data.id = Math.ceil(Math.random() * 10000)
      userList.push(data)
      socket.userName = data.userName
      socket.avatar = data.avatarSrc

      // 返回给客户端：登录成功
      socket.emit('loginState', { loginState: !loginState, msg: `登录成功！`, data: data })
      // 广播：给所有已经连接的用户广播(不包括自己)
      socket.broadcast.emit('UserIn', data);

      // 广播(包括自己)：更新数据列表
      updateUserList()

      // 监听是否接收到消息，并准备广播
      socket.on('userMessage', data => {
        let newMessage = userList.filter(item => item.id === data.id)
        if (newMessage) {
          newMessage[0].message = data.message
          newMessage[0].type = data.type
          newMessage[0].file = data.file
          // 广播接收到的消息(包括自己)
          io.emit('NewMessage', newMessage[0])
        }
      })

      // 监听是否接收到文件，并准备广播
      socket.on('sendFile',data =>{
        io.emit('NewMessage', data)
      })

    } else {
      // 登录失败  用户名重复
      socket.emit('loginState', { loginState: !loginState, msg: `登录失败,用户名已在线！` })
      return
    }
  })

  // 用户断开连接
  socket.on('disconnect', (reason) => {
    // 1.把当前用户从 userList 删除
    let result = userList.findIndex(item => item.userName === socket.userName)
    if (result !== -1) {
      // 删除断开连接的用户信息
      userList.splice(result, 1)
    }
    // 2.广播 有人离开了聊天室
    socket.broadcast.emit('UserOut', socket.userName);

    // 3.广播：更新后的数据列表
    updateUserList()
  });
});

server.listen(8080, () => {
  console.log('服务器启动成功: http://127.0.0.1:8080');
});

// 广播:更新后的用户列表(包括自己)
function updateUserList() {
  io.emit('updateUserList', userList)
}