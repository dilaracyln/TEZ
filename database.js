// veritabanı bağlantısı ayarları
const mongoose = require("mongoose");
mongoose.set("useNewUrlParser", true);
mongoose.set("useUnifiedTopology", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useUnifiedTopology", true);

class Database {

    constructor() {
        this.connect();
    }

    connect() {
        mongoose.connect("mongodb+srv://admin:dbUserPassword@twitterclonecluster.5lpex.mongodb.net/TwitterCloneDB?retryWrites=true&w=majority")
            .then(() => {
                console.log("veri tabanı bağlantısı başarılı");
            })
            .catch((err) => {
                console.log("veri tabanı bağlantısı başarısız." + err);
            })
    }
}

module.exports = new Database();