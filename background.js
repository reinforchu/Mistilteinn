function listener(details) {
  let filter = browser.webRequest.filterResponseData(details.requestId);
  let decoder = new TextDecoder("utf-8");
  let encoder = new TextEncoder();

  filter.ondata = (event) => {
    if (details.url == "https://xn--80aff9ak.com/") {

     let popup = OpenPupupWindow();
     if (popup) {
          let str = decoder.decode(event.data, {stream: true});
          console.log(details);
          filter.write(encoder.encode("このページは Fx Homograph Detector によってブロックされました。"));
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
    width: 640,
    height: 320
  };
  let creating = browser.windows.create(createData);
  return 1;
}