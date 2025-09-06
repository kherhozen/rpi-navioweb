import java.util.ArrayList;
import java.util.List;

class Oscilloscope {

    constructor(canvasId, colors, timeSpan, yLims) {
        this.canvas = canvasId;
        this.ctx = this.canvas.getContext('2d');
        this.gridColor = '#333';
        this.numLinesX = 20;
        this.numLinesY = 10;
        this.dataPoints = [];
        this.yMin = [];
        this.yMax = [];
        for (let i = 0; i < yLims.length + 1; i++) {
            this.dataPoints.push([]);
        }
        for (let i = 0; i < yLims.length; i++) {
            this.yMin.push(yLims[i][0])
            this.yMax.push(yLims[i][1])
        }
        this.colors = colors;
        this.isRunning = false;
        this.animationFrameId = null;
        this.timeSpan = timeSpan;
    }
}

const baroScope = new Oscilloscope(document.getElementById('oscilloscope'),
                                   ['#00ff00', '#ff0000'], 20, [[1005, 1010], [30, 34]])

    drawGrid() {
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.strokeStyle = gridColor;

        for (let i = 0; i <= numLinesX; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * width / numLinesX, 0);
            this.ctx.lineTo(i * width / numLinesX, height);
            this.ctx.stroke();
        }

        for (let i = 0; i <= numLinesY; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * height / numLinesY);
            this.ctx.lineTo(width, i * height / numLinesY);
            this.ctx.stroke();
        }

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = '64px Arial';
        this.ctx.fillStyle = "#555";
        this.ctx.fillText("Barometer", width/2, height/2);
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
