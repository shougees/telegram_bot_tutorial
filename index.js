var Bot = require('node-telegram-bot-api')
var watson = require('watson-developer-cloud');
var requests = require('request');
var Q = require('Q');
var request = Q.denodeify(require("request"));
//var config = require('./config');

var speech_to_text = watson.speech_to_text({
  username: 'f94d32b9-8108-4eeb-828d-f2a296c225be', //config.watson.username,
  password: 'dpsC46AvPkCZ', //config.watson.password,
  version: 'v1',
  url: 'https://stream.watsonplatform.net/speech-to-text/api'
});

var params = {
  content_type: 'audio/ogg;codecs=opus',
  continuous: true,
  interim_results: false
};

var bot = new Bot('143721453:AAFtAIQH_jV4QSJiYen0NBlGFPEz9UOGamk', { polling: true });

bot.on('message', function (msg) {
	if(msg['voice']){ return onVoiceMessage(msg); }
});

//matches /start
bot.onText(/\/start/, function(msg, match) {
  var fromId = msg.from.id; // get the id, of who is sending the message
  var message = "Welcome to your WeatherBot\n"
  message += "Get wewather update by sending /weather [your_city] command."
  bot.sendMessage(fromId, message);
});

// match /weather [whatever]
bot.onText(/\/weather (.+)/, function (msg, match) {
  var fromId = msg.from.id; // get the id, of who is sending the message
  var postcode = match[1];
  getWeatherData(postcode)
  .then(function(data){
    var message = "Weather today in "+postcode+"\n";
    message += data.wx_desc+"\n"
    message += "temp: "+data.temp_c+"C or "+data.temp_f+"F"
    bot.sendMessage(fromId, message);
  });
});

function getWeatherData(postcode) {
  var app_id = 'aee70ab6'
  var app_key = 'f25d61e4b1ee035c4d6a7ab06a8ab7a7'
  var url = "http://api.weatherunlocked.com/api/current/us."+postcode
  url += "?app_id="+app_id+"&app_key="+app_key

  var options = {
    url: url,
    method: "GET",
    json: true,
  }
  var response = request(options);
  return response.then(function (r) {
    return r[0].body
  })
}

function onVoiceMessage(msg){
  var chatId = msg.chat.id;
  bot.getFileLink(msg.voice.file_id).then(function(link){
  	//setup new recognizer stream
  	var recognizeStream = speech_to_text.createRecognizeStream(params);
	  recognizeStream.setEncoding('utf8');
  	recognizeStream.on('results', function(data){
  		if(data && data.results && data.results.length>0 && data.results[0].alternatives && data.results[0].alternatives.length>0){
  			var result = data.results[0].alternatives[0].transcript;
  			console.log("result: ", result);
  			//send speech recognizer result back to chat
  			bot.sendMessage(chatId, result, {
  				disable_notification: true,
  				reply_to_message_id: msg.message_id
  			}).then(function () {
  			    // reply sent!
  			});
  		}

  	});
  	['data', 'error', 'connection-close'].forEach(function(eventName){
  	    recognizeStream.on(eventName, console.log.bind(console, eventName + ' event: '));
  	});
  	//pipe voice message to recognizer -> send to watson
    requests(link).pipe(recognizeStream);
  });
}
