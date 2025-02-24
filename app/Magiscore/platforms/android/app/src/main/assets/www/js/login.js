var verifier = "";
var tenant = "";
var popup = null
var lastSchools = []

var currentGradeIndex = 0
var totalGrades = 0
var all_courses = []
var all = []

console.log("Loaded login page :)")

// alert("ff tijdelijk: HOUD DE APP OPEN TIJDENS HET OPHALEN VAN JE CIJFERS!")

Array.prototype.chunk = function (chunkSize) {
    var R = [];
    for (var i = 0; i < this.length; i += chunkSize) {
        var chunkArr = this.slice(i, i + chunkSize);
        var chunk = {}
        chunk.array = chunkArr
        chunk.gradeIndex = 0
        R.push(chunk)
    }

    return R;

};

function getLoginInfo() {
    return {
        username: $('#login-username').val(),
        password: $('#login-password').val(),
        school: schools[$('#login-school').val()]
    }
}

function onDeviceReady() {

    StatusBar.overlaysWebView(false);
    StatusBar.backgroundColorByHexString("#0096db");
    StatusBar.styleLightContent();
    // alert(navigator.connection.type)
    // alert(Object.entries(localStorage) + window.location.hash)
    if (window.location.hash == "#notokens" && Object.entries(localStorage).length > 0) {
        navigator.notification.alert(
            'Het lijkt erop dat je (per ongeluk) bent uitgelogd. Dit kan bijvoorbeeld gebeuren door een software update van je telefoon. Log opnieuw in om Magiscore weer te gebruiken.',
            emptyFuntion,
            'Uitgelogd',
            'Oké'
        );
    }
    if (window.location.hash == "#failedlogin") {
        navigator.notification.alert(
            'Het inloggen vorige keer is niet goed gelukt. Dit kan bijvoorbeeld zijn omdat je de app had afgesloten of omdat je internetverbinding weg was gevallen.\nTip: houd de app open tijdens het inloggen/cijfers ophalen',
            emptyFuntion,
            'Login mislukt',
            'Oké'
        );
    }
}

function emptyFuntion() {}

function retryLogin() {
    localStorage.clear()
    window.location = './index.html'
}

function onOffline() {
    navigator.notification.confirm(
        "Het lijkt erop dat je geen internetverbinding hebt...\nOm in te loggen is een actieve internetverbinding vereist.",
        openWifiSettings,
        'Geen internet',
        ['Open instellingen', 'Annuleer']
    )
}

function openWifiSettings(b) {
    if (b == 1) {
        window.cordova.plugins.settings.open("wifi", emptyFuntion, emptyFuntion)
        localStorage.clear()
    } else return
}

function fillTimeout(remaining) {
    $("#timeout-wrapper").show()
    $("#timeout-remaining").text(`${remaining} seconden`)
    setInterval(() => {
        remaining--
        $("#timeout-remaining").text(`${remaining} seconden`)
        if (remaining == 0) return
    }, 1000)
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
    logConsole(`Code verifier gegenereerd!`)
    var code_verifier = generateRandomString(128)
    return code_verifier;
}

function generateRandomBase64(length) {
    logConsole(`Base64 identifier gegenereerd!`)
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
    logConsole(`Code challenger gegenereerd!`)
    return code_challenge = base64URL(CryptoJS.SHA256(code_verifier))
}

function base64URL(string) {
    return string.toString(CryptoJS.enc.Base64).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function openLoginWindow(school) {
    school = /(.+:\/\/)?([^\/]+)(\/.*)*/i.exec(school)[2]
    tenant = school
    if (cordova === undefined) return
    verifier = base64URL(generateCodeVerifier());
    logConsole(`School ${tenant}`)
    //$("#login-school").val(verifier);

    var nonce = generateRandomBase64(32);
    var state = generateRandomState(16);

    var challenge = base64URL(generateCodeChallenge(verifier));
    var url = `https://accounts.magister.net/connect/authorize?client_id=M6LOAPP&redirect_uri=m6loapp%3A%2F%2Foauth2redirect%2F&scope=openid%20profile%20offline_access%20magister.mobile%20magister.ecs&response_type=code%20id_token&state=${state}&nonce=${nonce}&code_challenge=${challenge}&code_challenge_method=S256&acr_values=tenant:${school}&prompt=select_account`
    popup = cordova.InAppBrowser.open(url, '_blank', 'location=yes,hideurlbar=yes,hidenavigationbuttons=yes,toolbarcolor=#202124,closebuttoncolor=#eeeeee');
    popup.addEventListener("loaderror", customScheme);
}

function customScheme(iab) {
    popup.hide()
    if (iab.url.substring(0, 25) == "m6loapp://oauth2redirect/") {
        var code = iab.url.split("code=")[1].split("&")[0];
        validateLogin(code, verifier);
    } else {
        toast("Er is een onbekende error opgetreden... Probeer het in een ogenblik opnieuw", 5000, true)
    }
}

function toast(msg, duration, fullWidth) {
    var snackId = Math.floor((Math.random() * 1000000) + 1)
    var bottom = $(".snackbar").length < 1 ? 30 : ($(".snackbar").length * 65) + 30
    $("body").append(`<div id="snackbar-${snackId}" class="snackbar${fullWidth ? " w-90" : ""}">${msg}</div>`);
    $(`#snackbar-${snackId}`).css("margin-left", -($(`#snackbar-${snackId}`).width() / 2 + 16))
    $(`#snackbar-${snackId}`).css("display", "block");
    $(`#snackbar-${snackId}`).animate({
            "bottom": `${bottom}px`
        },
        "slow"
    );
    if (duration) {
        setTimeout(function () {
            $(`#snackbar-${snackId}`).animate({
                    "bottom": "-200px"
                },
                "slow",
                function () {
                    $(`#snackbar-${snackId}`).remove();
                }
            );
        }, duration);
    }
}

function makeRequestChain(val, vals) {
    var index = vals.indexOf(val)
    if (index + 1 != vals.length) {
        return val.fill().then(makeRequestChain(vals[index + 1], vals))
    } else {
        return
    }

}

function fillAGrade(chunk) {
    // logConsole("starting new fill: " + (chunk.gradeIndex < chunk.array.length))
    if (chunk.gradeIndex < chunk.array.length) {
        var currentGrade = chunk.array[chunk.gradeIndex]
        currentGrade.fill().then(value => {
            // logConsole("filledAGrade")
            chunk.gradeIndex += 1
            totalGrades -= 1
            $("#grades-remaining").text(totalGrades)
            //logConsole(fillAGrade)
            fillAGrade(chunk)

            var remaining = Math.round((((totalGrades / 150) * 20) * 10) / 60) / 10 + 1
            $("#time-remaining").text(`${remaining} minuten`)
            $("#grades-remaining").text(totalGrades)
            addLoader((100 - ((totalGrades / all.length) * 100)), true)

            if (totalGrades == 0) {
                // alert("Done :)")
                window.plugins.insomnia.allowSleepAgain()
                // all_courses[4].grades = []
                localStorage.setItem("courses", JSON.stringify(all_courses))
                localStorage.setItem("loginSuccess", "true")
                window.location = '../index.html'
            }
        }).catch(err => {
            if (err == 429) {
                setTimeout(function () {
                    fillAGrade(chunk)
                }, 21000)
            }
        })
    }
}
async function validateLogin(code, codeVerifier) {
    toast("Houd de app open", false, true)
    toast("Succesvolle login!", 2000, true)
    logConsole(`Login valideren...`)
    var settings = {
        "error": function (jqXHR, textStatus, errorThrown) {
            toast("Er kon geen verbinden met Magister gemaakt worden... Probeer het over een tijdje weer", false)
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
        "data": `code=${code}&redirect_uri=m6loapp%3A%2F%2Foauth2redirect%2F&client_id=M6LOAPP&grant_type=authorization_code&code_verifier=${codeVerifier}`,
    }

    $.ajax(settings).done(async (response) => {
        window.plugins.insomnia.keepAwake()
        $("#login").hide()
        $("#loader").show()
        logConsole(`Succesvol oauth tokens binnengehaald!`)
        addLoader(3)
        var tokens = {
            access_token: response.access_token,
            refresh_token: response.refresh_token,
            id_token: response.id_token
        }
        localStorage.setItem("tokens", JSON.stringify(tokens));
        localStorage.setItem("school", tenant);
        var config = {
            "isDesktop": false,
            "tention": 0.3,
            "passed": 5.5,
            "darkTheme": false,
            "smiley": false,
            "refreshOldGrades": false,
            "includeGradesInAverageChart": false,
            "devMode": false,
            "exclude": []
        }
        localStorage.setItem("config", JSON.stringify(config));
        logConsole("Succesvol config bestanden opgeslagen!")
        addLoader(1)

        var m = new Magister(tenant, response.access_token)
        // logConsole(JSON.stringify(m))
        m.getInfo()
            .then(async (person) => {
                // alert(JSON.stringify(person) + Object.entries(localStorage).length)
                if (person.isParent) {
                    localStorage.clear()
                    navigator.notification.confirm(
                        "Inloggen met een ouderaccount is momenteel nog niet ondersteunt. Log in met een leerlingaccount en probeer het opnieuw.",
                        retryLogin,
                        'Ouder account',
                        ['Opnieuw inloggen', 'Annuleer']
                    )
                }
                logConsole(`Succesvol leerlingid (${person.id}) opgehaald!`)
                addLoader(3)
                m.getCourses()
                    .then(async (courses) => {
                        all_courses = courses
                        logConsole(`Succesvol ${courses.length} leerjaren opgehaald!`)
                        addLoader(7)
                        const requests = await courses.map(async course => {
                            const [grades, classes] = await Promise.all([course.getGrades({
                                fillGrades: false,
                                latest: false
                            }), course.getClasses()]);
                            course.grades = grades
                            course.classes = classes
                            if (course.id == "31089" || course.id == 31089) course.grades = []
                            return course
                        })

                        Promise.all(requests)
                            .then(async (values) => {
                                logConsole("Cijfers en vakken opgehaald!")
                                addLoader(8) // 12% total, 88% remaining
                                var years = values.length
                                all = []
                                values.forEach(value => {
                                    totalGrades += value.grades.length
                                    value.grades.forEach(grade => {
                                        all.push(grade)
                                    })
                                })
                                all_grades = all
                                logConsole(`Totaal ${totalGrades} cijfers!`)
                                var remaining = Math.round(((years + 1) * 0.5) * 10) / 10
                                $("#time-remaining").text(`${remaining} ${remaining >= 2 ? "minuten" : "minuut"}`)
                                $("#grades-remaining").text(totalGrades)
                                for (let grade of all_grades) {
                                    try {
                                        grade = await grade.fill()
                                        var i = _.findIndex(all_grades, {
                                            id: grade.id
                                        })
                                        // logConsole(i + ' ' + (Number(all_grades.length) - 1))

                                        $("#grades-remaining").text((Number(all_grades.length) - 1) - i)
                                        // var remaining = Math.round((((totalGrades / 150) * 20) * 10) / 60) / 10 + 1
                                        var time = ((Number(all_grades.length) - 1) - i) * 0.15
                                        var minutes = Math.floor(time / 60)
                                        var seconds = time - minutes * 60;
                                        $("#time-remaining").text(`${Math.round(minutes)}min ${Math.round(seconds)}sec`)
                                        addLoader((100 - ((((Number(all_grades.length) - 1) - i) / all_grades.length) * 100)), true)

                                        if (i == (Number(all_grades.length) - 1)) {
                                            // alert("Done :)")
                                            window.plugins.insomnia.allowSleepAgain()
                                            // all_courses[4].grades = []
                                            localStorage.setItem("courses", JSON.stringify(all_courses))
                                            localStorage.setItem("loginSuccess", "true")
                                            window.location = '../index.html'
                                        }
                                    } catch (err) {
                                        errorConsole(err)
                                    }
                                }
                                // var chunkedGrades = all_grades.chunk(6)
                                // chunkedGrades.forEach(element => {
                                //     fillAGrade(element)
                                // });
                            }).catch(err => errorConsole(err))
                    }).catch(err => {
                        errorConsole(err + " 420")
                    })
            }).catch(err => {
                errorConsole(err)
            })
    }).catch(err => {
        errorConsole(err)
    })
    // window.location = '../index.html';
}

function handleOpenURL(url) {
    var code = url.split("code=")[1].split("&")[0];
    validateLogin(code, verifier);
}

function addLoader(val, set) {
    if (!set) var val = val + parseInt($(".progress-bar").attr("aria-valuenow"))
    $(".progress-bar").css("width", val + "%").attr("aria-valuenow", val)
}

document.addEventListener("deviceready", onDeviceReady, false);
document.addEventListener("offline", onOffline, false);


$(document).ready(function () {
    $(function () {
        $.ui.autocomplete.prototype._renderMenu = function (ul, items) {
            var self = this;
            $("#schools-table").empty()
            $.each(items, function (index, item) {
                self._renderItemData(ul, $("#schools-table"), item);
            });
        };
        $.ui.autocomplete.prototype._renderItemData = function (ul, table, item) {
            return this._renderItem($("#schools-table"), item).data("ui-autocomplete-item", item);
        };
        $.ui.autocomplete.prototype._renderItem = function (table, item) {
            return $(`<li class="list-group-item"></li>`)
                .append(
                    `<div onclick="openLoginWindow('${item.Url}')" class="small"><span class="font-weight-bold">${item.Name}</span><br>${item.Url}</div>`
                )
                .appendTo($("#schools-table"));
        };
        $("#login-school").autocomplete({
            minLength: 3,
            source: function (request, response) {
                $("#schools-table").html(`<br><center><i class="ml-2 far fa-lg display fa-spinner-third fa-spin"></i></center>`)
                $.ajax({
                    beforeSend: function (request) {
                        request.setRequestHeader("Accept", "application/json;odata=verbose;charset=utf-8");
                    },
                    url: "https://mijn.magister.net/api/schools?filter=" + request.term,
                    dataType: "json",
                    success: function (data) {
                        if (data.length > 0) lastSchools = data, response(data);
                        else if (data.length == 0 && lastSchools.length != 0) response(lastSchools);
                        else $("#schools-table").html(`<br><center>Geen scholen gevonden :(</center>`)
                        $(".snackbar").remove()
                    },
                    error: function (data) {
                        toast("Er kon geen verbinding met Magister gemaakt worden... Tip: check je internetverbinding", false, true);
                    }
                });
            }
        })
        $("#showMore").click(function () {
            $('pre').slideToggle(250, function () {
                $('#showMore > i').toggleClass('fa-chevron-down')
                $('#showMore > i').toggleClass('fa-chevron-up')
            });
        });
    });
});