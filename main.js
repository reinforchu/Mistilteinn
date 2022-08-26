if(document.domain == "xn--80aff9ak.com") {
     var UserChoice = window.confirm(`🔍もしかして: opera.com\n\n⚠️ウェブサイトのアドレスを改変して、偽装している可能性があります。\nこのページをブロックしますか？`);
    if(UserChoice === true) {
        document.head.textContent = "";
        document.body.textContent = "";
        var header = document.createElement('h1');
        header.textContent = "このページは Fx Homograph Detector によってブロックされました。";
        document.body.appendChild(header);
        // location.href = "about:blank";
    }
}