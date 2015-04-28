/**
* Interaction API.
* Version 28.0
*/
window.sforce = window.sforce || {};

sforce.interaction = (function () {
    var apiVersion = 28;
    var INTERACTION_API = 'interactionApi/';
    var ENTITY_FEED_API = 'entityFeedApi/';
    var frameOrigin = null;
    var nonce = null;
    var callbacks = {};
    var GET_CALL_CENTER_SETTINGS = 'getCallCenterSettings';
    var GET_SOFTPHONE_LAYOUT = 'getSoftphoneLayout';
    var GET_PAGE_INFO = 'getPageInfo';
    var SET_SOFTPHONE_HEIGHT = 'setSoftphoneHeight';
    var SET_SOFTPHONE_WIDTH = 'setSoftphoneWidth';
    var IS_IN_CONSOLE = 'isInConsole';
    var SCREEN_POP = 'screenPop';
    var SEARCH_AND_GET_SCREEN_POP_URL = 'searchAndGetScreenPopUrl';
    var SEARCH_AND_SCREEN_POP = 'searchAndScreenPop';
    var ENABLE_CLICK_TO_DIAL = 'enableClickToDial';
    var DISABLE_CLICK_TO_DIAL = 'disableClickToDial';
    var RUN_APEX_QUERY = 'runApex';
    var SAVE_LOG = 'saveLog';
    var SET_VISIBLE = 'setVisible';
    var IS_VISIBLE = 'isVisible';
    var CONNECT = 'connect';
    var REFRESH_OBJECT = 'refreshObject';
    var REFRESH_PAGE = 'refreshPage';
    var REFRESH_RELATED_LIST = 'refreshRelatedList';
    var listeners = { onClickToDial: 'onClickToDial', onFocus: 'onFocus', onObjectUpdate: 'onObjectUpdate' };
    var methodId = 0;
    var entityFeedApi = null;

    function isApiMessage(event, apiEndPoint) {
        return event.data && event.data.indexOf(apiEndPoint) === 0;
    }

    /**
     * Process messages received from SFDC by executing callbacks, if any.
     * The event object contains the following fields:
     *      method: the API method that was called.
     *      result: result returned from the call.
     *      error: an error message if any errors were encountered.
     */
    function processPostMessage(event) {
        var params;
        try {
            // Check if call is for entity feed
            if (isApiMessage(event, ENTITY_FEED_API)) {
                if (entityFeedApi && entityFeedApi.processPostMessage) {
                    params = entityFeedApi.processPostMessage(event);
                }
                if (!params) {
                    return;
                }
            } else if (isApiMessage(event, INTERACTION_API)) {
                if (event.origin !== frameOrigin || !frameOrigin) {
                    // Only trust messages from the adapter frame
                    return;
                }

                var message = event.data.replace(INTERACTION_API, ''); // strip off API target
                params = parseUrlQueryString(message);

                // convert string true/false to boolean for methods that needs to return boolean values.
                if (params && (params.result === 'true' || params.result === 'false')) {
                    params.result = params.result === 'true';
                }
            } else {
                // return if postMessage is not targeted to interaction API
                return;
            }

            // execute callbacks registered for the method called
            for (var methodName in callbacks) {
                if (callbacks.hasOwnProperty(methodName)) {
                    if (params.method === methodName) {
                        for (var i in callbacks[methodName]) {
                            callbacks[methodName][i](params);
                        }
                        if (!listeners[methodName]) {
                            delete callbacks[methodName];
                        }
                    }
                }
            }
        } catch (e) {
            consoleLog("Failed to process API response.");
        }
    }

    /**
     * Makes an API call to SFDC domain.
     */
    function doPostMessage(params, callback) {
        if (callback) {
            params.method = registerCallback(params.method, callback);
        }

        // add nonce to params
        params.nonce = nonce;

        // add version
        params.apiVersion = apiVersion;

        if (frameOrigin) {
            window.parent.postMessage(INTERACTION_API + buildQueryString(params), frameOrigin);
        }
    }

    function registerCallback(method, callback) {
        if (listeners[method]) {
            if (callbacks[method]) {
                callbacks[method].push(callback);
            } else {
                callbacks[method] = [callback];
            }
        } else {
            // API methods that are not listeners needs an ID in case they are call multiple times in an async manner.
            method += '_' + methodId;
            callbacks[method] = [callback];
            methodId++;
        }
        return method;
    }

    /**
     * Utility method to create a query string object.
     */
    function parseUrlQueryString(queryString) {
        var params = {};
        if (typeof queryString !== 'string') {
            return params;
        }

        if (queryString.charAt(0) === '?') {
            queryString = queryString.slice(1);
        }

        if (queryString.length === 0) {
            return params;
        }

        var pairs = queryString.split('&');
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split('=');
            params[pair[0]] = !!pair[1] ? decodeURIComponent(pair[1]) : null;
        }

        return params;
    }

    /**
     * Utility method to build a query string from key/value object.
     */
    function buildQueryString(params) {
        var qs = '';
        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                qs += key + '=' + encodeURIComponent(params[key]) + '&';
            }
        }
        qs = qs.length > 0 ? qs.substr(0, qs.length - 1) : qs;
        return qs;
    }

    function consoleLog(message) {
        if (window.console && console.log) {
            console.log(message);
        }
    }

    function jsonStringify(object) {
        if (typeof Sfdc !== "undefined" && Sfdc.JSON) {
            return Sfdc.JSON.stringify(object);
        } else {
            return JSON.stringify(object);
        }
    }

    function jsonParse(json) {
        if (typeof Sfdc !== "undefined" && Sfdc.JSON) {
            return Sfdc.JSON.parse(json);
        } else {
            return JSON.parse(json);
        }
    }

    /**
    * Entity Feed API implementation.
    */
    function EntityFeedApi(params) {
        var that = this;
        var nonce = null;
        var apiFrame;
        var apiOrigin;
        var readyQueue = [];
        this.processPostMessage;

        function processApiResponse(event) {
            return decodeMessage(event);
        }

        function decodeMessage(event) {
            if (isApiMessage(event, ENTITY_FEED_API)) {
                // Decode message and check authenticity
                var wrapper = jsonParse(event.data.substr(ENTITY_FEED_API.length));

                if (wrapper.message.fromApi && wrapper.nonce === nonce) {
                    return wrapper.message;
                }
            }
            return null;
        }

        function doPostMessage(frames, targetOrigin, message, callback, connect) {
            if (!nonce) {
                consoleLog("API is not supported in this configuration.");
                return;
            }

            // Register callback if any
            if (callback) {
                message.method = registerCallback(message.method, callback);
            }

            // Encode message
            message.toApi = true;
            message.version = apiVersion;
            var messageContainer = { message: message, sourceFrameName: window.name };
            if (connect) {
                messageContainer.connect = true;
            } else {
                messageContainer.nonce = nonce;
            }
            var postData = ENTITY_FEED_API + jsonStringify(messageContainer);

            for (var i = 0, len = frames.length; i < len; i++) {
                frames[i].postMessage(postData, targetOrigin);
            }
        }

        this.callApi = function (message, callback) {
            if (apiFrame) {
                doPostMessage([apiFrame], apiOrigin, message, callback, false);
            } else {
                readyQueue.push(function () {
                    that.callApi(message, callback);
                });
            }
        };

        function initialize() {
            nonce = params.entityFeedNonce;

            that.processPostMessage = function (event) {
                var message = decodeMessage(event);
                if (message != null && message.method === CONNECT) {
                    apiFrame = event.source;
                    apiOrigin = event.origin;
                    that.processPostMessage = processApiResponse;

                    for (var i = 0, len = readyQueue.length; i < len; i++) {
                        readyQueue[i]();
                    }
                    readyQueue = null;
                }
            };

            var loadHandler = function () {
                // Remove load handler
                if (window.removeEventListener) {
                    window.removeEventListener("load", arguments.callee, false);
                } else if (window.detachEvent) {
                    window.detachEvent("onload", arguments.callee);
                }

                // Search for api connection point.
                var frames = [];
                // Connect to current frame if api is available
                if (typeof entityFeedPage != "undefined") {
                    frames.push(window);
                } else {
                    // Attach to parent if VF custom publisher
                    frames.push(window.parent);

                    // Attach to siblings for console frames
                    for (var parentFrames = window.parent.frames, i = 0, len = parentFrames.length; i < len; i++) {
                        if (parentFrames[i] !== window.self) {
                            frames.push(parentFrames[i]);
                        }
                    }
                }
                // call frames to connect
                doPostMessage(frames, '*', { method: CONNECT }, null, true);
            };

            if (window.addEventListener) {
                window.addEventListener("load", loadHandler, false);
            } else if (window.attachEvent) {
                window.attachEvent("onload", loadHandler);
            }
        };
        initialize();
    }

    return {

        /**
         * Initializes API to listen for responses from SFDC.
         */
        initialize: function () {
            // set sfdc frame origin and nonce needed to call API methods
            var params = parseUrlQueryString(location.search);

            // initialize if sfdcIFrameOrigin and nonce are present
            if (params['sfdcIFrameOrigin'] && params['nonce']) {
                frameOrigin = params['sfdcIFrameOrigin'];
                nonce = params['nonce'];
            }

            // initialize entity feed api
            if (!entityFeedApi && params.entityFeedNonce && typeof window.postMessage !== "undefined") {
                entityFeedApi = new EntityFeedApi(params);
            }

            if (frameOrigin || entityFeedApi) {
                // attach postMessage event to handler
                if (window.attachEvent) {
                    window.attachEvent('onmessage', processPostMessage);
                } else {
                    window.addEventListener('message', processPostMessage, false);
                }
            }
        },

        /**
         * Returns true if is in console, false otherwise
         */
        isInConsole: function (callback) {
            doPostMessage({ method: IS_IN_CONSOLE }, callback);
        },

        /**
         * Screen pops to targetUrl and returns true if screen pop was successfully called, false otherwise.
         * Parameter force must be a boolean. Set this value to true to force screen pop, i.e.: to force screen pop on an edit page.
         */
        screenPop: function (targetUrl, force, callback) {
            doPostMessage({ method: SCREEN_POP, targetUrl: targetUrl, force: !!force }, callback);
        },

        searchAndGetScreenPopUrl: function (searchParams, queryParams, callType, callback) {
            doPostMessage({ method: SEARCH_AND_GET_SCREEN_POP_URL, searchParams: searchParams, queryParams: queryParams, callType: callType }, callback);
        },

        searchAndScreenPop: function (searchParams, queryParams, callType, callback) {
            doPostMessage({ method: SEARCH_AND_SCREEN_POP, searchParams: searchParams, queryParams: queryParams, callType: callType }, callback);
        },

        /**
         * Returns the current page info parameters: page Url, object Id (if applicable), object Name (if applicable), object (if applicable) as a JSON String.
         */
        getPageInfo: function (callback) {
            doPostMessage({ method: GET_PAGE_INFO }, callback);
        },

        /**
         * Registers a callback to be fired when the page gets focused.
         * When the callback is fired, it returns the current page info parameters: page Url, entity Id (if applicable), entity Name (if applicable) as a JSON String.
         */
        onFocus: function (callback) {
            doPostMessage({ method: listeners.onFocus }, callback);
        },

        /**
         * Save object to database and return true if object was saved successfully, false otherwise.
         * objectName is the API name of an object
         * saveParams is a query string representing a key-value pair of object fields to save.
         * Example:
         *      // to save a new record
         *      sforce.interaction.saveLog('Account', 'Name=Acme&Phone=4152125555', callback);
         *      // to update a new record
         *      sforce.interaction.saveLog('Account', 'Id=001D000000J6qIX&Name=UpdatedAcmeName', callback);
         */
        saveLog: function (objectName, saveParams, callback) {
            doPostMessage({ method: SAVE_LOG, objectName: objectName, saveParams: encodeURIComponent(saveParams) }, callback);
        },

        /**
         * Runs an Apex method from a class with supplied parameters.
         */
        runApex: function (apexClass, methodName, methodParams, callback) {
            doPostMessage({ method: RUN_APEX_QUERY, apexClass: apexClass, methodName: methodName, methodParams: methodParams }, callback);
        },

        /**
         * Returns true if widget was successfully shown or hidden, false otherwise.
         * Parameter value must be a boolean.
         * Parameter callback must be a function.
         * If false is returned, an error message is also returned.
         */
        setVisible: function (value, callback) {
            doPostMessage({ method: SET_VISIBLE, value: value }, callback);
        },

        /**
         * Returns true if widget is visible, false otherwise.
         */
        isVisible: function (callback) {
            doPostMessage({ method: IS_VISIBLE }, callback);
        },

        /**
         * Returns true if page refresh is invoked, false otherwise.
         */
        refreshPage: function (callback) {
            doPostMessage({ method: REFRESH_PAGE }, callback);
        },

        /**
         * Returns true if the related list with the given name is refreshed, false otherwise.
         */
        refreshRelatedList: function (listName, callback) {
            doPostMessage({ method: REFRESH_RELATED_LIST, listName: listName }, callback);
        },

        cti: {
            /**
             * Gets Call Center Settings.
             */
            getCallCenterSettings: function (callback) {
                doPostMessage({ method: GET_CALL_CENTER_SETTINGS }, callback);
            },

            /**
             * Gets Softphone Layout.
             */
            getSoftphoneLayout: function (callback) {
                doPostMessage({ method: GET_SOFTPHONE_LAYOUT }, callback);
            },

            /**
             * Sets softphone height. Height must be greater or equal than zero
             */
            setSoftphoneHeight: function (height, callback) {
                doPostMessage({ method: SET_SOFTPHONE_HEIGHT, height: height }, callback);
            },

            /**
             * Sets softphone width. Width must be greater or equal than zero.
             */
            setSoftphoneWidth: function (width, callback) {
                doPostMessage({ method: SET_SOFTPHONE_WIDTH, width: width }, callback);
            },

            /**
             * Enables click to dial.
             */
            enableClickToDial: function (callback) {
                doPostMessage({ method: ENABLE_CLICK_TO_DIAL }, callback);
            },

            /**
             * Disables click to dial.
             */
            disableClickToDial: function (callback) {
                doPostMessage({ method: DISABLE_CLICK_TO_DIAL }, callback);
            },

            /**
             * Registers callback to be fired when user clicks to dial.
             */
            onClickToDial: function (callback) {
                doPostMessage({ method: listeners.onClickToDial }, callback);
            }
        },

        /**
         * Public API for Entity feed
         */
        entityFeed: {
            /**
             * Notifies that the object has been updated and its display need to be refreshed
             */
            refreshObject: function (objectId, refreshFields, refreshRelatedLists, refreshFeed, callback) {
                entityFeedApi && entityFeedApi.callApi({ method: REFRESH_OBJECT, objectId: objectId, refreshFields: refreshFields, refreshRelatedLists: refreshRelatedLists, refreshFeed: refreshFeed }, callback);
            },

            /**
             * Registers a callback to be fired when the object has been updated.
             */
            onObjectUpdate: function (callback) {
                entityFeedApi && entityFeedApi.callApi({ method: listeners.onObjectUpdate }, callback);
            }
        }
    };
})();

sforce.interaction.initialize();