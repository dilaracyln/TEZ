const express = require('express');
const app = express();
const port = 3003;
const middleware = require('./middleware')
const path = require('path')
const bodyParser = require("body-parser")
const mongoose = require("./database");
const session = require("express-session");

//event yönetimi sayesinde sunucu ve istemci taraflı özel olaylar oluşturarak iletişim daha kolay yönetilmesi:
const server = app.listen(port, () => console.log("Server listening on port " + port));
const io = require("socket.io")(server, { pingTimeout: 60000 });

app.set("view engine", "pug");
app.set("views", "views");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// session kullanımını aktive etme
app.use(session({
    secret: "bbq chips",
    resave: true,
    saveUninitialized: false
}))

// Routes
const loginRoute = require('./routes/loginRoutes');
const registerRoute = require('./routes/registerRoutes');
const logoutRoute = require('./routes/logout');
const postRoute = require('./routes/postRoutes');
const profileRoute = require('./routes/profileRoutes');
const uploadRoute = require('./routes/uploadRoutes');
const searchRoute = require('./routes/searchRoutes');
const messagesRoute = require('./routes/messagesRoutes');
const notificationsRoute = require('./routes/notificationRoutes');

// Api routes
const postsApiRoute = require('./routes/api/posts');
const usersApiRoute = require('./routes/api/users');
const chatsApiRoute = require('./routes/api/chats');
const messagesApiRoute = require('./routes/api/messages');
const notificationsApiRoute = require('./routes/api/notifications');

app.use("/login", loginRoute);
app.use("/register", registerRoute);
app.use("/logout", logoutRoute);
app.use("/posts", middleware.requireLogin, postRoute);
app.use("/profile", middleware.requireLogin, profileRoute);
app.use("/uploads", uploadRoute);
app.use("/search", middleware.requireLogin, searchRoute);
app.use("/messages", middleware.requireLogin, messagesRoute);
app.use("/notifications", middleware.requireLogin, notificationsRoute);

app.use("/api/posts", postsApiRoute);
app.use("/api/users", usersApiRoute);
app.use("/api/chats", chatsApiRoute);
app.use("/api/messages", messagesApiRoute);
app.use("/api/notifications", notificationsApiRoute);

app.get("/", middleware.requireLogin, (req, res, next) => {

    var payload = {
        pageTitle: "Ana Sayfa",
        //Kullanıcı oturum açma bilgilerinin istemciye aktarılması:
        userLoggedIn: req.session.user,
        userLoggedInJs: JSON.stringify(req.session.user),
    }

    res.status(200).render("Home", payload);
})

io.on("connection", socket => {

    //kurulum kısmında kullanıcı id' sini al ve emit ile socket.io'yu bağlı döndür
    socket.on("setup", userData => {
        socket.join(userData._id);
        socket.emit("connected");
    })

    // sohbet odasına katılmak için:
    socket.on("join room", room => socket.join(room));
    // yazıyor.. kısmını eklemek için:
    socket.on("typing", room => socket.in(room).emit("typing"));
    // kullanıcının yazmayı bırakması durumunda:
    socket.on("stop typing", room => socket.in(room).emit("stop typing"));
    // bildirimlerin alınması durumunda:
    socket.on("notification received", room => socket.in(room).emit("notification received"));


    //yeni mesaj event'i tanımlamak için:
    socket.on("new message", newMessage => {
        var chat = newMessage.chat;

        if (!chat.users) return console.log("sohbet kişileri tanımlanamadı")

        chat.users.forEach(user => {

            //eğer kullanıcı id si yeni mesajı gönderenin id sine eşitse mesaj alındı.
            if(user._id == newMessage.sender._id) return;
            socket.in(user._id).emit("message received", newMessage);
        })
    });
})