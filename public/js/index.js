/* 聊天室的主要功能 */

// 1.连接socketio服务
const socket = io();
let userID

// 选中头像功能
let avatars = document.querySelector('#login_avatar')
avatars = Array.from(avatars.children)
avatars.forEach(itme => {
  itme.onclick = function () {
    avatars.forEach(item => {
      item.classList.remove('now')
    })
    this.classList.add('now')
  }
})

let login = document.querySelector('#loginBtn')

// 发送图片功能
$('#file').on('change', function () {
  let file = this.files[0]
  // 需要把这个文件发送到服务器,借助于H5新增的fileReader
  var fr = new FileReader()
  // 读取选中的文件内容
  fr.readAsDataURL(file)
  // 读取成功 fr.result 保存有读取到的数据
  fr.onload = function () {
    socket.emit('userMessage', {
      id: userID,
      file: fr.result,
      type: 'image'
    })
  }
})

// 点击按钮登录
login.onclick = function () {
  // trim 去除两端空格
  let userName = document.querySelector('#username').value.trim()

  if (!userName) {
    alert('请输入用户名！');
    return
  }

  // 获取选择的头像的路径
  let avatarSrc = document.querySelector('#login_avatar li.now img').getAttribute('src')

  // 需要告诉我们的 socketIo 服务 我需要登陆
  socket.emit('login', {
    userName: userName, avatarSrc: avatarSrc
  })
}

// 登录状态
socket.on('loginState', result => {
  if (result.loginState) {
    // 登录成功
    alert(result.msg);
    userID = result.data.id
    // 隐藏登录窗口
    $(".login_box").hide()
    // 显示聊天窗口
    $('.container').show()
    $('#content').focus();
    // 显示当前用户的名称和头像
    $('#avatar-url').attr('src', result.data.avatarSrc)
    $('#loginUserName').text(result.data.userName)

    // 发送新消息
    sendMessage()

    // 监听是否有人发送消息
    newMessage()

    // 监听用户加入
    UserIn()

    // 监听用户离开
    UserOut()

    // 监听在线列表的变化
    updateUserList()
  } else {
    // 登录失败
    alert(result.msg);
  }
})

// 发送消息
function sendMessage() {
  // 按下 ctrl + enter 发送
  document.querySelector('#content').addEventListener('keydown', function (e) {
    if (e.ctrlKey) {
      e.target.onkeydown = function (e) {
        if (e.keyCode === 13) {
          document.querySelector('#btn-send').click()
          return false
        }
      }
    }
  })
  document.querySelector('#content').addEventListener('keyup', function (e) {
    e.target.onkeydown = null
  })

  $('#btn-send').on('click', () => {
    let result = document.querySelector('#content').innerText.trim()
    if (!result) return alert('请输入内容');
    $('#content').html('')
    $('#content').focus();

    // 发送事件，有人发消息了。
    socket.emit('userMessage', {
      message: result,
      id: userID,
      type: 'str'
    })
  })
}

// 有人加入聊天室
function UserIn() {
  socket.on('UserIn', data => {
    // 有新用户进来，添加一条系统消息
    $('.box-bd').append(`
      <div class="system">
        <p class="message_system">
          <span class="content">${data.userName}加入了群聊</span>
        </p>
      </div>
    `)
    scrollIntoEnd()
  })
}

// 有人离开聊天室
function UserOut() {
  socket.on('UserOut', data => {
    console.log(data);
    $('.box-bd').append(`
      <div class="system">
        <p class="message_system">
          <span class="content">${data}离开了群聊</span>
        </p>
      </div>
    `)
    scrollIntoEnd()
  })
}

// 检测到用户列表变化
function updateUserList() {
  socket.on('updateUserList', userList => {
    $('.user-list ul').html('') //先清空

    // 把最新用户列表渲染到左侧菜单
    userList.forEach(item => {
      $('.user-list ul').append(`
        <li class="user">
          <div class="avatar"><img src="${item.avatarSrc}" alt=""></div>
          <div class="name">${item.userName}</div>
        </li>
      `)
    })

    // 当前在线人数
    $('#userTotalNumber').html(userList.length)
  })
}

// 监听是否有人发送消息
function newMessage() {
  socket.on('NewMessage', data => {
    // 自己的消息
    if (data.id == userID) {
      $('.box-bd').append(`
        <div class="message-box">
          <div class="my message">
            <img src="${data.avatarSrc}" alt="" class="avatar">
            <div class="content">
              <div class="bubble">
                ${handleMessage(data)}
              </div>
            </div>
          </div>
        </div>
      `)
    } else {
      // 别人的消息
      $('.box-bd').append(`
        <div class="message-box">
          <div class="other message">
            <img src="${data.avatarSrc}" alt="" class="avatar">
            <div class="content">
              <div class="nickname">${data.userName}</div>
              <div class="bubble">
                ${handleMessage(data)}
              </div>
            </div>
          </div>
        </div>
      `)
    }
    // 如果有图片,等图片加载完成再滚动到可视区底部
    let lastImg = document.querySelectorAll('.box-bd img.user-message')
    lastImg = lastImg[lastImg.length - 1]

    if (lastImg) {
      lastImg.onload = function () {
        scrollIntoEnd()
      }
    }
    scrollIntoEnd()
  })
}

// 把聊天窗口滚动到可视区最底部
function scrollIntoEnd() {
  // 找到div里边的最后一个子元素
  // scrollIntoView 方法让当前的元素滚动到浏览器窗口的可视区域内。true顶部  false 底部
  $('.box-bd').children(':last').get(0).scrollIntoView(false)
}

// 处理普通消息与文字消息
function handleMessage(data) {
  // 文字消息
  if (data.type == 'str') {
    return `<div class="bubble_cont">${data.message}</div>`
  } else if (data.type == 'image') {
    return `<img class="user-message" style="max-width:300px;max-height:300px" src="${data.file}">`
  }

  return 'Error:暂不支持除文字和图片以外的数据'
}