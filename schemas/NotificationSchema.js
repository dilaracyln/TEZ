const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
    userTo: {type: Schema.Types.ObjectId, ref: 'User' },
    userFrom: {type: Schema.Types.ObjectId, ref: 'User' },
    notificationType: String,
    opened: {type: Boolean, default: false},
    entityId: Schema.Types.ObjectId
}, { timestamps: true });

//. Bildirimlerin eklenmesi kısmı için :
NotificationSchema.statics.insertNotification = async (userTo, userFrom, notificationType,entityId) => {
    var data = {
        userTo: userTo,
        userFrom: userFrom,
        notificationType: notificationType,
        entityId: entityId
    };
    //kullanıcı begenip geri çekerse o bildirimi sil.
    await Notification.deleteOne(data).catch(error => console.log(error));
    return Notification.create(data).catch(error => console.log(error));
}

var Notification = mongoose.model('Notification', NotificationSchema);
module.exports = Notification;

