require('newrelic');

const request = require('request-promise');
const cheerio = require('cheerio');
const twilio = require('twilio');
const config = require('./config');
const http = require('http');
const port = process.env.PORT || 3000;

const accountSid = config.sid;
const authToken = config.authToken;
const phoneNumber = config.phoneNumber;
const client = new twilio.RestClient(accountSid, authToken);

let lastPostId = '';
let lastPost;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const oneMinute = 1000 * 60;

function main() {
  console.log('main')
  const options = {
    url: 'https://www.reddit.com/r/NintendoSwitch/search?sort=new&restrict_sr=on&q=flair%3ANA',
    headers: {
      'User-Agent': 'request'
    }
  };

  request(options)
    .then(parseHtml)
    .then(sendMessage)
    .catch(handleError);
}

function parseHtml(html) {
  console.log('parse');
  const $ = cheerio.load(html);
  const content = $('.contents');
  const id = content.children()[0].attribs['data-fullname'];
  if (id !== lastPostId && id.length === 9) {
    let heading = $($('.contents').children()[0]).children('div').children('header').text();
    if (lastPostId === '') {
      heading = `Service restarted! Newest post is ${heading}`;
    }
    lastPostId = id;
    lastPost = heading;
    return heading;
  }
}

function sendMessage(heading) {
  console.log('message');
  if (heading) {
    client.messages.create({
      body: heading,
      to: phoneNumber,
      from: '+14028582009'
    }, function(err, message) {
      let timeTillRecheck;
      if (err) {
        console.error(err.message);
        timeTillRecheck = oneMinute;
      } else {
        timeTillRecheck = oneMinute * 10;
      }
      setTimeout(main, timeTillRecheck);
    });
  } else {
    setTimeout(main, oneMinute * 10);
    console.log('Checking in 10 min again.');
  }
}

function handleError(err) {
  console.log(`Failed to get page because: ${err}`);
  setTimeout(main, oneMinute);
}

main();

http.createServer((req, res) => {
  res.end(`Sorry, this isn't working currently! Reddit's on to my tricks!`);
}).listen(port, err => {
  if (err) {
    console.log(`Something happened: ${err}`);
  }

  console.log(`Listening on port ${port}`)
});