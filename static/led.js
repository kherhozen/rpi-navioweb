function sendJsonToServer(serverUrl, dataObject="") {
    const requestOptions = {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(dataObject)
    };
    fetch(serverUrl, requestOptions)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            document.getElementById("output").innerHTML = data.message;
        })
        .catch(error => {
            console.error('There was an error sending the data:', error);
        });
}

function runLed() {
    sendJsonToServer("runled");
}

let ledRGB = [0, 255, 0];

function confLed() {
    const myConf = {
        "mode": document.querySelector("input[name=mode]:checked").value,
        "red": ledRGB[0]/255,
        "green": ledRGB[1]/255,
        "blue": ledRGB[2]/255
    };
    sendJsonToServer("confled", myConf);
}

const canvas = document.getElementById('colorPicker');
const ctx = canvas.getContext('2d');
const svgImage = new Image();
svgImage.onload = function() {
    ctx.drawImage(svgImage, 0, 0); 
};
svgImage.src = '../static/color-picker.svg';

canvas.addEventListener('click', (e) => {
    const imageData = ctx.getImageData(e.offsetX, e.offsetY, 1, 1).data;
    if (imageData[3] > 0) {
        ledRGB = imageData.slice(0, 3);
        confLed();
    }
});