(function(ko, app, Auth, Storage, SF) {

    app.SignInFormViewModel = function() {
        var self = this;

        this.login = ko.observable();
        this.pass = ko.observable();
        this.errorMessage = ko.observable().onChanged(SF.adjustSize);
        this.trying = ko.observable(false);

        this.signIn = function() {
            self.trying(true);
            Auth.signIn(self.login(), self.pass())
                .done(onDone)
                .then(onThen)
                .fail(onFail);

            function onDone() {
                self.trying(false);
            }

            function onThen(sipData) {
                if (sipData.errorStatus) {
                    self.errorMessage(sipData.errorMessage);
                } else {
                    Storage.sipData(sipData);
                    
                    // changing current application state
                    app.current.showPhone();
                }
            }

            function onFail() {
                self.errorMessage("Sign in failed");
            }
        };
    };

})(ko, app, app.Auth, app.Storage, app.SF);