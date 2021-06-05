const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
const User = require('../../schemas/UserSchema');
const Post = require('../../schemas/PostSchema');
const Notification = require('../../schemas/NotificationSchema');

app.use(bodyParser.urlencoded({ extended: false}));

// atılan postları getirme rotası:
router.get("/", async (req, res, next) => {

    // profil sayfasındaki gönderiler kısmında kendi gönderilerini görme:
    var searchObj = req.query;

    // profil sayfasındaki cevaplar kısmında gelen cevapları gçrüntüleme:
    if (searchObj.isReply !== undefined) {
        var isReply = searchObj.isReply == "true";
        searchObj.replyTo = { $exists: isReply };
        delete searchObj.isReply;
    }

    // eğer arama sayfasındak arama çubuğundaki arama tanımsız ise metni regex ile getir ve sil.
    if (searchObj.search !== undefined){
        searchObj.content = { $regex: searchObj.search, $options: "i" };
        delete searchObj.search;
    }

    // ana sayfada sadece takip edilenlerin postunu görmek için :
    if (searchObj.followingOnly !== undefined){
        var followingOnly = searchObj.followingOnly == "true";

        if (followingOnly) {
            var objectIds = [];

            // if ve push(user) ile her sayfa refreshinde takipçi sayısının artmasını engelleme.
            if (!req.session.user.following) {
                req.session.user.following = [];
            }
            req.session.user.following.forEach(user => {
                objectIds.push(user);
            })

            objectIds.push(req.session.user._id);
            searchObj.postedBy = { $in: objectIds };
        }
        delete searchObj.followingOnly;
    }

    var results = await getPosts(searchObj);
    res.status(200).send(results);
})

// atılan posta yorum yapma rotası:
router.get("/:id", async (req, res, next) => {

    var postId = req.params.id;

    //atılan posta tıklanıp da view post sayfasına gidilince,
    // o posta yapılan yorumların da burada görünmesi:
    var postData = await getPosts({ _id: postId });
    postData = postData[0];

    var results = {
        postData : postData
    }

    if (postData.replyTo !== undefined) {
        results.replyTo = postData.replyTo;
    }

    results.replies = await getPosts( { replyTo: postId });

    res.status(200).send(results);
})

router.post("/", async (req, res, next) => {

    // gönderi kısmına yazılan verilerin geçersiz olması durumunda gösterilecek mesaj:
    if (!req.body.content) {
        console.log("içerik parametresi istekle gönderilmedi.");
        return res.sendStatus(400);
    }

    // gönderinin içerik ve kim tarafından atıldığı bilgisini çekme:
    var postData = {
        content: req.body.content,
        postedBy: req.session.user
    }

    // atılan yorumun veri tabanına kaydedilmesi:
    if (req.body.replyTo) {
        postData.replyTo = req.body.replyTo;
    }

    // atılan posta ait tüm bilgiler veri tabanından çekildi.
    Post.create(postData)
        .then(async newPost => {
            newPost = await User.populate(newPost, {path: "postedBy"})
            newPost = await Post.populate(newPost, {path: "replyTo"})

            // atılan posta yprum yapma bildirimi için
            if (newPost.replyTo !== undefined) {
                await Notification.insertNotification(newPost.replyTo.postedBy, req.session.user._id, "reply", newPost._id);
            }



            res.status(201).send(newPost);
        })
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
})

router.put("/:id/like", async (req, res, next) => {

    //Kullanıcının zaten gönderiyi beğenip beğenmediğini kontrol etme:
    var postId = req.params.id;
    var userId = req.session.user._id;

    var isLiked = req.session.user.likes && req.session.user.likes.includes(postId);

    // beğenileri çekmek için pull, eklemek için addtoset:
    var option = isLiked ? "$pull" : "$addToSet";

    // kullanıcı beğenilerini eklemek için findByIdAndUpdate kullanımı:
    req.session.user = await User.findByIdAndUpdate(userId, { [option]: {likes: postId }}, { new : true})
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })

    // Gönderi beğenilerini eklemek için:
    var post = await Post.findByIdAndUpdate(postId, { [option]: {likes: userId }}, { new : true})
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })

    // gönderi beğenme bildirimi için:

        if (!isLiked) {
            await Notification.insertNotification(post.postedBy,userId, "postLike", post._id);
        }
    res.status(200).send(post)
})

router.post("/:id/retweet", async (req, res, next) => {
    var postId = req.params.id;
    var userId = req.session.user._id;

    // dene ve retweeti sil
    var deletedPost = await Post.findOneAndDelete({ postedBy: userId, retweetData: postId})
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })

  //atılan gönderiyi retweetleme ve bunu geri çekme işlemleri
    var option = deletedPost != null ? "$pull" : "$addToSet";

    var repost = deletedPost;

    //o an retweetlenen gönderinin sayfa vaşına gelmesini sağlama
    if (repost == null) {
        repost = await Post.create({ postedBy : userId, retweetData: postId })
            .catch(error => {
                console.log(error);
                res.sendStatus(400);
            })
    }

    req.session.user = await User.findByIdAndUpdate(userId, { [option]: {retweets: repost._id }}, { new : true})
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })

    var post = await Post.findByIdAndUpdate(postId, { [option]: {retweetUsers: userId }}, { new : true})
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })

    //eğer gönderi silinmediyse rtleme bildirimi için:

        if (!deletedPost) {
            await Notification.insertNotification(post.postedBy,userId, "retweet", post._id);
        }



    res.status(200).send(post)
})

// atılan postun silinmesi için ana rota:
router.delete("/:id", (req, res, next) => {
    Post.findByIdAndDelete(req.params.id)
        .then(() => res.sendStatus(202))
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
})

// atılan postun sabitlenmesi için ana rota:
router.put("/:id", async (req, res, next) => {

    if (req.body.pinned !== undefined) {
        await Post.updateMany({postedBy: req.session.user}, { pinned: false })
            .catch(error => {
                console.log(error);
                res.sendStatus(400);
            })
    }
    Post.findByIdAndUpdate(req.params.id, req.body)
        .then(() => res.sendStatus(204))
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
})

// atılan postun ana sayfada görünmesi sağlandı.
// posta yorum yapıldığında, yorum yapılan postun da görünmesi sağlandı.
async function getPosts(filter) {
        var results = await Post.find(filter)
        .populate("postedBy")
        .populate("retweetData")
        .populate("replyTo")
            // atılan son postun sayfada en üstte görünmesi için:
        .sort({ "createdAt": -1 })
        .catch(error => console.log(error))

        results = await User.populate(results, {path:"replyTo.postedBy"});
        return await User.populate(results, {path:"retweetData.postedBy"});
}

module.exports = router;
