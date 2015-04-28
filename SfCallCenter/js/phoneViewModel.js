(function(ko, app, Storage, SF, Connection, CallViewModel, Sounds) {

    app.PhoneViewModel = function(sipData) {
        var self = this;

        this.connection = ko.observable();
        this.number = ko.observable("");
        this.userName = ko.observable(sipData.callerid);
        this.call = ko.observable().onChanged(SF.adjustSize);
        this.canCall = ko.computed(function() {
            var can = self.connection() && self.connection().connected() &&
                (!self.call() || !self.call().active());
            SF.clickToDial(can);
            return can;
        }).onChanged(SF.adjustSize);
        this.keypadVisible = ko.observable(Storage.keypadVisible() || false).onChanged(SF.adjustSize);

        this.press = function(symbol) {
            if (self.canCall()) {
                Sounds.playDtmf();
                self.number(self.number() + symbol);
            }
        },
        this.backspace = function() {
            if (self.canCall()) {
                var number = self.number();
                self.number(number.slice(0, number.length - 1));
            }
        },
        this.toggleKeypad = function() {
            self.keypadVisible(!self.keypadVisible());
            Storage.keypadVisible(self.keypadVisible());
        };
        this.startCall = function () {
            self.connection().startCall(self.number());
        },
        this.callNumber = function(number) {
            if (self.canCall()) {
                self.number(number);
                self.startCall();
            }
        },
        this.hideCall = function() {
            if (self.call() && !self.call().active()) {
                self.call(null);
                SF.adjustSize();
            }
        };
        this.destroy = function () {
            if (self.call()) {
                self.call().destroy();
            }
            if (self.connection()) {
                self.connection().destroy();
            }
        };

        init();

        function init() {
            self.connection(new Connection(sipData, onInbound, onOutbound));
            
            if (self.connection().hasActiveCall()) {
                self.call(new CallViewModel());
            }
        }
        function onInbound() {
            Sounds.playRingtone();
            self.call(new CallViewModel(true));
        }
        function onOutbound() {
            Sounds.playBacktone();
            self.call(new CallViewModel(true));
        }
    };

})(ko, app, app.Storage, app.SF, app.Connection, app.CallViewModel, app.Sounds);