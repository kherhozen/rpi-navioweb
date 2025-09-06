const canvas = document.getElementById('oscilloscope');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

let dataPoints = [ [], [], [] ];
const colors = ['#00ff00', '#ff0000']
let isRunning = false;
let animationFrameId = null;

const tRange = 20;
const yMin = [1005, 30];
const yMax = [1010, 34];

// Fonction pour dessiner la grille (facultatif)
function drawGrid() {
    const gridColor = '#333';
    const numLinesX = 20;
    const numLinesY = 10;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = gridColor;

    // Lignes verticales
    for (let i = 0; i <= numLinesX; i++) {
        ctx.beginPath();
        ctx.moveTo(i * width / numLinesX, 0);
        ctx.lineTo(i * width / numLinesX, height);
        ctx.stroke();
    }

    // Lignes horizontales
    for (let i = 0; i <= numLinesY; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * height / numLinesY);
        ctx.lineTo(width, i * height / numLinesY);
        ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '64px Arial'; // Police et taille du texte
    ctx.fillStyle = "#555";
    ctx.fillText("Barometer", width/2, height/2);
}

// Fonction pour dessiner les étiquettes de l'axe Y
function drawLabels() {
    ctx.textAlign = 'start';
    ctx.font = '14px Arial'; // Police et taille du texte
    dataPoints.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
            ctx.fillStyle = colors[lineIndex-1];
            ctx.textBaseline = 'top';
            ctx.fillText(yMax[lineIndex-1], 5, 5+20*(lineIndex-1));
            ctx.textBaseline = 'bottom';
            ctx.fillText(yMin[lineIndex-1], 5, height-(5+20*(lineIndex-1)));
        }
    });
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = 'end';
    ctx.textBaseline = 'bottom';
    ctx.fillText(tRange, width-5, height-5);
}

// Fonction pour dessiner les points de données
function drawGraph() {
    drawGrid();
    drawLabels();
    ctx.font = '14px Arial'; // Police et taille du texte

    dataPoints.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
            if (line.length > 1) {
                ctx.beginPath();
                ctx.strokeStyle = colors[lineIndex-1];
                ctx.lineWidth = 2;

                const scaleX = width/tRange;

                const getYPosition = (value) => {
                    return height*(1 - (value - yMin[lineIndex-1])/(yMax[lineIndex-1] - yMin[lineIndex-1]));
                };

                ctx.moveTo(0, getYPosition(line[0]));

                for (let i = 1; i < line.length; i++) {
                    const x = (dataPoints[0][i] - dataPoints[0][0])*scaleX;
                    const y = getYPosition(line[i]);
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.textAlign = 'end';
                ctx.textBaseline = 'top';
                ctx.fillStyle = colors[lineIndex-1];
                ctx.fillText(`${line[line.length-1].toFixed(1)}`, width-5, 5+20*(lineIndex-1));
            }
        }
    });
}

// Fonction d'animation principale
function animate() {
    if (isRunning) {
        drawGraph();
        animationFrameId = requestAnimationFrame(animate);
    }
}

// Fonctions de contrôle
function launchOscilloscope() {
    if (!isRunning) {
        isRunning = true;
        document.getElementById("oscilloscope_button").innerHTML = "Pause"
        eventSource = new EventSource('/events');
        eventSource.onmessage = function(event) {
            try {
                const values = JSON.parse(event.data);
                dataPoints[0].push(values.time);
                dataPoints[1].push(values.pressure);
                dataPoints[2].push(values.temperature);
                while (dataPoints[0].length > 1) {
                    if (dataPoints[0][dataPoints[0].length-2] - dataPoints[0][0] > tRange) {
                        dataPoints[0].shift();
                        dataPoints[1].shift();
                        dataPoints[2].shift();
                    } else {
                        break;
                    }
                }
            } catch (e) {
                console.error('Erreur lors de l\'analyse des données JSON:', e);
            }
        };
        eventSource.onerror = function(error) {
            console.error('Erreur EventSource:', error);
            stopOscilloscope();
        };
        animate();
    } else {
        isRunning = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        document.getElementById("oscilloscope_button").innerHTML = "Start"
    }
}

// Initialisation
drawGrid();
