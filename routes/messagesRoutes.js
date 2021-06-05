const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require("body-parser")
const bcrypt = require("bcrypt");
const mongoose = require('mongoose');
const User = require('../schemas/UserSchema');
const Chat = require('../schemas/ChatSchema');

// genel mesaj sayfası için:
router.get("/", (req, res, next) => {
    res.status(200).render("inboxPage", {
        pageTitle: "Gelen Kutusu",
        userLoggedIn: req.session.user,
        userLoggedInJs: JSON.stringify(req.session.user),
    });
})

// yeni mesaj oluşturma kısmı için:
router.get("/new", (req, res, next) => {
    res.status(200).render("newMessage", {
        pageTitle: "Yeni Mesaj",
        userLoggedIn: req.session.user,
        userLoggedInJs: JSON.stringify(req.session.user),
    });
})

//grup sohbetine tıklayınca gidilen sohbet sayfası için:
router.get("/:chatId", async (req, res, next) => {

    var userId = req.session.user._id;
    var chatId = req.params.chatId;
    // sohbet kimliği geçerli mi?
    var isValidId = mongoose.isValidObjectId(chatId);


    // sohbet isimli sayfayı oluşturmak için:
    var payload = {
        pageTitle: "Sohbet",
        userLoggedIn: req.session.user,
        userLoggedInJs: JSON.stringify(req.session.user)
    };

    // sohbet kimliği geçersiz ise:
    if (!isValidId) {
        payload.errorMessage = "sohbet mevcut değil veya onu görüntüleme izniniz yok.";
        return res.status(200).render("chatPage", payload);
    }

    //sohbet verilerini çekebilmek amacıyla:
    var chat = await Chat.findOne({ _id: chatId, users: { $elemMatch: { $eq: userId }}})
        .populate("users");

    if (chat == null) {
        // Sohbet kimliğinin gerçekten kullanıcı kimliği olup olmadığını kontrol etme:
        var userFound = await User.findById(chatId);

        if (userFound != null ){
            // kullanıcı kimliğini kullanarak sohbet edin
            chat = await getChatByUserId(userFound._id, userId);
        }
    }

    if (chat == null) {
        payload.errorMessage = "sohbet mevcut değil veya onu görüntüleme izniniz yok.";
    }
    else {
        payload.chat = chat;
    }

    res.status(200).render("chatPage", payload);
})

//Kullanıcı kimliği ile sohbete erişme
function getChatByUserId(userLoggedInId, otherUserId) {
    //dizi içinde önce dizinin boyutunu sonra koşulların sağlanıp sağlanmadığını kontrol et.
    return Chat.findOneAndUpdate({
        isGroupChat: false,
        users: {
            $size: 2,
            $all: [
                { $elemMatch: { $eq: userLoggedInId}},
                { $elemMatch: { $eq: otherUserId}}
            ]
        }
    },
        {
        //veri güncellendiyse değerleri belgeye ata, güncellenmediyse hiçbir şey yapma:
            $setOnInsert: {
                users: [userLoggedInId, otherUserId]
            }
        },
        {
            new: true,
            upsert: true
        })
        //bunlar sonucunda populate ile verileri doldur.
        .populate("users");
}

module.exports = router;

