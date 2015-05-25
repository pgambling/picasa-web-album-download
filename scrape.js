var https = require('https');
var fs = require('fs');
var async = require('async');
var jsdom = require('jsdom');

function onPageLoaded(errors, window, cb) {
  if (errors) {
    console.error("Encountered the following errors:");
    console.error(errors);
    process.exit(2);
  }

  console.log("Successfully loaded the page!");
  console.log("Scraping image urls...");

  // aliases
  var body = window.document.body;
  var map = Array.prototype.map;

  // scrape only the noscript element which already contains all the needed images
  body.innerHTML = body.querySelector('#lhid_feedview noscript').innerHTML;
  var allImageIcons = body.querySelectorAll('img');
  var results = map.call(allImageIcons, function(i) {return i.src.replace('/s128/','/d/');});

  cb(results);
}

function getImageUrls(targetUrl, cb) {
  console.log("Loading " + targetUrl + "...");
  jsdom.env({
    url: targetUrl,
    done: function(errors, window) {
      onPageLoaded(errors, window, cb);
    }
  });
}

function downloadImage(total, url, index, cb) {
  var imageNum = parseInt(index, 10) + 1;
  console.log("Downloading image " + imageNum + " of " + total + "...");

  var urlArr = url.split('/');
  var fname = urlArr[urlArr.length-1];
  var file = fs.createWriteStream(fname);

  var request = https.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);
    });
  });
}

function downloadImages(imageUrls) {
  var numImages = imageUrls.length;

  async.forEachOfSeries(imageUrls,
    function(url, index, cb) {
      downloadImage(numImages, url, index, cb);
    },
    function(error) {
      if (error) {
        console.error('Encountered an error while downloading images!');
        console.error(error);
        process.exit(4);
      }

      console.log("Successfully downloaded all images!");
    });
}

function main() {
  var targetUrl = process.argv[2];

  if (typeof targetUrl !== 'string') {
    console.error("Please pass the url of the Picasa album to download.");
    process.exit(1);
  }

  getImageUrls(targetUrl, function (imageUrls) {
    if (imageUrls.length === 0) {
      console.error("No images found!");
      process.exit(3);
    }

    downloadImages(imageUrls);
  });
}

main();
