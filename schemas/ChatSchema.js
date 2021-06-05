const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//sohbet şeması
const chatSchema = new Schema({
    chatName: {type: String, trim: true},
    isGroupChat: { type: Boolean, default: false},
    users: [{type: Schema.Types.ObjectId, ref: 'User'}],
    latestMessage: {type: Schema.Types.ObjectId, ref: 'Message'}
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
