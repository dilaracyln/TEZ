var typing = false;
var lastTypingTime;

$(document).ready(() => {
    //sohbet odasına katılmak, yazıyor.., yazmayı bıraktı ksıımları için:
    socket.emit("join room", chatId);
    socket.on("typing", () => $(".typingDots").show());
    socket.on("stop typing", () => $(".typingDots").hide());

    // sohbet verilerini çekmek için:
    $.get(`/api/chats/${chatId}`, (data) => $("#chatName").text(getChatName(data)))

    //Veritabanından mesajların alınması ve uygulamada tılan mesajların görüntülenmesi:
    $.get(`/api/chats/${chatId}/messages`, (data) => {

        var messages = [];
        var lastSenderId = "";

        //dizideki her bir öğeyi büyük bir dizeye yerleştirin ve bunu her öğenin arasına koy
        data.forEach((message, index) => {
            var html = createMessageHtml(message, data[index + 1], lastSenderId);
            messages.push(html);

            //mesaj gönderenin kimliğini son gönderen kimliği yap.
            lastSenderId = message.sender._id;
        })

        // atılan mesajları görüntülemek(1) için:
        var messagesHtml = messages.join("");
        addMessagesHtmlToPage(messagesHtml);
        scrollToBottom(false);
        markAllMessagesAsRead();

        // mesajlar gelince ykleniyor simgesini kaldır bunun haricinde görünür olsun.
        $(".loadingSpinnerContainer").remove();
        $(".chatContainer").css("visibility", "visible");
    })
})

// sohbet adını değiştirmek için:
$("#chatNameButton").click(() => {
    var name = $("#chatNameTextbox").val().trim();

    //Ajax araması ile sohbet adını değiştirmek için :
    $.ajax({
        url: "/api/chats/" + chatId,
        type: "PUT",
        data: { chatName: name },
        success: (data, status, xhr) => {
            if(xhr.status != 204) {
                alert("güncellenemedi");
            }
            else {
                location.reload();
            }
        }
    })
})

//İleti gönderilen olay işleyicileri:
$(".sendMessageButton").click(() => {
    messageSubmitted();
})

$(".inputTextbox").keydown((event) => {

    updateTyping();

    //event.which:olay için hangi klavye tuşuna veya fare düğmesine basıldığını döndürür.
    if (event.which === 13) {
        messageSubmitted();
        return false;
    }
})

function updateTyping() {
    //socketle bağlı değilse return:
    if (!connected) return;

    //kullanıcı mesaj yazmıyorsa
    if (!typing) {
        typing = true;
        socket.emit("typing", chatId);
    }

    // son yazma zamanını pc den al.
    lastTypingTime = new Date().getTime();
    var timerLength = 3000;

    // zaman aşımını ayarlamak için:
    setTimeout(() => {
        var timeNow = new Date().getTime();
        var timeDiff = timeNow - lastTypingTime;

        //eğer zaman farkı, 3 sn den büyük veya eşitse ve yazıyor görünüyorsa,
        //yazmayı bıraktı kısmını aktifleştir ve yazmayı false yap. :
        if (timeDiff >= timerLength && typing) {
            socket.emit("stop typing", chatId);
            typing = false;
        }
    }, timerLength);
}

//sohbet mesajlarını görüntüle:
function addMessagesHtmlToPage(html) {
    $(".chatMessages").append(html);
}

//mesaj gönderme kısmına aktarım için:
function messageSubmitted() {
    var content = $(".inputTextbox").val().trim();

    // eğer mesaj içeriği boş değilse send message' a git k de.
    if(content != "") {
        sendMessage(content);
        $(".inputTextbox").val("");
        // mesaj yazarken yazım çubugundaki "bir mesaj yazın" kısmı kaybolsun.
        socket.emit("stop typing", chatId);
        typing = false;
    }
}

// mesaj göndermek için:
function sendMessage(content) {

    $.post("/api/messages", { content: content, chatId: chatId }, (data, status, xhr) => {

        //eğer istek başarılı değilse hata mesajı ver. inboxTextbox' a git.
        if(xhr.status != 201) {
            alert("Mesaj gönderilemedi!");
            $(".inputTextbox").val(content);
            return;
        }

        addChatMessageHtml(data);

        //bağlantı varsa yeni mesaj yazdır ve verileri çek.
        if(connected) {
            socket.emit("new message", data);
        }

    })
}

//html mesajı yoksa hata ver. varsa createMessageHtml a git.
function addChatMessageHtml(message) {
    if(!message || !message._id) {
        alert("Message is not valid");
        return;
    }

    var messageDiv = createMessageHtml(message, null, "");

    addMessagesHtmlToPage(messageDiv);
    scrollToBottom(true);
}

// html mesajı oluşturma:
function createMessageHtml(message, nextMessage, lastSenderId) {

    //mesajı göndereni tanımla. gönderen adını ad ve soyad olarak tanımla.
    var sender = message.sender;
    var senderName = sender.firstName + " " + sender.lastName;

    //gönderen id sini geçerli gönderen id sine ata
    var currentSenderId = sender._id;
    //eğer sonraki mesaj boş değilse bu mesajı gönderen id sine ata boşsa boş html döndür ve
    //bunu sonraki gönderen kimliğine ata.
    var nextSenderId = nextMessage != null ? nextMessage.sender._id : "";

    //son gönderen id geçerliye eşit değilse ilk mesaj
    // sonraki gönderen id geçerliye eşit değilse son mesaj
    var isFirst = lastSenderId != currentSenderId;
    var isLast = nextSenderId != currentSenderId;

    //kullanıcının kendi mesajı tanımlandı. eğer isMine kullanıcı bilgilerine aitse
    //mine kısmı değilse their kısmı döndürülsün.
    var isMine = message.sender._id == userLoggedIn._id;
    var liClassName = isMine ? "mine" : "theirs";

   // eğer son gönderen id geçerliye eşit değile first ekle
    var nameElement = "";
    if(isFirst) {
        liClassName += " first";

        //eğer mesajı ben göndermediysem gönderenin adını yaz.
        if(!isMine) {
            nameElement = `<span class='senderName'>${senderName}</span>`;
        }
    }

    // sonraki gönderen id geçerliye eşit değilse last a ekle ve profil resmini çek
    var profileImage = "";
    if(isLast) {
        liClassName += " last";
        profileImage = `<img src='${sender.profilePic}'>`;
    }

    //eğer mesajı ben atmadıysam, atan kullanıcının profil resmi de gözüksün.
    var imageContainer = "";
    if(!isMine) {
        imageContainer = `<div class='imageContainer'>
                                ${profileImage}
                            </div>`;
    }
    // gelen mesajlarda görünecek şeyler:
    // mesajın id' sini bul, kullanıcı resminini, adını getir. içeriği yazdır.
    return `<li class='message ${liClassName}'>
                ${imageContainer}
                <div class='messageContainer'>
                    ${nameElement}
                    <span class='messageBody'>
                        ${message.content}
                    </span>
                </div>
            </li>`;
}

//mesajları otomatik olarak aşağı kaydırma işlemi için :
function scrollToBottom(animated) {
    var container = $(".chatMessages");
    var scrollHeight = container[0].scrollHeight;

    if(animated) {
        container.animate({ scrollTop: scrollHeight }, "slow");
    }
    else {
        container.scrollTop(scrollHeight);
    }
}

//Tüm mesajları okundu olarak işaretleme:
function markAllMessagesAsRead() {
    $.ajax({
        url: `/api/chats/${chatId}/messages/markAsRead`,
        type: "PUT",
        success: () => refreshMessagesBadge()
    })
}

