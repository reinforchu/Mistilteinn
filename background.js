import("punycode.js");
import('domains.js');

function listener(details) {
  let filter = browser.webRequest.filterResponseData(details.requestId);
  filter.ondata = (event) => {
    var decoder = new TextDecoder();
    let encoder = new TextEncoder();
    var str = decoder.decode(event.data, {stream: true});
    if (/(<meta )*charset=["']?Shift_JIS["']?.*?>/ig.test(str)) {
      decoder = new TextDecoder("shift-jis");
      str = decoder.decode(event.data, {stream: true});
    }
    let url = new URL(details.url);
    let fqdn = url.hostname;
    let level = fqdn.split(".");
    let xncount = 0;
    level.forEach(function (value, index) {
      if (null === value.match(/^xn--/)) {
        ++xncount;
      }
    });
    if (xncount <= 1) {
      let domain = fqdn.match(/(xn--[A-Za-z0-9-]*)/)[1];
      let removeXn = domain.slice(4);
      let punydec = punycode.decode(removeXn);
      let verify = HomographDetector(punydec);
      if (verify >= 0) {
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
  }
}

browser.webRequest.onBeforeRequest.addListener(
  listener,
  {urls: ["<all_urls>"], types: ["main_frame"]},
  ["blocking"]
);

function OpenPupupWindow () {
  let createData = {
    type: "detached_panel",
    url: "popup.html",
    width: 900,
    height: 200
  };
  let creating = browser.windows.create(createData);
  return creating;
}

function HomographDetector (hostname) {
  let result = -1;
  let allow = false;
  let hostnames = [...hostname];
  let hostanamepair = [];
  let reversehostname = "";
  let cyrillic = [ [ "a", "а" ], [ "e", "е" ], [ "o", "о" ], [ "r", "г" ], [ "p", "р" ], [ "k", "к" ], [ "s", "ѕ" ], [ "c", "с" ], [ "x", "х" ], [ "y", "у" ], [ "i", "і" ], [ "l", "ӏ" ], [ "h", "һ" ], [ "b", "Ь" ], [ "m", "м" ], [ "q", "ԛ" ], [ "w", "ԝ" ], [ "j", "ј" ], [ "f", "ғ" ], [ "t", "т" ], [ "u", "ч" ] ];
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
  let domainlists = GetHostnamesLists(domains);
  result = domainlists.indexOf(reversehostname);
  return result;
}

function GetHostnamesLists (domainnames) {
  const domains = [];
  const hostnames = [];
  let lists = domainnames.split('\n');
  lists.forEach(domain => domains.push(domain));
  domains.forEach(host => hostnames.push(host.match(/([A-Za-z0-9-]*)/)[1]));
  const uniquehostnames = Array.from(new Set(hostnames));
  return uniquehostnames;
}

function UpdateContentType(details) {
  var ContentType = {
    name: "Content-Type",
    value: "text/html; charset=utf-8"
  };
  details.responseHeaders.push(ContentType);
  return { responseHeaders: details.responseHeaders };
}

browser.webRequest.onHeadersReceived.addListener(
  UpdateContentType,
  {urls: ["<all_urls>"], types: ["main_frame"]},
  ["blocking", "responseHeaders"]
);