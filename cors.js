//****** class definition
var cors = {
  /*** props ***/
  enabled: true,
  activationWhitelistEnabled: false,
  transactions: {}, // contains requests/responses

  /*** init ***/
  init: function () {

      // clear transactions
      cors.transactions = {};

      // add observer, observe http responses
      chrome.webRequest.onBeforeSendHeaders.addListener(
        cors.requestHandler,
        { urls: ["<all_urls>"] },
        ["blocking", "requestHeaders"]
      );

      chrome.webRequest.onHeadersReceived.addListener(
        cors.responseHandler,
        { urls: ["<all_urls>"] },
        ["blocking", "responseHeaders"]
      );

    return this;
  },

  /*** requestHandler ***/
  requestHandler: function (request) {
    // prepare transaction, store transaction request
    let transaction = {
      request: request,
      requestHeaders: {},
      response: {},
      responseHeaders: {},
    };

    // shorthand access to request headers
    for (let header of request.requestHeaders) {
      transaction.requestHeaders[header.name.toLowerCase()] = header;
    }

    // store transaction
    cors.transactions[request.requestId] = transaction;

    // apply modifications
    return {
      requestHeaders: transaction.request.requestHeaders,
    };
  },

  /*** responseHandler ***/
  responseHandler: function (response) {
    // get transaction
    let transaction = cors.transactions[response.requestId];

    // processing flag
    let doProcess = true;

    // modify the headers
    if (doProcess) {
      // store transaction response
      transaction.response = response;

      // shorthand access to response headers
      for (let header of response.responseHeaders) {
        transaction.responseHeaders[header.name.toLowerCase()] = header;
      }

      // create response headers if necessary
      for (let name of [
        "access-control-allow-origin",
        "access-control-allow-methods",
        "access-control-allow-headers",
        "access-control-allow-credentials",
      ]) {
        // header exists, skip
        if (transaction.responseHeaders[name]) {
          continue;
        }

        // create header
        let header = {
          name: name,
          value: "null",
        };

        // update response
        transaction.response.responseHeaders.push(header);

        // update shorthand
        transaction.responseHeaders[name] = header;
      }

      // set "access-control-allow-origin", prioritize "origin" else "*"
      transaction.responseHeaders["access-control-allow-origin"].value =
        transaction.requestHeaders["origin"] &&
        transaction.requestHeaders["origin"].value !== null
          ? transaction.requestHeaders["origin"].value
          : "*";

      // set "access-control-allow-methods"
      if (
        transaction.requestHeaders["access-control-request-method"] &&
        transaction.requestHeaders["access-control-request-method"].value !==
          null
      ) {
        transaction.responseHeaders["access-control-allow-methods"].value =
          transaction.requestHeaders["access-control-request-method"].value;
      }

      // set "access-control-allow-headers"
      if (
        transaction.requestHeaders["access-control-request-headers"] &&
        transaction.requestHeaders["access-control-request-headers"].value !==
          null
      ) {
        transaction.responseHeaders["access-control-allow-headers"].value =
          transaction.requestHeaders["access-control-request-headers"].value;
      }

      // set "access-control-allow-credentials"
      transaction.responseHeaders["access-control-allow-credentials"].value =
        "true";
    }

    // delete transaction
    delete cors.transactions[response.requestId];

    // return headers
    return {
      responseHeaders: transaction.response.responseHeaders,
    };
  },
};

//****** run
var bg = cors.init();