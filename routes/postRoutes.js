const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const User = require('../schemas/UserSchema');

router.get("/:id", (req, res, next) => {

    // atılan gönderiye tıklayınca gönderi görüntüle sayfasına yönlendirme:
    var payload = {
        pageTitle:"Gönderi Görüntüle",
        userLoggedIn: req.session.user,
        userLoggedInJs: JSON.stringify(req.session.user),
        postId: req.params.id
    }

    res.status(200).render("postPage", payload);
})

module.exports = router;