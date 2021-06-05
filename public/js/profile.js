$(document).ready(() => {
    // profil sayfasında eğer seçili kısım cevaplar ise cevapları göster,gönderi ise gönderileri göster.
    if (selectedTab === "replies") {
        loadReplies();
    }
    else {
        loadPosts();
    }
});
// Sabitlenmiş gönderiyi profilde görüntüleme,
// profil sayfasına gönderiler kısmında kendi gönderilerini,
// cevaplar kısmında ise gelen cevapları görüntülemek için:
function loadPosts() {
    $.get("/api/posts", { postedBy: profileUserId, pinned: true}, results => {
        outputPinnedPost(results, $(".pinnedPostContainer"));
    })

    $.get("/api/posts", { postedBy: profileUserId, isReply: false}, results => {
        outputPosts(results, $(".postsContainer"));
    })
}

function loadReplies() {
    $.get("/api/posts", { postedBy: profileUserId, isReply: true}, results => {
        outputPosts(results, $(".postsContainer"));
    })
}

// sabitlenen postu profile en üstte goruntulemek için:
function outputPinnedPost(results, container) {
    if (results.length == 0){
        container.hide();
        return;
    }
    container.html("");

    results.forEach(result => {
        var html = createPostHtml(result)
        container.append(html);
    });
}

