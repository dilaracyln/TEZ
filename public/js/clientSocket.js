var connected = false;

//hangi port ile bağlantı kurulacak:
var socket = io("http://localhost:3003");
//bağlı olup olmadığı emit ile true or false döndürülecek:
socket.emit("setup", userLoggedIn);

//on ile bağlı olma durumu için boş dizinin sonuna bir dinleme ekle ve true döndür.
socket.on("connected", () => connected = true);
//mesaj alındı işlevi:
socket.on("message received", (newMessage) => messageReceived(newMessage));
// bildirim alındı işlevi:
socket.on("notification received", () => {
    $.get("/api/notifications/latest", (notificationData) => {
        showNotificationPopup(notificationData);
        refreshNotificationsBadge();
    })
})

function emitNotification (userId) {
    if (userId == userLoggedIn._id) return;
    //emit ile bildirim alındıysa true alınmadıysa false
    socket.emit("notification received", userId);
}
