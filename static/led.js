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

const size = 50; // Rayon de l'hexagone

function drawHexagon(x, y, radius) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
    }
    ctx.closePath();
    ctx.clip(); // Limiter le dessin à l'intérieur de l'hexagone
}

function drawColorWheel() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    drawHexagon(centerX, centerY, size);

    // Dessiner le gradient de couleur (teinte)
    const gradient = ctx.createConicGradient(0, centerX, centerY);
    gradient.addColorStop(0, 'red');
    gradient.addColorStop(1 / 6, 'yellow');
    gradient.addColorStop(2 / 6, 'lime');
    gradient.addColorStop(3 / 6, 'cyan');
    gradient.addColorStop(4 / 6, 'blue');
    gradient.addColorStop(5 / 6, 'magenta');
    gradient.addColorStop(1, 'red');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessiner le gradient de saturation et de luminosité (blanc au centre, noir sur les bords)
    const gradientSatLight = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
    gradientSatLight.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Blanc au centre
    gradientSatLight.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    gradientSatLight.addColorStop(1, 'rgba(0, 0, 0, 1)'); // Noir sur les bords
    ctx.fillStyle = gradientSatLight;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

drawColorWheel();

canvas.addEventListener('click', (e) => {
    // Récupérer les données du pixel
    const imageData = ctx.getImageData(e.offsetX, e.offsetY, 1, 1).data;

    // Vérifier si la couleur est sur le dégradé (pas de fond transparent)
    if (imageData[3] > 0) {
        ledRGB = imageData.slice(0, 3);
        confLed();
    }
});