var verifier = ""
var tenant = ""
var popup = null

function refreshToken() {
    return new Promise((resolve, reject) => {
        var tokens = JSON.parse(localStorage.getItem("tokens"))
        var refresh_token = tokens.refresh_token;

        var settings = {
            "async": true,
            "crossDomain": true,
            "url": "https://accounts.magister.net/connect/token",
            "method": "POST",
            "headers": {
                "cache-control": "no-cache"
            },
            "data": {
                "refresh_token": refresh_token,
                "client_id": "M6LOAPP",
                "grant_type": "refresh_token"
            },
            "error": function (XMLHttpRequest, textStatus, errorThrown) {
                if (XMLHttpRequest.status == 400 || XMLHttpRequest.status == "400") {
                    try {
                        var response = JSON.parse(XMLHttpRequest.responseText)
                        if (response.error == "invalid_grant") {
                            openBrowser(1)
                        }
                    } catch (err) {
                        logConsole("[ERROR] " + err)
                    }
                } else if (XMLHttpRequest.readyState == 4) {
                    // alert("error: " + XMLHttpRequest.status)
                    logConsole("[ERROR] HTTP error (can be checked by XMLHttpRequest.status and XMLHttpRequest.statusText)")
                    // alert("first: " + XMLHttpRequest.statusText)
                } else if (XMLHttpRequest.readyState == 0) {
                    logConsole("[ERROR] Network error (i.e. connection refused, access denied due to CORS, etc.)")
                    // alert("second: " + XMLHttpRequest.statusText)
                    reject("no internet")
                } else {
                    logConsole("[ERROR] something weird is happening")
                    // alert("third: " + XMLHttpRequest.statusText)
                }
            },
            "timeout": 5000
        }

        $.ajax(settings).done(function (response) {
            logConsole("[DEBUG] " + typeof response == "object" ? JSON.stringify(response) : response)
            var tokens = {
                access_token: response.access_token,
                refresh_token: response.refresh_token,
                id_token: response.id_token
            }
            localStorage.setItem("tokens", JSON.stringify(tokens))
            resolve(tokens)
        });
    })

}

function openBrowser(b) {
    if (b == 0) {
        localStorage.clear()
        window.location = './login/index.html'
    }
    viewController.overlay("show")
    school = /(.+:\/\/)?([^\/]+)(\/.*)*/i.exec(school)[2]
    // tenant = school
    verifier = base64URL(generateCodeVerifier());
    logConsole(`[INFO]   Regenerating token`)

    var nonce = generateRandomBase64(32);
    var state = generateRandomState(16);

    var challenge = base64URL(generateCodeChallenge(verifier));
    var url = `https://accounts.magister.net/connect/authorize?client_id=M6LOAPP&redirect_uri=m6loapp%3A%2F%2Foauth2redirect%2F&scope=openid%20profile%20offline_access%20magister.mobile%20magister.ecs&response_type=code%20id_token&state=${state}&nonce=${nonce}&code_challenge=${challenge}&code_challenge_method=S256&acr_values=tenant:${school}&prompt=select_account`
    popup = window.cordova.InAppBrowser.open(url, '_blank', 'location=yes,hideurlbar=yes,hidenavigationbuttons=yes,toolbarcolor=#202124,closebuttoncolor=#eeeeee');
    popup.addEventListener("loaderror", customScheme);
}

function customScheme(iab) {
    popup.close()
    if (iab.url.substring(0, 25) == "m6loapp://oauth2redirect/") {
        var code = iab.url.split("code=")[1].split("&")[0];
        var settings = {
            "error": function (jqXHR, textStatus, errorThrown) {
                toast("Er kon geen verbinden met Magister gemaakt worden... Probeer het over een tijdje weer", false)
                reject("no internet")
                return
                // alert(textStatus);
            },
            "dataType": "json",
            "async": true,
            "crossDomain": true,
            "url": "https://accounts.magister.net/connect/token",
            "method": "POST",
            "headers": {
                "X-API-Client-ID": "EF15",
                "Content-Type": "application/x-www-form-urlencoded",
                "Host": "accounts.magister.net"
            },
            "data": `code=${code}&redirect_uri=m6loapp%3A%2F%2Foauth2redirect%2F&client_id=M6LOAPP&grant_type=authorization_code&code_verifier=${verifier}`,
        }

        $.ajax(settings).done(async (response) => {
            // var poep = window.cordova.InAppBrowser.open(response.access_token, '_system', '');
            var m = new Magister(school, response.access_token)
            m.getInfo()
                .then(async (newperson) => {
                    person = JSON.parse(localStorage.getItem("person"))
                    if (newperson.id == person.id) {
                        var tokens = {
                            access_token: response.access_token,
                            refresh_token: response.refresh_token,
                            id_token: response.id_token
                        }
                        localStorage.setItem("tokens", JSON.stringify(tokens))
                        viewController.overlay("hide")
                        onDeviceReady()
                    } else {
                        navigator.notification.confirm(
                            "Het lijkt erop dat je met een ander account bent ingelogd zojuist. Wil je je opgeslagen cijfers behouden en weer verder gaan log dan in met het account waarmee je tijdens de setup hebt ingelogd. \n\nKlopt dit niet? Dan er is er een flink probleem met de communicatie met Magister wat betekend dat je opnieuw het login process zal moeten volgen. Druk dan op \"Uitloggen\"",
                            openBrowser,
                            'Verkeerd account',
                            ['Opnieuw proberen', 'Uitloggen']
                        )
                    }
                })
        })
    } else {
        viewController.toast("Er is een onbekende error opgetreden... Probeer het in een ogenblik opnieuw", 5000, true)
    }
}

function generateRandomString(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function generateCodeVerifier() {
    var code_verifier = generateRandomString(128)
    return code_verifier;
}

function generateRandomBase64(length) {
    var text = "";
    var possible = "abcdef0123456789";
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function generateRandomState(length) {
    var text = "";
    var possible = "abcdefhijklmnopqrstuvwxyz";
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function generateCodeChallenge(code_verifier) {
    return code_challenge = base64URL(CryptoJS.SHA256(code_verifier))
}

function base64URL(string) {
    return string.toString(CryptoJS.enc.Base64).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}