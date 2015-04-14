var http = require('http');
var request = require('request');
var moment = require("moment");
var crypto = require('crypto');

var apiToken = process.env.API_TOKEN;
var apiSecret = process.env.API_SECRET;
var portal = "icappirio.csod.com";
var userName = "jdouglas";

var generateSession = function(userName, sessionName, callback) {
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
    var session = JSON.parse(body);
    callback(session.data[0]);
  });
}

var getApiSignature = function(url, apiToken, apiSecret, httpVerb, utc) {
  var stringToSign = httpVerb + "\n" + "x-csod-api-key:" + apiToken + "\n" + "x-csod-date:" + utc + "\n" + url;
  return getSignature(apiSecret, stringToSign);
}

var getSignature = function(secretString, stringToSign) {
    return crypto.createHmac('sha512', new Buffer(secretString, 'base64')).update(new Buffer(stringToSign)).digest('base64');
}

var getSessionSignature = function(url, sessionToken, sessionSecret, httpVerb, utc) {
  var stringToSign = httpVerb + "\n" + "x-csod-date:" + utc + "\n" + "x-csod-session-token:" + sessionToken + "\n" + url;
  return getSignature(sessionSecret, stringToSign);
}

var getData = function(session, entity, query, isDW) {

  var verb = "GET";
  var entityUrl = (isDW == true)?"/services/dwdata/" : "/services/data/";

  //need to URL encode spaces in odata query
  var path = entityUrl;
  if(query != null) {
    var find = new RegExp(" ", "g");
    var encodedQuery = query.replace(find, "%20");
    entityUrl += entity;
    var path = (query != null) ? entityUrl + "?" + encodedQuery : entityUrl;
  }

  var utc = moment.utc().format();
  var signature = getSessionSignature(entityUrl, session.Token, session.Secret, verb, utc);

  var options = {
      url: "https://"+portal + entityUrl,
      host: portal,
      port: 443,
      path: path,
      method: verb,
      headers: {
          'x-csod-date': utc,
          'x-csod-session-token': session.Token,
          'x-csod-signature': signature
      }
  };

  request(options, function(error, response, body) {
    if (error) {
      console.log(response.statusCode);
      console.log(error);
    }
    var data = JSON.parse(body);
    console.log('Here is the first record returned from CSOD:');
    console.log(data.value[0]);
  });

  return "TODO -- Return actual data";

}



var requestListener = function (req, res) {

  var sessionName = userName + moment().unix();
  generateSession(userName, sessionName, function(session){
    var results = getData(session, "Transcript", "$select=UserID,TranscriptStatus,TranscriptRegistrationDate", true);
      res.writeHead(200);
      console.log(results);
      res.end("done");
  });

}

var server = http.createServer(requestListener); server.listen(3000);
