// posta tıkla sayfaya git ve sayfada tıklanan postu görüntüle
$(document).ready(() => {
    $.get("/api/posts/" + postId, results => {
        outputPostsWithReplies(results, $(".postsContainer"));
    })
})