import("punycode.js");
import('domains.js');

function listener(details) {
  let filter = browser.webRequest.filterResponseData(details.requestId);
  let decoder = new TextDecoder("utf-8");
  let encoder = new TextEncoder();
  filter.ondata = (event) => {
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
        }
    } else {
      let str = decoder.decode(event.data, {stream: true});
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
  let result = 0;
  let hostnames = [...hostname];
  let hostanamepair = [];
  let reversehostname = "";
  let cyrillic = [ [ "a", "а" ], [ "e", "е" ], [ "o", "о" ], [ "r", "г" ], [ "p", "р" ], [ "k", "к" ], [ "s", "ѕ" ], [ "c", "с" ], [ "x", "х" ], [ "y", "у" ], [ "i", "і" ], [ "l", "ӏ" ], [ "h", "һ" ], [ "b", "Ь" ], [ "m", "м" ], [ "q", "ԛ" ], [ "w", "ԝ" ], [ "j", "ј" ], [ "f", "ғ" ], [ "t", "т" ], [ "u", "ч" ] ];
  hostnames.forEach(function (value, index) {
    hostanamepair.push(cyrillic.find(element => element[1] === value)); // Key pair retention
  });
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