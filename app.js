var http = require('http');
var request = require('request');
var moment = require("moment");
var crypto = require('crypto');

var apiToken = 'some token';
var apiSecret = 'some secret';
var portal = "icappirio.csod.com";
var userName = "jdouglas";

var generateSession = function(userName, sessionName) {
  var relativeUrl = "/services/api/sts/GenerateSession/"+userName+"/"+sessionName;
  var url = 'https://' + portal + relativeUrl;
  var utc = moment.utc().format('YYYY-MM-DDTHH:mm:ss.000');
  var signature = getApiSignature(relativeUrl, apiToken, apiSecret, "GET", utc);

  var options = {
      url: url,
      headers: {
          'x-csod-date': utc,
          'x-csod-api-key': apiToken,
          'x-csod-signature': signature
      }
  };

  request(options, function(error, response, body) {

    console.log(response.statusCode); // returning 401
    console.log(error); // return null
    console.log(body); // message: CSOD Unauthorized Exception:Check your credentials.

    return {
      token: "token-from-response",
      secret: "secret-from-response"
    };

  });
}

var getApiSignature = function(url, apiToken, apiSecret, httpVerb, utc) {
  var stringToSign = httpVerb + "\n" + "x-csod-api-key:" + apiToken + "\n" + "x-csod-date:" + utc + "\n" + url;
  return getSignature(apiSecret, stringToSign);
}

var getSignature = function(secretString, stringToSign) {
  return crypto.createHmac('sha512', secretString).update(stringToSign).digest('base64');
}

var getSessionSignature = function(url, sessionToken, sessionSecret, httpVerb, utc) {
  var stringToSign = httpVerb + "\n" + "x-csod-date:" + utc + "\n" + "x-csod-session-token:" + sessionToken + "\n" + url;
  return getSignature(sessionSecret, stringToSign);
}

var getData = function(session, entity, query, isDW) {

  var verb = "GET";
  var entityUrl = "/services/dwdata/"+entity;
  var utc = moment.utc().format();
  var signature = getSessionSignature(entityUrl, apiToken, apiSecret, verb, utc);

  var options = {
      url: "https://icappirio.csod.com" + entityUrl,
      headers: {
          'x-csod-date': utc,
          'x-csod-session-token': sessionToken,
          'x-csod-signature': signature
      }
  };

  console.log(options);

  return "some data";

}



var requestListener = function (req, res) {

  var sessionName = userName + moment().unix();
  var session = generateSession(userName, sessionName);
  //var results = getData(session, "CurrentCompensation", "$select=UserID,CurrentCompaRatio,CurrentSalary", true);

  res.writeHead(200);
  res.end("done");
}

var server = http.createServer(requestListener); server.listen(3000);
