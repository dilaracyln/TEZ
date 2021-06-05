//Veri tabanından takipçi ve takip edilen kullanıcıları çekebilmek için :
$(document).ready(() => {

    if (selectedTab === "followers") {
        loadFollowers();
    }
    else {
        loadFollowing();
    }
});

// takipçi veya takip edilenleri görüntüleme.
function loadFollowers() {
    $.get(`/api/users/${profileUserId}/followers`, results => {
        outputUsers(results.followers, $(".resultsContainer"));
    })
}

function loadFollowing() {
    $.get(`/api/users/${profileUserId}/following`, results => {
        outputUsers(results.following, $(".resultsContainer"));
    })
}


