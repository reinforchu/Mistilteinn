import("punycode.js");
// import('domains.js');

function SteamChecker(details) {
  for (var i = 0, j = details.responseHeaders.length; i < j; ++i) {
    if (!/^Content-Type$/ig.test(details.responseHeaders[i].name) || !/html/ig.test(details.responseHeaders[i].value)) {
      return { responseHeaders: details.responseHeaders };
    } else {
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
          let verify = HomographDetector(punydec, level);
          if (verify >= 0) {
            let popup = OpenPupupWindow(); // window object retention
            filter.write(encoder.encode("<p>This page has been blocked because it may be spoofing the website address.<br>このページは Fx Homograph Blocker によってブロックされました。</p>"));
            filter.disconnect();
            } else {
              let ContentType = {
                name: "Content-Type",
                value: "text/html; charset=utf-8"
              };
              details.responseHeaders.push(ContentType);
              // str = str.replace(/(<meta )*charset=["']?Shift_JIS["']?.*?>/ig, "charset=utf-8\" />"); // Force change UTF-8
              filter.write(encoder.encode(str));
              filter.disconnect();
            }
        } else {
          let ContentType = {
            name: "Content-Type",
            value: "text/html; charset=utf-8"
          };
          details.responseHeaders.push(ContentType);
          // str = str.replace(/(<meta )*charset=["']?Shift_JIS["']?.*?>/ig, "charset=utf-8\" />"); // Force change UTF-8
          filter.write(encoder.encode(str));
          filter.disconnect();
        }
      }
    }
  }
  return { responseHeaders: details.responseHeaders };
}

function OpenPupupWindow () {
  let createData = {
    type: "detached_panel",
    url: "alert.html",
    width: 880,
    height: 160
  };
  let creating = browser.windows.create(createData);
  return creating;
}

function HomographDetector (hostname, fqdn) {
  let result = -1;
  let allow = false;
  let hostnames = [...hostname];
  let hostanamepair = [];
  let reversehostname = "";
  // Cyrillic search
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
  // let domainlists = GetHostnamesLists(domains);
  // result = domainlists.indexOf(reversehostname);
  // If Exists URL
  if (result === -1) {
    let OriginalHostname = "http://";
    fqdn.forEach(function (value, index) {
      if (/^xn--/.test(value)) {
        OriginalHostname += value.replace(/^xn--[a-zA-Z0-9-].*/, reversehostname);
        OriginalHostname += ".";
      } else {
        OriginalHostname += value;
        OriginalHostname += ".";
      }
    });
    OriginalHostname = OriginalHostname.slice(0,-1)
    if(CheckStatusCode(OriginalHostname) !== 404) {
      result = 1;
    }
  }
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

function CheckStatusCode(url){
  let xhr;
  xhr = new XMLHttpRequest();
  xhr.open("GET", url, false);
  xhr.send(null);
  return xhr.status;
}

browser.webRequest.onHeadersReceived.addListener(
  SteamChecker,
  {urls: ["<all_urls>"], types: ["main_frame"]},
  ["blocking", "responseHeaders"]
);