const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const User = require('../schemas/UserSchema');

app.set("view engine", "pug");
app.set("views", "views");

app.use(bodyParser.urlencoded({ extended: false}));

router.get("/", (req, res, next) => {
    res.status(200).render("register");
})

router.post("/", async (req, res, next) => {

    //Register kısmında tanımlanan alanlar:
    var firstName = req.body.firstName.trim();
    var lastName = req.body.lastName.trim();
    var username = req.body.username.trim();
    var email = req.body.email.trim();
    var password = req.body.password;

    var payload = req.body;

    // Register kısmında boş bırakılan alanlar için:
    if (firstName && lastName && username && email && password){
        var user = await User.findOne({
            $or: [
                { username: username },
                { email: email }
            ]
        })
        .catch((error) => {
            console.log(error);
            payload.errorMessage = "Bir şeyler yanlış gitti";
            res.status(200).render("register",payload);
        });

        if (user == null) {
            //Kullanıcı bulunamadı:

            var data = req.body;

            // kullanıcı şifrelerini bcrypt ile anahtarlama
            data.password = await bcrypt.hash(password, 10);

            // veritabanında users oluşturulan kod:
            User.create(data)
                .then((user) => {
                    req.session.user = user;
                    return res.redirect("/");
                })
        }
        else {
            //Zaten kullanımda olan kullanıcı adı ve epostalar için:
            if (email == user.email) {
                payload.errorMessage = "Bu e-posta zaten kullanılıyor.";
            }
            else {
                payload.errorMessage = "Bu kullanıcı adı zaten kullanılıyor.";
            }
            res.status(200).render("register",payload);
        }
    }
    else {
        // Kayıt kısmında kalan boş alanlar için:
        payload.errorMessage = "Boş alan kalmadığından emin olun.";
        res.status(200).render("register",payload);
    }
})

module.exports = router;
