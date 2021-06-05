const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require("body-parser")
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const upload = multer({dest: "uploads/"})
const User = require('../../schemas/UserSchema');
const Post = require('../../schemas/PostSchema');
const Notification = require('../../schemas/NotificationSchema');

app.use(bodyParser.urlencoded({ extended: false }));

// kullanıcılar için arama yapma:
router.get("/", async (req, res, next) => {
    var searchObj = req.query;

    if (req.query.search !== undefined) {
        searchObj = {
            $or: [
                { firstName : { $regex: req.query.search, $options: "i" }},
                { lastName : { $regex: req.query.search, $options: "i" }},
                { username : { $regex: req.query.search, $options: "i" }},
            ]
        }
    }

    User.find(searchObj)
        .then(results => res.status(200).send(results))
        .catch(error => {
            console.log(error);
            res.sendStatus(400);

        })
})

//Kullanıcının kişiyi zaten takip edip etmediğini kontrol etme:
router.put("/:userId/follow", async (req, res, next) => {

    var userId = req.params.userId;
    var user = await User.findById(userId);
    if (user == null) return res.sendStatus(404);

    // zaten takip ediyorsa kullanıcının id' sini al, çek ve ekle.
    var isFollowing = user.followers && user.followers.includes(req.session.user._id);
    var option = isFollowing ? "$pull" : "$addToSet";

    req.session.user = await User.findByIdAndUpdate(req.session.user._id, { [option]: { following: userId } }, { new: true})
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })

    User.findByIdAndUpdate(userId, { [option]: { followers: req.session.user._id } })
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })

    //Takip bildirimi gönderebilmek amacıyla
        if (!isFollowing) {
            await Notification.insertNotification(userId, req.session.user._id, "follow", req.session.user._id);
        }
    res.status(200).send(req.session.user);
})

//Takipçilerin id' sinin çekilmesi için:
router.get("/:userId/following", async (req, res, next) => {
    User.findById(req.params.userId)
        .populate("following")
        .then(results => {
            res.status(200).send(results);
        })
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
});

//Takip edilenlerin id' sinin çekilmesi için:
router.get("/:userId/followers", async (req, res, next) => {
    User.findById(req.params.userId)
        .populate("followers")
        .then(results => {
            res.status(200).send(results);
        })
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
});

//Sunucuda bulunan profil fotosuna erişebilmek amacıyla :

router.post("/profilePicture", upload.single("croppedImage"), async (req, res, next) => {
    if(!req.file) {
        console.log("No file uploaded with ajax request.");
        return res.sendStatus(400);
    }
    //Yüklenen görüntünün doğru yerde saklanması:
    var filePath = `/uploads/images/${req.file.filename}.png`;
    var tempPath = req.file.path;
    var targetPath = path.join(__dirname, `../../${filePath}`);

    fs.rename(tempPath, targetPath, async error => {
        if (error != null) {
            console.log(error);
            return res.sendStatus(400);
        }

        // yüklenen fotonun veri tabanına çekilmesi için:
        req.session.user = await User.findByIdAndUpdate(req.session.user._id, { profilePic: filePath}, {new: true});
        res.sendStatus(204);
    })
});

//Sunucuda bulunan kapak fotosuna erişebilmek amacıyla :
router.post("/coverPhoto", upload.single("croppedImage"), async (req, res, next) => {
    if(!req.file) {
        console.log("No file uploaded with ajax request.");
        return res.sendStatus(400);
    }
    var filePath = `/uploads/images/${req.file.filename}.png`;
    var tempPath = req.file.path;
    var targetPath = path.join(__dirname, `../../${filePath}`);

    fs.rename(tempPath, targetPath, async error => {
        if (error != null) {
            console.log(error);
            return res.sendStatus(400);
        }

        req.session.user = await User.findByIdAndUpdate(req.session.user._id, { coverPhoto: filePath}, {new: true});
        res.sendStatus(204);
    })
});


module.exports = router;
