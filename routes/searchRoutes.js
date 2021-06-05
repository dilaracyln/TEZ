const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require("body-parser")
const bcrypt = require("bcrypt");
const User = require('../schemas/UserSchema');

// arama kısmı için:
router.get("/", (req, res, next) => {

    var payload = createPayload(req.session.user)
    res.status(200).render("searchPage", payload);
})

//arama sayfasını yeniden oluşturmadan önce seçilen sekmeyi yükle:
router.get("/:selectedTab", (req, res, next) => {
    var payload = createPayload(req.session.user)
    payload.selectedTab = req.params.selectedTab;
    res.status(200).render("searchPage", payload);
})

function createPayload(userLoggedIn) {
    return {
        pageTitle: "Arama",
        userLoggedIn: userLoggedIn,
        userLoggedInJs: JSON.stringify(userLoggedIn),
    }
}

module.exports = router;
