//sohbet listesi getirme:
$(document).ready(() => {
    $.get("/api/chats", (data, status, xhr) => {
        if(xhr.status == 400) {
            alert("Sohbet listesi getirilemedi.");
        }
        else {
            outputChatList(data, $(".resultsContainer"));
        }
    })
})

// sohbet çıktısını alma
function outputChatList(chatList, container) {
    chatList.forEach(chat => {
        var html = createChatHtml(chat);
        container.append(html);
    })

    if(chatList.length == 0) {
        container.append("<span class='noResults'>Görüntülenecek bir şey yok.</span>");
    }
}
$(document).on("click", (e) => {
    const target = $(e.target)
    if(target.hasClass("leaveChat")){
        if(target.data().id != null) {
            const chatId = target.data().id
            if(confirm("Are you sure you want to leave this chat?")) {
                $.ajax({
                    url: `/api/chats/${chatId}/leaveChat`,
                    type: "PUT",
                    success: () => location.reload(),
                    error: () => confirm("Could not update. Please try again")
                })
            }
        }
        return false
    }
})

