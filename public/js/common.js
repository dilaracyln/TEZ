let cropper;
let timer;
let selectedUsers = [];

$(document).ready(() => {
    refreshMessagesBadge();
    refreshNotificationsBadge();
})

// gönderi için oluşturulan butonun yazı yazılmaması durumunda pasif olması ve tanımlamaları:
// yorum yapma kısmı tanımlamaları:
$("#postTextarea, #replyTextarea").keyup(event => {
    var textbox = $(event.target);
    var value = textbox.val().trim();

    // var değişkenleri ile yorum yap kısmına tıklayıp bişey yazınca gönder tuşunun aktif olması:
    var isModal = textbox.parents(".modal").length == 1;
    var submitButton = isModal ? $("#submitReplyButton") : $("#submitPostButton");

    if(submitButton.length == 0) return alert("No submit button found");

    if (value == "") {
        submitButton.prop("disabled", true);
        return;
    }

    submitButton.prop("disabled", false);
})

// submitPostButton ve $.post= Gönderi düğmesine tıklama işleyici ekleme
// atılan yorumun sunucuya çekilmesi = submitReplyButton
$("#submitPostButton, #submitReplyButton").click(() => {
    var button = $(event.target);

    //atılan yorumun sunucuya çekilmesi:
    var isModal = button.parents(".modal").length == 1;
    var textbox = isModal ? $("#replyTextarea") : $("#postTextarea");

    var data = {
        content: textbox.val()
    }

    if (isModal) {
        var id = button.data().id;
        if( id == null) return alert("Button id is null");
        data.replyTo = id;
    }

    // location.reload ile yorum yaptıktan sonra sayfanın yenilenmesi:
    $.post("/api/posts", data, postData => {

        if (postData.replyTo) {
            emitNotification(postData.replyTo.postedBy);
            location.reload();
        }
        // atılan postu en başa ekle
        else {
            var html = createPostHtml(postData);
            $(".postsContainer").prepend(html);
            textbox.val("");
            button.prop("disabled", true);
        }
    })
})

$("#replyModal").on("show.bs.modal", (event) => {
    // var değişkenleri ile yorum yap butonuna tıklayınca yorum yapılacak gönderinin de görüntülenmesi:
    var button = $(event.relatedTarget);
    var postId = getPostIdFromElement(button);
    $("#submitReplyButton").data("id", postId);

    // postData nın çekilme nedeni atılan posta tıklayınca gdilen sayfada yorumlarını da görmek
    $.get("/api/posts/" + postId, results => {
        outputPosts(results.postData, $("#originalPostContainer"));
    })
})

//yorum yapma kısmında kapat düğmesine basıldığında çalıştırmaya devam etmesin diye
$("#replyModal").on("hidden.bs.modal", () => $("#originalPostContainer").html(""));

// silinecek postun id' sini çekme
$("#deletePostModal").on("show.bs.modal", (event) => {
    var button = $(event.relatedTarget);
    var postId = getPostIdFromElement(button);
    $("#deletePostButton").data("id", postId);

})

// sabitlenecek postun id' sini çekme
$("#confirmPinModal").on("show.bs.modal", (event) => {
    var button = $(event.relatedTarget);
    var postId = getPostIdFromElement(button);
    $("#pinPostButton").data("id", postId);
})

// sabitlemesi kaldırılacak postun id' sini çekme
$("#unpinModal").on("show.bs.modal", (event) => {
    var button = $(event.relatedTarget);
    var postId = getPostIdFromElement(button);
    $("#unpinPostButton").data("id", postId);
})

//Bir gönderiyi silmek için ajax araması yapma
$("#deletePostButton").click((event) => {
    var postId = $(event.target).data("id");

    $.ajax({
        url: `/api/posts/${postId}`,
        type: "DELETE",
        success: (data, status, xhr) => {

            if (xhr.status != 202) {
                alert("Gönderi silinemedi");
                return;
            }
            location.reload();
        }
    })
})

//Bir gönderiyi sabitlemek için ajax araması yapma
$("#pinPostButton").click((event) => {
    var postId = $(event.target).data("id");

    $.ajax({
        url: `/api/posts/${postId}`,
        type: "PUT",
        data: { pinned: true },
        success: (data, status, xhr) => {

            if(xhr.status != 204) {
                alert("Gönderi silinemedi");
                return;
            }

            location.reload();
        }
    })
})

//Bir gönderinin sabitlemesini kaldırmak için ajax araması yapma
$("#unpinPostButton").click((event) => {
    var postId = $(event.target).data("id");

    $.ajax({
        url: `/api/posts/${postId}`,
        type: "PUT",
        data: { pinned: false },
        success: (data, status, xhr) => {

            if(xhr.status != 204) {
                alert("Gönderi silinemedi.");
                return;
            }

            location.reload();
        }
    })
})

// profil fotosunda yüklemeden önce kırpma veya boyutlandırma gibi özellikleri değiştirmek:
$("#filePhoto").change(function () {
    if (this.files && this.files[0]) {
        var reader = new FileReader();
        reader.onload = (e) => {
            var image = document.getElementById("imagePreview");
            image.src = e.target.result;

            if (cropper !== undefined) {
                cropper.destroy();
            }
            cropper = new Cropper(image, {
                aspectRatio: 1 / 1,
                background: false
            });
        }
        reader.readAsDataURL(this.files[0]);
    }
    else {
        console.log("none")
    }
})

//kapak fotosunda yüklemeden önce kırpma veya boyutlandırma gibi özellikleri değiştirmek:
$("#coverPhoto").change(function () {
    if (this.files && this.files[0]) {
        var reader = new FileReader();
        reader.onload = (e) => {
            var image = document.getElementById("coverPreview");
            image.src = e.target.result;

            if (cropper !== undefined) {
                cropper.destroy();
            }
            cropper = new Cropper(image, {
                aspectRatio: 16 / 9,
                background: false
            });
        }
        reader.readAsDataURL(this.files[0]);
    }
})

// profil fotoğrafının yüklenmesi için:
$("#imageUploadButton").click(() => {
    var canvas = cropper.getCroppedCanvas();

    if (canvas == null ) {
        alert("Resim yüklenemedi. Bir görüntü dosyası olduğundan emin olun.");
        return;
    }

    canvas.toBlob((blob) => {
        var formData = new FormData();
        formData.append("croppedImage", blob);

        $.ajax({
            url: "/api/users/profilePicture",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: () => location.reload()
        })
    })
})

// Kapak fotoğrafının yüklenmesi için:
$("#coverPhotoButton").click(() => {
    var canvas = cropper.getCroppedCanvas();

    if (canvas == null ) {
        alert("Resim yüklenemedi. Bir görüntü dosyası olduğundan emin olun.");
        return;
    }

    canvas.toBlob((blob) => {
        var formData = new FormData();
        formData.append("croppedImage", blob);

        $.ajax({
            url: "/api/users/coverPhoto",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: () => location.reload()
        })
    })
})

//mesaj kısmında mesaj yazılacak Kullanıcı için arama zamanlayıcısını ekleme:
$("#userSearchTextbox").keydown((event) => {
    clearTimeout(timer);
    var textbox = $(event.target);
    var value = textbox.val();

    if (value == "" && (event.which == 8 || event.keyCode == 8)) {
        //kullanıcıyı seçimden kaldırma işlemi:
        selectedUsers.pop();
        updateSelectedUsersHtml();
        $(".resultsContainer").html("");

        if(selectedUsers.length == 0) {
            $("#createChatButton").prop("disabled", true);
        }

        return;
    }

    timer = setTimeout(() => {
        value = textbox.val().trim();

        if(value == "") {
            $(".resultsContainer").html("");
        }
        else {
            searchUsers(value);
        }
    }, 1000)

})

// yeni sohbet oluşturma butonu:
$("#createChatButton").click(() => {
   var data = JSON.stringify(selectedUsers);

   $.post("/api/chats", {users:data }, chat => {

       if (!chat || !chat._id) return alert("sunucudan geçersiz yanıt");

       window.location.href = `/messages/${chat._id}`;
   })
})

$(document).on("click", ".likeButton", (event) => {
    // like butonuna gelince "tıkla" imlecinin çıkması sağlandı.
    var button = $(event.target);
    var postId = getPostIdFromElement(button);

    if(postId === undefined) return;

    $.ajax({
        url: `/api/posts/${postId}/like`,
        type: "PUT",
        success: (postData) => {

            // like butonu beğeni sayısı görüntüleme. returndan span çekildi.
            button.find("span").text(postData.likes.length || "");

            // beğeni butonuna tıklayınca sınıf aktif, geri çekilince pasif duruma düşer:
            if(postData.likes.includes(userLoggedIn._id)) {
                button.addClass("active");
                emitNotification(postData.postedBy);
            }
            else {
                button.removeClass("active");
            }

        }
    })

})

$(document).on("click", ".retweetButton", (event) => {
    var button = $(event.target);
    var postId = getPostIdFromElement(button);

    if(postId === undefined) return;

    //retweet butonu yanında sayısını gösterme
    $.ajax({
        url: `/api/posts/${postId}/retweet`,
        type: "POST",
        success: (postData) => {
            button.find("span").text(postData.retweetUsers.length || "");

            if(postData.retweetUsers.includes(userLoggedIn._id)) {
                button.addClass("active");
                emitNotification(postData.postedBy);
            }
            else {
                button.removeClass("active");
            }

        }
    })

})

$(document).on("click", ".post", (event) => {
    // posta tıklayınca gönderi görüntüle sayfasına yönlendirme:
    var element = $(event.target);
    var postId = getPostIdFromElement(element);

    if (postId !== undefined && !element.is("button")) {
        window.location.href = "/posts/" + postId;
    }
});

//takip et butonuna tıklandığında kullanıcının id' sini çekebilmek için :
$(document).on("click", ".followButton", (e) => {
    var button = $(e.target);
    var userId = button.data().user;

    $.ajax({
        url: `/api/users/${userId}/follow`,
        type: "PUT",
        success: (data, status, xhr) => {

            if (xhr.status == 404){
                alert("Kullanıcı bulunamadı!")
                return;
            }

            //eğer takipçi verisi ve id' si varsa takip ediliyor, yoksa sınıfı sil takip et yazdır.
            var difference = 1;
            if(data.following && data.following.includes(userId)) {
                button.addClass("following");
                button.text("Takip ediliyor");
                emitNotification(userId);
            }
            else {
                button.removeClass("following");
                button.text("Takip et");
                difference= -1;
            }
            //takipçi ve takip edilenler kısmındaki sayıların otomatik artıp azalması:
            var followersLabel = $("#followersValue");
            if (followersLabel.length != 0) {
                var followersText = followersLabel.text();
                followersText = parseInt(followersText);
                followersLabel.text(followersText + difference);
            }
        }
    })
})

//Bildirim tıklama işleyicileri:
$(document).on("click", ".notification.active", (e) => {
    var container = $(e.target);
    var notificationId = container.data().id;

    var href = container.attr("href");
    e.preventDefault();

    var callback = () => window.location = href;
    markNotificationsAsOpened(notificationId, callback);
})

// Beğeni butonuna tıklayınca gönderi kimliğini tespit edebilmek:
function getPostIdFromElement(element) {
    var isRoot = element.hasClass("post");
    var rootElement = isRoot == true ? element : element.closest(".post");
    var postId = rootElement.data().id;

    if(postId === undefined) return alert("Gönderi id'si tanımsız.");

    return postId;
}

//Ana sayfada gönderi için yapılan tüm işlemler:
function createPostHtml(postData, largeFont = false) {

    //retweetlenen postların görüntülenmesinde ilk adım(konsol):
    if(postData == null) return alert("Gönderi objesi boş!");
    var isRetweet = postData.retweetData !== undefined;
    var retweetedBy = isRetweet ? postData.postedBy.username : null;
    postData = isRetweet ? postData.retweetData : postData;

    var postedBy = postData.postedBy;

    //eğer atılan gönderide kullanıcı adı, ad ve soyad undefined görünüyorsa:
    if(postedBy._id === undefined) {
        return console.log("kullanıcı nesnesi doldurulmamış");
    }

    var displayName = postedBy.firstName + " " + postedBy.lastName;
    var timestamp = timeDifference(new Date(), new Date(postData.createdAt));

    //sayfa yenilense de beğenilen postun ikonu kırmızı olsun.
    //sayfa yenilense de retweetlenen postun ikonu yeşil olsun.
    //posta tıkla-gidilen sayfada yorum yapılan postun yorumlarının fontu large olsun.
    var likeButtonActiveClass = postData.likes.includes(userLoggedIn._id) ? "active" : "";
    var retweetButtonActiveClass = postData.retweetUsers.includes(userLoggedIn._id) ? "active" : "";
    var largeFontClass = largeFont ? "largeFont" : "";

    //kim tarafından rtlendiği:
    var retweetText = '';
    if(isRetweet) {
        retweetText = `<span>
                        <i class='fas fa-retweet'></i>
                        <a href='/profile/${retweetedBy}'>@${retweetedBy}</a> tarafından retweetlendi    
                    </span>`
    }

    //yorum yaptıktan sonra cevap çıktısını alabilmek için:
    var replyFlag = "";
    if (postData.replyTo && postData.replyTo._id) {

        if (!postData.replyTo._id) {
            return alert("yanıt doldurulmamış.");
        }
        else if (!postData.replyTo.postedBy._id) {
            return alert("tarafından gönderilen doldurulmamış.");
        }

        // kim tarafından yorum yapıldığını görüntüleme:
        var replyToUsername = postData.replyTo.postedBy.username;
        replyFlag = `<div class="replyFlag">
                        <a href="/profile/${replyToUsername}">@${replyToUsername}</a> tarafından yanıtlandı.
                    </div>`;
    }

    // gönderi sabitleme ve silme için tanımlanan buttons değeri:
    var buttons = "";
    var pinnedPostText = "";
    if (postData.postedBy._id == userLoggedIn._id) {

        var pinnedClass = "";
        var dataTarget = "#confirmPinModal";
        //Sabitlenen gönderide bulunan sabitleme butonunun rengini değiştirmek için:
        if (postData.pinned === true){
            pinnedClass = "active";
            dataTarget = "#unpinModal",
            pinnedPostText = "<i class='fas fa-thumbtack'></i> <span>Sabitlenmiş Gönderi</span>"
        }


        buttons = `<button class="pinButton ${pinnedClass}" data-id = "${postData._id}" data-toggle = "modal" data-target="${dataTarget}"><i class="fas fa-thumbtack"></i> </button>
                   <button data-id = "${postData._id}" data-toggle = "modal" data-target="#deletePostModal"><i class="fas fa-times"></i> </button>`;
    }

    // timedifference fonksiyonu ile birlikte atılan gönderide ad,soyad,kullanıcı adı,
    // profil fotografı, post içeriği, sabitleme, atıldığı tarih,
    // like, retweet butonu ve yorum yapma butonu uugulamada görünecek.
    // kim tarafından rtlendiği ve yorum yapıldığı, rtlenme ve beğeni sayısı görünecek.
    return `<div class='post ${largeFontClass}' data-id='${postData._id}'>
                <div class='postActionContainer'>
                    ${retweetText}
                </div>
                <div class='mainContentContainer'>
                    <div class='userImageContainer'>
                        <img src='${postedBy.profilePic}'>
                    </div>
                    <div class='postContentContainer'>
                        <div class="pinnedPostText">${pinnedPostText}</div>
                        <div class='header'>
                            <a href='/profile/${postedBy.username}' class='displayName'>${displayName}</a>
                            <span class='username'>@${postedBy.username}</span>
                            <span class='date'>${timestamp}</span>
                            ${buttons}
                        </div>
                        ${replyFlag}
                        <div class='postBody'>
                            <span>${postData.content}</span>
                        </div>
                        <div class='postFooter'>
                            <div class='postButtonContainer'>
                                <button data-toggle='modal' data-target='#replyModal'>
                                    <i class='far fa-comment'></i>
                                </button>
                            </div>
                            <div class='postButtonContainer green'>
                                <button class='retweetButton ${retweetButtonActiveClass}'>
                                    <i class='fas fa-retweet'></i>
                                    <span>${postData.retweetUsers.length || ""}</span>
                                </button>
                            </div>
                            <div class='postButtonContainer red'>
                                <button class='likeButton ${likeButtonActiveClass}'>
                                    <i class='far fa-heart'></i>
                                    <span>${postData.likes.length || ""}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
}

// Postların ne zaman atıldığı bilgisi:
function timeDifference(current, previous) {

    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;
    var msPerMonth = msPerDay * 30;
    var msPerYear = msPerDay * 365;

    var elapsed = current - previous;

    if (elapsed < msPerMinute) {
        if (elapsed/1000 < 30) return "Az önce";

        return Math.round(elapsed/1000) + ' saniye önce';
    }

    else if (elapsed < msPerHour) {
        return Math.round(elapsed/msPerMinute) + ' dakika önce';
    }

    else if (elapsed < msPerDay ) {
        return Math.round(elapsed/msPerHour ) + ' saat önce';
    }

    else if (elapsed < msPerMonth) {
        return Math.round(elapsed/msPerDay) + ' gün önce';
    }

    else if (elapsed < msPerYear) {
        return Math.round(elapsed/msPerMonth) + ' ay önce';
    }

    else {
        return Math.round(elapsed/msPerYear ) + ' yıl önce';
    }
}

// atılan postları ana sayfada görüntülemek için:
function outputPosts(results, container) {
    container.html("");

    //yorum yapılacak gönderideki bilgilerin,
    //yorum yapan kişinin bilgileri ile aynı olmaması sağlandı
    if (!Array.isArray(results)) {
        results = [results];
    }

    results.forEach(result => {
        var html = createPostHtml(result)
        container.append(html);
    });

    if (results.length == 0) {
        container.append("<span class='noResults'>Nothing to show.</span>")
    }
}

// atılan posta tıklanınca gidilen sayfada, o posta yapılan yorumların görünmesi için:
function outputPostsWithReplies(results, container) {
    container.html("");

    if (results.replyTo !== undefined && results.replyTo._id !== undefined) {
        var html = createPostHtml(results.replyTo)
        container.append(html);
    }

    var mainPostHtml = createPostHtml(results.postData, true)
    container.append(mainPostHtml);

    results.replies.forEach(result => {
        var html = createPostHtml(result)
        container.append(html);
    });
}

// takipçi veya takip edilenleri görüntüleme.
function outputUsers(results, container) {
    container.html("");

    results.forEach(result => {
        var html = createUserHtml(result, true);
        container.append(html);
    });

    if (results.length == 0){
        container.append("<span class='noResults'>Sonuç bulunamadı</span>")
    }
}

// takipçilere girince o takipçinin profil fotosu, adı, soyadı ve kullanıcı adını görüntüleme.
function createUserHtml(userData, showFollowButton) {

    var name = userData.firstName + " " + userData.lastName;

    //Takip edenler kısmında kullanıcılarla oluşturulan listeye takip et butonu eklemek için :
    var isFollowing = userLoggedIn.following && userLoggedIn.following.includes(userData._id);
    var text = isFollowing ? "Takip Ediliyor" : "Takip Et"
    var buttonClass = isFollowing ? "followButton following" : "followButton"

    //Takip edenler kısmında kullanıcılarla oluşturulan listeye takip et butonu eklemek için :
    var followButton = "";
    if (showFollowButton && userLoggedIn._id != userData._id){
        followButton = `<div class= "followButtonContainer" >
                            <button class="${buttonClass}" data-user="${userData._id}">${text}</button>
                        </div>`;
    }

    return `<div class="user">
                <div class="userImageContainer">
                    <img src="${userData.profilePic}">
                </div>
                <div class="userDetailsContainer">
                    <div class="header">
                        <a href="/profile/${userData.username}">${name}</a>
                        <span class="username">@${userData.username}</span>
                    </div>
                </div>
                ${followButton}
            </div>`;
}

// yeni mesaj kısmında kullanıcı aramak için:
function searchUsers(searchTerm) {
    $.get("/api/users", {search: searchTerm}, results => {
        outputSelectableUsers(results, $(".resultsContainer"));
    })
}

//yeni mesaj kısmında kullanıcı seçerken seçilebilir kullanıcıların çıktısı:
function outputSelectableUsers(results, container) {
    container.html("");

    results.forEach(result => {

        //dizideki en az bir öğenin, iletilen fonksiyona belirtilen koşulu karşılayıp karşılamadığı :
        if(result._id == userLoggedIn._id || selectedUsers.some(u => u._id == result._id)) {
            return;
        }

        var html = createUserHtml(result, false);
        //yeni mesaj yazarken seçilen kullanıcıyı getirme işlemi :
        var element = $(html);
        element.click(() => userSelected(result))

        container.append(element);
    });

    if(results.length == 0) {
        container.append("<span class='noResults'>No results found</span>")
    }
}

//yeni mesaj yazarken kullanıcı seçme işlemi:
function userSelected(user) {
    //push:kullanıcıları sırayla diz.
    selectedUsers.push(user);
    updateSelectedUsersHtml()
    $("#userSearchTextbox").val("").focus();
    $(".resultsContainer").html("");
    //prop: arama çubugunda bişey yoksa veya silindiyse disabled modda ol.
    $("#createChatButton").prop("disabled", false);
}

//yeni mesaj yazılacak kullanıcıları seçince arama cubugunda bu kişinin görünmesi:
function updateSelectedUsersHtml() {
    var elements = [];

    selectedUsers.forEach(user => {
        var name = user.firstName + " " + user.lastName;
        var userElement = $(`<span class='selectedUser'>${name}</span>`);
        elements.push(userElement);
    })

    // remove ile seçili kullanıcıyı listeden sil
    //prepend ile seçili kullanıcıyı arama cubugunda basa ekle
    $(".selectedUser").remove();
    $("#selectedUsers").prepend(elements);
}

// oluşturulan sohbet sayfasında kiminle sohbet edildiğinin görülmesi için:
function getChatName(chatData) {
    var chatName = chatData.chatName;
    if (!chatName) {
        var otherChatUsers = getOtherChatUsers(chatData.users);
        var namesArray = otherChatUsers.map(user => user.firstName + " " + user.lastName);
        chatName = namesArray.join(", ")
    }

    return chatName;
}

// diğer sohbet kullanıcılarını getirme:
function getOtherChatUsers(users) {
    if (users.length == 1) return users;

    return users.filter(user => user._id != userLoggedIn._id);
}

function messageReceived(newMessage) {
    // bildirimlerin açılır penceresinde yeni mesajı gönderenin id' sini alma.
    if ($(`[data-room="${newMessage.chat._id}" ]`).length == 0) {
        // açılır bildirimi göster
        showMessagePopup(newMessage);
    }
    else {
        addChatMessageHtml(newMessage);
    }

    refreshMessagesBadge();
}

//bildirimlerden "açıldı" olanlar için:
function markNotificationsAsOpened(notificationId = null, callback = null) {
    if (callback == null) callback = () => location.reload();

    var url = notificationId != null ? `/api/notifications/${notificationId}/markAsOpened` : `/api/notifications/markAsOpened`;
    $.ajax({
        url: url,
        type: "PUT",
        success: () => callback()
    })
}

//Okunmamış sohbetlerin sayısını alma:
function refreshMessagesBadge() {
    $.get("/api/chats", { unreadOnly: true }, (data) => {

        var numResults = data.length;

        //eğer okunmamış mesaj sayısı sıfırdan fazlaysa burayı aktif et ve ikona sayıyı yazdır.
        if (numResults > 0) {
            $("#messagesBadge").text(numResults).addClass("active");
        }
        else {
            $("#messagesBadge").text("").removeClass("active");
        }
    })
}

//Okunmamış bildirimlerin sayısını alma:
function refreshNotificationsBadge() {
    $.get("/api/notifications", { unreadOnly: true }, (data) => {

        var numResults = data.length;

        if (numResults > 0) {
            $("#notificationBadge").text(numResults).addClass("active");
        }
        else {
            $("#notificationBadge").text("").removeClass("active");
        }
    })
}

// sayfanın sağ üstünde biildirimi görmek için:
function showNotificationPopup(data) {
    var html = createNotificationHtml(data);
    var element = $(html);
    //gelen bildirimlerin hızlıza sayfadan kalkaması için:
    element.hide().prependTo("#notificationList").slideDown("fast");

    //bildirim ekranda ne kadar süre görünecek:
    setTimeout(() => element.fadeOut(400), 5000);
}

// mesaj bildirimlerinin ana sayfanın sağında görünmesi için:
function showMessagePopup(data) {

    if(!data.chat.latestMessage._id) {
        data.chat.latestMessage = data;
    }

    var html = createChatHtml(data.chat);
    var element = $(html);
    //gelen bildirimlerin hızlıza sayfadan kalkaması için:
    element.hide().prependTo("#notificationList").slideDown("fast");

    //bildirim ekranda ne kadar süre görünecek:
    setTimeout(() => element.fadeOut(400), 5000);
}

// bildirimleri bildirimler sayfasında görüntülemek için:
function outputNotificationList(notifications, container) {
    notifications.forEach(notification => {
        var html = createNotificationHtml(notification);
        container.append(html);
    })

    // eğer bildirim yoksa sonuç yok döndür:
    if (notifications.length == 0) {
        container.append("<span class='noResults'>Nothing to show.</span>");
    }
}

function createNotificationHtml(notification) {
    var userFrom = notification.userFrom;
    var text = getNotificationText(notification);
    var href = getNotificationUrl(notification);
    //bildirim açıldıysa gri, açılmadıysa mavi olması.
    var className = notification.opened ? "" : "active";

    //gelen bildirimde, kimden geldiyse onun profil resmi ve text ile bildirimin tipi olsun.
    return `<a href="${href}" class="resultListItem notification ${className}" data-id = "${notification._id}">
                <div class="resultsImageContainer">
                    <img src="${userFrom.profilePic}">
                </div>
                <div class="resultsDetailsContainer ellipsis">
                     <span class="ellipsis">${text}</span>
                </div>
            </a>`;
}

//Bildirim metni oluşturma:
function getNotificationText(notification) {

    //kim tarafından bildirim geliyorsa, eğer o kullanıcının adı veya soyadı tanımlı değilse hata mesajı:
    var userFrom = notification.userFrom;
    if (!userFrom.firstName || !userFrom.lastName) {
        return alert("verilerdeki kullanıcı doldurulmamış.")
    }

    // kullanıcı tanımlı ise alttakileri yazdır:
    var userFromName = `${userFrom.firstName} ${userFrom.lastName}`;

    var text;

    if (notification.notificationType == "retweet") {
        text = `${userFromName} gönderilerinden birini retweetledi.`;
    }
    else if (notification.notificationType == "postLike") {
        text = `${userFromName} gönderilerinden birini beğendi.`;
    }
    else if (notification.notificationType == "reply") {
        text = `${userFromName} gönderilerinden birini cevapladı.`;
    }
    else if (notification.notificationType == "follow") {
        text = `${userFromName} seni takip etti.`;
    }

    return `<span class="ellipsis">${text}</span>`;
}

//eğer bildirim rt, like or yorumsa gönderiler sayfasına, takip etme ise profile git.
function getNotificationUrl(notification) {
    var url = "#";

    if (notification.notificationType == "retweet" ||
        notification.notificationType == "postLike" ||
        notification.notificationType == "reply") {

        url = `/posts/${notification.entityId}`;
    }
    else if (notification.notificationType == "follow") {
        url = `/profile/${notification.entityId}`;
    }

    return url;
}

//oluşturulan sohbetin adı, oluşturulduğu kullanıcıların resmi, son mesajı ve silme butonu.
function createChatHtml(chatData) {
    var chatName = getChatName(chatData);
    var image = getChatImageElements(chatData);
    var latestMessage = getLatestMessage(chatData.latestMessage);
    var deleteBtn = chatData.isGroupChat ? `<button>
                                                <i class='fa fa-times leaveChat' data-id="${chatData._id}" title="Leave this chat"></i>
                                              </button>` : ""

    //mesajlar kısmında okunmamış mesajların anlaşılması için:
    var activeClass = !chatData.latestMessage || chatData.latestMessage.readBy.includes(userLoggedIn._id) ? "" : "active";

    return `<a href="/messages/${chatData._id}" class="resultListItem ${activeClass}" >
                ${image}
                <div class="resultsDetailsContainer ellipsis">
                    <span class="heading ellipsis">${chatName}</span>
                    <span class="subText ellipsis">${latestMessage}</span>
                </div>
                    ${deleteBtn}
            </a>`
}

//sohbet kısmında kullanıcı veya grup adının altında atılan en son mesajı görme:
function getLatestMessage(latestMessage) {
    //eğer son mesaj boş değilse gönderenin adı soyadı ve mesaj içeriğini aliıp yazdır.
    if(latestMessage != null) {
        var sender = latestMessage.sender;
        return `${sender.firstName} ${sender.lastName}: ${latestMessage.content}`;
    }

    //boş ise sadece new chat yazdır.
    return "Yeni Sohbet";
}

// oluşturulan sohbet listesinde, sohbet resminin gözükmesi için:
function getChatImageElements(chatData) {
    var otherChatUsers = getOtherChatUsers(chatData.users);

    // eğer çekilen kullanıcı 1 ise onun resmini getir,
    //1^den fazla ise hepsinin resmini getir.
    var groupChatClass = "";
    var chatImage = getUserChatImageElement(otherChatUsers[0]);

    if(otherChatUsers.length > 1) {
        groupChatClass = "groupChatImage";
        chatImage += getUserChatImageElement(otherChatUsers[1]);
    }

    return `<div class='resultsImageContainer ${groupChatClass}'>${chatImage}</div>`;
}

// oluşturulan sohbet listesinde, kimle sohbet ediliyorsa onun resminin gözükmesi için:
function getUserChatImageElement(user) {
    if(!user || !user.profilePic) {
        return alert("İşleve geçirilen kullanıcı geçersiz.");
    }

    return `<img src='${user.profilePic}' alt='Users profile pic'>`;
}








