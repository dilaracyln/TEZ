$(document).ready(() => {
    $.get("/api/posts", { followingOnly:true}, results => {
        outputPosts(results, $(".postsContainer"));
    })
})

// followingOnly=Ana sayfada yalnızca takip edilen
// kullanıcıların gönderilerinin görünmesi için


