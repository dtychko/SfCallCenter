(function($, ko, app, App, SIP, SF) {

    ko.subscribable.fn.onChanged = function (fn) {
        var self = this;
        var lastValue = this();
        this.subscribe(function () {
            if (self() !== lastValue) {
                lastValue = self();
                fn();
            }
        });
        return this;
    };

    $(function () {

        SIP.init(function() {
            app.current = new App();
            ko.applyBindings(app.current);
        }, function () {
            app.current = new App(true);
            ko.applyBindings(app.current);
        });
    });

})($, ko, app, app.App, app.SIP, app.SF);