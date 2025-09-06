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

function confLed() {
    const myConf = {
        "mode": document.querySelector("input[name=mode]:checked").value,
        "red": document.getElementById("red").value,
        "green": document.getElementById("green").value,
        "blue": document.getElementById("blue").value
    };
    sendJsonToServer("confled", myConf);
}