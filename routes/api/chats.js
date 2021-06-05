const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require("body-parser")
const User = require('../../schemas/UserSchema');
const Post = require('../../schemas/PostSchema');
const Chat = require('../../schemas/ChatSchema');
const Message = require('../../schemas/MessageSchema');

app.use(bodyParser.urlencoded({ extended: false }));

// genel sohbet rotası:
router.post("/", async (req, res, next) => {
    if(!req.body.users) {
        console.log("Kullanıcı parametresi isteği gönderilmedi");
        return res.sendStatus(400);
    }

    var users = JSON.parse(req.body.users);

    // kullanıcı=0 ise arama çubugunda kullanıcı yok!
    if(users.length == 0) {
        console.log("Kullanıcı dizisi boş!");
        return res.sendStatus(400);
    }

    users.push(req.session.user);

    // eğer kullanıcı varsa grup sohbeti mi? ve kullanıcıları çek
    var chatData = {
        users: users,
        isGroupChat: true
    };

    // çekilen kullanıcılarla sohbet oluştur.
    Chat.create(chatData)
        .then(results => res.status(200).send(results))
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
})

// sohbetleri getirmek için
router.get("/", async (req, res, next) => {
    // sohbeti bul. elem ile nesne olup olmadığını kontrol et. eq ile o indexteki nesneyi seç.
    Chat.find({ users: { $elemMatch: { $eq: req.session.user._id } }})
        .populate("users")
        .populate("latestMessage")
        //sort: en son edilen sohbetin, sohbet listesinde en üstte görünmesi.
        .sort({ updatedAt: -1 })
        .then(async results => {

            //okunmamış mesajları çekmek için:
            if(req.query.unreadOnly !== undefined && req.query.unreadOnly == "true") {
                results = results.filter(r => r.latestMessage && !r.latestMessage.readBy.includes(req.session.user._id)) }

            results = await User.populate(results, { path: "latestMessage.sender" });
            res.status(200).send(results)
        })
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
})

// Sohbet kimliğine göre sohbet verilerini almak için: 
router.get("/:chatId", async (req, res, next) => {
    Chat.findOne({ _id: req.params.chatId, users: { $elemMatch: { $eq: req.session.user._id } }})
        .populate("users")
        .then(results => res.status(200).send(results))
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
})

// sohbete yazılan yeni ismin veri tabanında görülmesi için:
router.put("/:chatId", async (req, res, next) => {
    Chat.findByIdAndUpdate(req.params.chatId, req.body)
        .then(results => res.sendStatus(204))
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
})

//sohbet verilerini veri tabanına çekmek için:
router.get("/:chatId/messages", async (req, res, next) => {

    Message.find({ chat: req.params.chatId })
        .populate("sender")
        .then(results => res.status(200).send(results))
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
})

// mesaja tıklayınca bildiriminin bir azalması için:
router.put("/:chatId/messages/markAsRead", async (req, res, next) => {

    Message.updateMany({ chat: req.params.chatId }, { $addToSet: {readBy: req.session.user._id} })
        .populate("sender")
        .then(() => res.sendStatus(204))
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
})


router.put("/:id/addNewMember", (req, res, next) => { // ADD A NEW MEMBER
    Chat.findByIdAndUpdate(req.params.id, {$addToSet: {users: req.body}})
        .then(() => res.sendStatus(204))
        .catch(error => {
            console.log(error)
            res.status(400)
        })
})

router.put("/:id/leaveChat", (req, res, next) => { // LEAVE A CHAT
    Chat.findByIdAndUpdate(req.params.id, {$pull: {users: req.session.user._id}})
        .then(() => res.sendStatus(204))
        .catch(error => {
            console.log(error)
            res.status(400)
        })
})

module.exports = router;

