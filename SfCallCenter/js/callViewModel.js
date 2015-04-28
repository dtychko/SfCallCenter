(function(ko, app, Sounds, SIP, SF) {

    function ContactViewModel(url, name) {
        var self = this;

        this.name = name;
        this.url = url;

        this.open = function() {
            SF.screenPop(self.url, true);
        };
    }

    app.CallViewModel = function(newCall) {
        var self = this;

        var session = SIP.connection().session;
        var direction = session.direction;

        this.contacts = ko.observable().onChanged(SF.adjustSize);
        this.active = ko.observable(false).onChanged(SF.adjustSize);
        this.inProgress = ko.observable(false).onChanged(SF.adjustSize);
        this.duration = ko.observable(0);
        this.number = ko.observable(session.number);
        this.status = ko.observable("");
        this.durationMinutes = ko.computed(function() {
            var minutes = Math.floor(self.duration() / 60);
            return minutes < 10 ? "0" + minutes : minutes;
        });
        this.durationSeconds = ko.computed(function() {
            var seconds = self.duration() % 60;
            return seconds < 10 ? "0" + seconds : seconds;
        });
        this.displayDuration = ko.computed(function () {
            return self.durationMinutes() + ':' + self.durationSeconds();
        }).onChanged(SF.adjustSize);
        this.canAccept = ko.computed(function () {
            return direction == "in" && self.active() && !self.inProgress();
        }).onChanged(SF.adjustSize);
        this.canHangUp = ko.computed(function() {
            return self.inProgress() ||
                direction == "out" && self.active();
        }).onChanged(SF.adjustSize);
        this.durationVisible = ko.computed(function() {
            return !self.active() || self.inProgress();
        }).onChanged(SF.adjustSize);
        this.contactsVisible = ko.computed(function() {
            return self.contacts();
        }).onChanged(SF.adjustSize);

        this.accept = function() {
            if (self.active()) {
                self.active(true);
                self.inProgress(true);
                session.answer();
            }
        };
        this.hangUp = function() {
            if (self.active()) {
                self.active(false);
                self.inProgress(false);
                session.terminate();
            }
        };
        this.destroy = function () {
            detachEvents();
        };

        init();

        function init() {

            if (direction == "in") {
                if (newCall) {
                    lookupContacts();
                } else {
                    restoreContacts();
                }
            }

            attachEvents();

            self.direction = session.direction;
            self.status(session.status);
            self.active(session.active);
            self.inProgress(session.inProgress);

            if (session.inProgress) {
                startDurationTimer(session.answerTime);
            }
        }
        function attachEvents() {
            session.on("status", onStatus);
            session.on("active", onActive);
            session.on("inprogress", onInProgress);
            session.on("end", onEnd);
        }
        function detachEvents() {
            session.off("status", onStatus);
            session.off("active", onActive);
            session.off("inprogress", onInProgress);
            session.off("end", onEnd);
        }
        function onStatus() {
            self.status(session.status);
        }
        function onActive() {
            self.active(session.active);
        }
        function onInProgress() {
            self.inProgress(session.inProgress);

            if (session.inProgress) {
                startDurationTimer(session.answerTime);
            }
        }
        function onEnd() {
            logCall();
            self.destroy();
        }
        function lookupContacts() {
            function callback(response) {
                if (response.result) {
                    var res = JSON.parse(response.result);
                    var entries = [];

                    for (var p in res) {
                        if (p !== "screenPopUrl" && res[p].object == "Contact") {
                            res[p].url = p;
                            entries.push(res[p]);
                        }
                    }

                    if (entries.length > 0) {
                        session.contacts = entries;
                        var contacts = $.map(entries, function (entry) {
                            return new ContactViewModel(entry.url, entry.Name);
                        });
                        self.contacts(contacts);
                        
                        if (entries.length == 1) {
                            SF.screenPop(entries[0].url, true);
                        }
                    }
                }
            }

            SF.searchContactAndGetScreenPopUrl(self.number(), callback);
        }
        function restoreContacts() {
            if (session.contacts && session.contacts.length > 0) {
                var contacts = $.map(session.contacts, function (entry) {
                    return new ContactViewModel(entry.url, entry.Name);
                });
                self.contacts(contacts);
            }
        }
        function startDurationTimer(callStartTime) {
            tick();

            function tick() {
                if (!self.inProgress()) {
                    return;
                }

                var now = new Date().getTime();
                var elapsedSeconds = (now - callStartTime) / 1000;
                self.duration(Math.floor(elapsedSeconds));

                setTimeout(tick, 1000 * (1 - (elapsedSeconds - Math.floor(elapsedSeconds))));
            }
        }

        function logCall() {
            var params = {
                date: new Date(),
                callType: direction == "in" ? "Inbound" : "Outbound",
                number: self.number(),
                duration: self.duration(),
                status: "completed"
            };
            
            SF.pageObjectId(function (result) {
                if (result.whoId) {
                    params.whoId = result.whoId;
                } else {
                    params.whatId = result.whatId;
                }
                SF.saveLog(params);
            });
        }
    };

})(ko, app, app.Sounds, app.SIP, app.SF);