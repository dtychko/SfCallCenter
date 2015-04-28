(function($, app, Urls) {

    // SIP
    var popup;

    app.SIP = {
        init: function(fn, failed) {
            popup = window.open("", "Popup", "width=400,height=500");

            // Pop-ups are not allowed
            if (!popup) {
                failed();
                return;
            }

            if (popup.location.href === "about:blank") {
                popup.close();
                popup = window.open(Urls.popup, "Popup", "width=400,height=500");
                popup.onload = function () {
                    fn();
                    //popup.onunload = function () {
                    //};
                };
            } else {
                fn();
                //popup.onunload = function () {
                //};
            }

            window.focus();
        },
        connect: function(sipData) {
            popup.connect(sipData);
        },
        connection: function() {
            return popup.getConnection();
        },
        disconnect: function() {
            popup.kill();
        }
    };


    // Sounds
    try {
        var ringtone = new Audio(Urls.ringtone);
        var backtone = new Audio(Urls.ringbacktone);
        var dtmf = new Audio(Urls.dtmf);
    } catch(e) {
        
    }

    app.Sounds = {
        playRingtone: function () {
            try {
                ringtone.play();
            } catch (e) {
            } 
        },
        playBacktone: function() {
            try {
                backtone.play();
            } catch (e) {
            }
        },
        playDtmf: function() {
            try {
                dtmf.play();
            } catch (e) {
            }
        }
    };


    // Auth
    app.Auth = {
        signIn: function (login, pass) {
            var postData = {
                login: login,
                password: pass,
                format: 'json'
            };
            return ajaxRequest("post", Urls.auth, postData);
        }
    };

    function ajaxRequest(type, url, data, dataType) {
        //var options = {
        //    dataType: dataType || "json",
        //    contentType: "application/json",
        //    cache: false,
        //    type: type,
        //    data: data ? JSON.stringify(data) : null
        //};
        var options = {
            dataType: dataType || "json",
            cache: false,
            type: type,
            data: data ? data : null
        };
        return $.ajax(url, options);
    }


    // Storage
    var SIP_DATA_STORAGE_NAMESPACE = "callcenter.softphone.sipdata";
    var KEYPAD_VISIBLE_STORAGE_NAMESPACE = "callcenter.softphone.keypadvisible";

    app.Storage = {
        sipData: function (value) {
            if (arguments.length > 0) {
                localStorage.setItem(SIP_DATA_STORAGE_NAMESPACE, JSON.stringify(value));
            } else {
                var data = localStorage.getItem(SIP_DATA_STORAGE_NAMESPACE);
                return data && JSON.parse(data);
            }
        },
        keypadVisible: function(value) {
            if (arguments.length > 0) {
                localStorage.setItem(KEYPAD_VISIBLE_STORAGE_NAMESPACE, JSON.stringify(value));
            } else {
                var data = localStorage.getItem(KEYPAD_VISIBLE_STORAGE_NAMESPACE);
                return data && JSON.parse(data);
            }
        }
    };


    // SalesForce
    app.SF = {
        clickToDial: function(enable) {
            if (enable) {
                sforce.interaction.cti.enableClickToDial();
            } else {
                sforce.interaction.cti.disableClickToDial();
            }
        },
        onClickToDial: function(callback) {
            sforce.interaction.cti.onClickToDial(function(response) {
                var result = JSON.parse(response.result);
                callback(normalizeNumber(result.number));
            });
        },
        screenPop: function(url, force, callback) {
            sforce.interaction.screenPop(url, force, callback);
        },
        searchAndGetScreenPopUrl: function(searchParams, queryParams, callType, callback) {
            sforce.interaction.searchAndGetScreenPopUrl(searchParams, queryParams, callType, callback);
        },
        searchContactAndGetScreenPopUrl: function(searchParams, callback) {
            app.SF.searchAndGetScreenPopUrl(searchParams, null, 'inbound', callback);
        },
        adjustSize: function (force) {
            if (force) {
                adjust();
            } else {
                setTimeout(adjust, 0);
            }
                
            function adjust() {
                var height = $("#phone").height();
                sforce.interaction.cti.setSoftphoneHeight(height + 10);
            }
        },
        saveLog: function (params) {
            var currentDate = params.date;
            var currentDay = currentDate.getDate();
            var currentMonth = currentDate.getMonth() + 1;
            var currentYear = currentDate.getFullYear();
            var timeStamp = currentDate.toString();
            timeStamp = timeStamp.substring(0, timeStamp.lastIndexOf(':') + 3);
            var dueDate = currentYear + '-' + currentMonth + '-' + currentDay;
            var saveParams = "Subject=" + "Call on " + timeStamp;
            saveParams += '&Status=' + params.status;
            saveParams += '&CallType=' + params.callType;
            saveParams += '&Activitydate=' + dueDate;
            saveParams += '&CallObject=' + currentDate.getTime();
            saveParams += '&Phone=' + params.number;
            //saveParams += '&Description=' + callLogText.value;
            //var callDisposition = getSelectedCallDisposition();
            //if (callDisposition) {
            //    saveParams += '&CallDisposition=' + callDisposition.value;
            //}
            saveParams += '&CallDurationInSeconds=' + params.duration;
            if (params.whoId) {
                saveParams += '&WhoId=' + params.whoId;
            } else {
                //saveParams += '&WhatId=' + params.whatId;
                saveParams += '&WhoId=' + params.whatId;
            }

            sforce.interaction.saveLog('Task', saveParams, function (response) {
                var result = response.result;
                var error = response.error;
                //alert("result=" + result + " ;error=" + error);
            });
        },
        pageObjectId: function (fn) {

            function callback(response) {
                var result = JSON.parse(response.result);
                if (result.objectId.substr(0, 3) == '003') {
                    fn({
                        objectId: result.objectId,
                        whoId: result.objectId
                    });
                } else {
                    fn({
                        objectId: result.objectId,
                        whatId: result.objectId
                    });
                }
            }

            sforce.interaction.getPageInfo(callback);
        }
    };
    
    function normalizeNumber(number) {
        return number.replace("+", "").replace(" ", "").replace("(", "").replace(")", "").replace("-", "");
    }

})($, window.app = window.app || {}, app.Urls);