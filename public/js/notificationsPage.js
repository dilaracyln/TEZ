$(document).ready(() => {
    $.get("/api/notifications", (data) => {
        outputNotificationList(data, $(".resultsContainer"))
    })
})

// tüm bildirimleri okundu olarak işaretleme:
$("#markNotificationsAsRead").click(() => markNotificationsAsOpened());



