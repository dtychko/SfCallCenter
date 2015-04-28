(function(ko, app, Storage, SignInFormViewModel, PhoneViewModel, SF, SIP) {

    app.App = function(popupBlocked) {
        var self = this;

        this.popupBlocked = popupBlocked;
        this.phone = ko.observable().onChanged(SF.adjustSize);
        this.signInForm = ko.observable().onChanged(SF.adjustSize);;

        this.signIn = function() {
            self.signInForm(new SignInFormViewModel());
        };
        this.showPhone = function() {
            SIP.connect(Storage.sipData());
            self.signInForm(null);
            self.phone(new PhoneViewModel(Storage.sipData()));
        };
        this.signOut = function () {
            SIP.disconnect();
            Storage.sipData(null);
            self.phone().destroy();
            self.phone(null);
            self.signInForm(new SignInFormViewModel());
        };

        init();
        
        function init() {
            SF.adjustSize();
            
            if (popupBlocked) {
                return;
            }

            if (Storage.sipData()) {
                self.showPhone();
            } else {
                self.signIn();
                SF.clickToDial(false);
            }

            SF.onClickToDial(function (number) {
                if (self.phone()) {
                    self.phone().callNumber(number);
                }
            });

            //SF.adjustSize();

            //window.onbeforeunload = function() {
            //    if (self.phone() && self.phone().onCall()) {
            //        return "Your call session will be terminated if you leave this page.";
            //    }
            //    return null;
            //};
            window.onunload = function () {
                if (self.phone()) {
                    self.phone().destroy();
                }
            };
        }
    };

})(ko, app, app.Storage, app.SignInFormViewModel, app.PhoneViewModel, app.SF, app.SIP);