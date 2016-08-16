var _ = require('underscore');
_.mixin(require('underscore.deferred'));
var Twit = require('twit');
var T = new Twit(require('./config.js'));
var wordfilter = require('wordfilter');
var ent = require('ent');
var wordnikKey = require('./permissions.js').key;


Array.prototype.pick = function () {
  return this[Math.floor(Math.random() * this.length)];
};

Array.prototype.pickRemove = function () {
  var index = Math.floor(Math.random() * this.length);
  return this.splice(index, 1)[0];
};

Array.prototype.contains = function (obj) {
  var i = this.length;
  while (i--) {
    if (this[i] == obj) {
      return true;
    }
  }
  return false;
};

var lastChecked = [];
var searchCount = 200;

var sillyComments = [
    "Donald— do you even em dash?\n",
    "That's not an em dash— try it again\n",
    "He thinks he's so great— he can't even em dash!\n",
    "How can you create jobs when you can't create an em dash?\n",

];

function cleanCheckedList() {
  if (lastChecked.length > searchCount) {
    for (var x = 0; x < (lastChecked.length - searchCount); x++) {
      lastChecked.pop();
    }
  }
  return x;
}
function generate() {
  var dfd = new _.Deferred();
  T.get('statuses/user_timeline', {user_id: 25073877, count: searchCount}, function (err, reply) {
    if (err) {
      throw err
    }
    // Here we have an array of tweets
    for (var i = 0; i < reply.length; i++) {
      var curTweet = reply[i];
      if (curTweet.text.indexOf("-") != -1) {
        console.log("found one");
        if (!lastChecked.contains(curTweet.id_str)) {
          lastChecked.unshift(curTweet.id_str);
          dfd.resolve(curTweet.id_str);
          return dfd.promise();
        } else {
          // Another loop!
        }
      }
    }
    dfd.resolve(null);

  });
  return dfd.promise();
}

function tweet() {
  console.log("Tweeting!");
  generate().then(function (tweetID) {

    console.log(tweetID);
    if (tweetID) {
      console.log("tweeting to ", tweetID);
      var tweetURL = "https://www.twitter.com/realDonaldTrump/statuses/" + tweetID;

      var tweet = sillyComments.pick() + tweetURL;


      T.post('statuses/update', {status: tweet}, function (err, reply) {
        if (err) {
          console.log('error:', err);
        }
        else {
          console.log('reply:', reply);
        }
      });

    } else {
      console.log("nothing to tweet");
    }
    // if (!wordfilter.blacklisted(myTweet)) {


    // }
  });
}

function search(term) {
  console.log('searching', term);
  var dfd = new _.Deferred();
  T.get('search/tweets', {q: term, count: 100}, function (err, reply) {
    console.log('search error:', err);
    var tweets = reply.statuses;
    tweets = _.chain(tweets)
    // decode weird characters
        .map(function (el) {
          if (el.retweeted_status) {
            return ent.decode(el.retweeted_status.text);
          }
          else {
            return ent.decode(el.text);
          }
        })
        .reject(function (el) {
          // throw out quotes and links and replies
          return el.indexOf('http') > -1 || el.indexOf('@') > -1 || el.indexOf('"') > -1;
        })
        .uniq()
        .value();
    dfd.resolve(tweets);
  });
  return dfd.promise();
}

// Tweet every 60 minutes
setInterval(function () {
  try {
    tweet();
    cleanCheckedList();
  }
  catch (e) {
    console.log(e);
  }
}, 1000 * 60 * 60);

// Tweet once on initialization
tweet();
