const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require("body-parser")
const User = require('../../schemas/UserSchema');
const Post = require('../../schemas/PostSchema');
const Chat = require('../../schemas/ChatSchema');
const Message = require('../../schemas/MessageSchema');
const Notification = require('../../schemas/NotificationSchema');

app.use(bodyParser.urlencoded({ extended: false }));

//Mesajın veritabanına gönderilmesi:
router.post("/", async (req, res, next) => {
    //eğer içerik veya sohbet kimliği yoksa hata mesajı ve 400 hata kodu.
    if(!req.body.content || !req.body.chatId) {
        console.log("Geçersiz veriler isteğe iletildi");
        return res.sendStatus(400);
    }

    //eğer varsa yeni mesajı oluştur(gönderen, içerik ve sohbet verilerini çekerek)
    var newMessage = {
        sender: req.session.user._id,
        content: req.body.content,
        chat: req.body.chatId
    };

    // yeni mesaj oluşturma:
    Message.create(newMessage)
        .then(async message => {
            message = await message.populate("sender").execPopulate();
            message = await message.populate("chat").execPopulate();
            message = await User.populate(message, { path: "chat.users" });

            //sohbet kısmında en son atılan mesajı görmek için:
            var chat = await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message })
                .catch(error => console.log(error));

            insertNotifications(chat, message);

            res.status(201).send(message);
        })
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
})

//geken mesajların bildirimini görüntülemek için:
function insertNotifications(chat, message) {
    chat.users.forEach(userId => {
        if(userId == message.sender._id.toString()) return;

        Notification.insertNotification(userId, message.sender._id, "newMessage", message.chat._id);
    })
}

module.exports = router;
