import("./punycode.js");

function StreamChecker(details) {
  let filter = browser.webRequest.filterResponseData(details.requestId);
  var decoder = new TextDecoder("utf-8");
  let encoder = new TextEncoder();
  filter.ondata = (event) => {
    var str = decoder.decode(event.data, {stream: true});
    if (/(<meta )*charset=["']?Shift_JIS["']?.*?>/ig.test(str)) { // Lang=ja_JP
      decoder = new TextDecoder("shift-jis");
      str = decoder.decode(event.data, {stream: true});
     // str = str.replace(/(<meta )*charset=["']?Shift_JIS["']?.*?>/ig, "charset=UTF-8\">"); // Workaround
    }
    let url = new URL(details.url);
    let fqdn = url.hostname;
    let level = fqdn.split(".");
    let xncount = 0;
    level.forEach(function (value, index) { // var index retention
      if (null !== value.match(/^xn--/)) {
        ++xncount;
      }
    });
    if (xncount >= 1) {
      let domain = fqdn.match(/(xn--[A-Za-z0-9-]*)/)[1];
      let removeXn = domain.slice(4);
      let punydec = punycode.decode(removeXn);
      let verify = HomographDetector(punydec, level);
      if (verify >= 0 ) {
        let popup = OpenPupupWindow(); // window object retention
        filter.write(encoder.encode("<p>This page has been blocked because it may be spoofing the website address.<br>このページは Fx Homograph Blocker によってブロックされました。</p>"));
        filter.disconnect();
        } else {
          filter.write(encoder.encode(str));
          filter.disconnect();
        }
    } else {
      filter.write(encoder.encode(str));
      filter.disconnect();
    }
  };
  return {};
}

function HomographDetector (hostname, fqdn) {
  let result = -1;
  let allow = false;
  let hostnames = [...hostname];
  let hostanamepair = [];
  let reversehostname = "";
  let cyrillic = [ [ "a", "а" ], [ "e", "е" ], [ "o", "о" ], [ "r", "г" ], [ "p", "р" ], [ "k", "к" ], [ "s", "ѕ" ], [ "c", "с" ], [ "x", "х" ], [ "y", "у" ], [ "i", "і" ], [ "l", "ӏ" ], [ "h", "һ" ], [ "b", "Ь" ], [ "m", "м" ], [ "q", "ԛ" ], [ "w", "ԝ" ], [ "j", "ј" ], [ "f", "ғ" ], [ "t", "т" ], [ "u", "ч" ] ];
  // Cyrillic search
  hostnames.forEach(function (value, index) {
    if (cyrillic.find(element => element[1] === value) === undefined) {
      allow = true;
    } else {
      hostanamepair.push(cyrillic.find(element => element[1] === value)); // Key pair retention
    }
  });
  if (allow) {
    return result;
  }
  hostanamepair.forEach(function (value, index) {
    reversehostname += value[0];
  });
  // If Exist URL search
  if (result === -1) {
    let OriginalHostname = "https://";
    fqdn.forEach(function (value, index) {
      if (/^xn--/.test(value)) {
        OriginalHostname += value.replace(/^xn--[a-zA-Z0-9-].*/, reversehostname);
        OriginalHostname += ".";
      } else {
        OriginalHostname += value;
        OriginalHostname += ".";
      }
    });
    OriginalHostname = OriginalHostname.slice(0, -1);
    if (CheckStatusCode(OriginalHostname) !== 0 || CheckStatusCode(OriginalHostname.replace("https://", "http://")) !== 0) {
     result = 0;
     return result;
    } else {
      return result;
    }
  }
}

function CheckStatusCode(url) {
  let xhr = new XMLHttpRequest();
  xhr.open("GET", url + "/", false);
  xhr.send(null);
  return xhr.status;
}

function OpenPupupWindow() {
  let createData = {
    type: "detached_panel",
    url: "alert.html",
    width: 880,
    height: 160
  };
  let creating = browser.windows.create(createData);
  return creating;
}

function UpdateContentType(details) {
  for (var i = 0, j = details.responseHeaders.length; i < j; ++i) {
    if (/^Content-Type$/ig.test(details.responseHeaders[i].name) && !/html/ig.test(details.responseHeaders[i].value)) { // Issue: ignore anything other than text/html.    
      // browser.webRequest.onBeforeRequest.removeListener(StreamChecker); // Issue: bindata broken.
      return { responseHeaders: details.responseHeaders };
    }
  }
  var ContentType = {
    name: "Content-Type",
    value: "text/html; charset=utf-8"
  };
  details.responseHeaders.push(ContentType);
  return { responseHeaders: details.responseHeaders };
}

browser.webRequest.onBeforeRequest.addListener(
  StreamChecker,
  {urls: ["<all_urls>"], types: ["main_frame"]},
  ["blocking"]
);

browser.webRequest.onHeadersReceived.addListener(
  UpdateContentType,
  {urls: ["<all_urls>"], types: ["main_frame"]},
  ["blocking", "responseHeaders"]
);