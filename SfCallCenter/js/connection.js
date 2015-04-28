(function(ko, app, SIP, SF) {

    app.Connection = function(sipData, inboundCallback, outboundCallback) {
        var self = this;
        var connection = SIP.connection();

        this.status = ko.observable("").onChanged(SF.adjustSize);
        this.connecting = ko.observable(false).onChanged(SF.adjustSize);
        this.connected = ko.observable(false).onChanged(SF.adjustSize);

        this.startCall = function (number) {
            connection.call(number);
        };
        this.hasActiveCall = function () {
            return !!connection.session;
        };
        this.destroy = function () {
            detachEvents();
        };

        init();

        function init() {
            attachEvents();

            self.status(connection.status);
            self.connecting(connection.connecting);
            self.connected(connection.connected);
        }
        function attachEvents() {
            connection.on("status", onStatus);
            connection.on("connecting", onConnecting);
            connection.on("connected", onConnected);
            connection.on("inbound", onInbound);
            connection.on("outbound", onOutbound);
        }
        function detachEvents() {
            connection.off("status", onStatus);
            connection.off("connecting", onConnecting);
            connection.off("connected", onConnected);
            connection.off("inbound", onInbound);
            connection.off("outbound", onOutbound);
        }
        function onStatus() {
            self.status(connection.status);
        }
        function onConnecting() {
            self.connecting(connection.connecting);
        }
        function onConnected() {
            self.connected(connection.connected);
        }
        function onInbound() {
            inboundCallback();
        }
        function onOutbound() {
            outboundCallback();
        }
    };

})(ko, app, app.SIP, app.SF);