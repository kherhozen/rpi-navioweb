import java.util.ArrayList;
import java.util.List;

class Oscilloscope {

    constructor(canvasId, title, colors, timeSpan, yLims) {
        this.canvas = canvasId;
        this.title = title;
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
        this.scaleX = this.canvas.width / this.timeSpan;
    }

    drawGrid() {
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.strokeStyle = gridColor;

        for (let i = 0; i <= numLinesX; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.canvas.width / this.numLinesX, 0);
            this.ctx.lineTo(i * this.canvas.width / this.numLinesX, this.canvas.height);
            this.ctx.stroke();
        }

        for (let i = 0; i <= numLinesY; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.canvas.height / this.numLinesY);
            this.ctx.lineTo(this.canvas.width, i * this.canvas.height / this.numLinesY);
            this.ctx.stroke();
        }

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = '64px Arial';
        this.ctx.fillStyle = "#555";
        this.ctx.fillText(this.title, width/2, height/2);
    }

    drawLabels() {
        this.ctx.textAlign = 'start';
        this.ctx.font = '14px Arial';
        this.dataPoints.forEach((line, lineIndex) => {
            if (lineIndex > 0) {
                this.ctx.fillStyle = this.colors[lineIndex-1];
                this.ctx.textBaseline = 'top';
                this.ctx.fillText(this.yMax[lineIndex-1], 5, 5+20*(lineIndex-1));
                this.ctx.textBaseline = 'bottom';
                this.ctx.fillText(this.yMin[lineIndex-1], 5, this.canvas.height-(5+20*(lineIndex-1)));
            }
        });
        this.ctx.fillStyle = "#ffffff";
        this.ctx.textAlign = 'end';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(this.timeSpan, this.canvas.width-5, this.canvas.height-5);
    }

    function drawGraph() {
        this.drawGrid();
        this.drawLabels();
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'end';
        this.ctx.textBaseline = 'top';
        this.dataPoints.forEach((line, lineIndex) => {
            if (lineIndex > 0) {
                if (line.length > 1) {
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = this.colors[lineIndex-1];
                    this.ctx.lineWidth = 2;

                    const getYPosition = (value) => {
                        return height*(1 - (value - yMin[lineIndex-1])/(yMax[lineIndex-1] - yMin[lineIndex-1]));
                    };

                    this.ctx.moveTo(0, getYPosition(line[0]));

                    for (let i = 1; i < line.length; i++) {
                        const x = (this.dataPoints[0][i] - this.dataPoints[0][0])*this.scaleX;
                        const y = getYPosition(line[i]);
                        this.ctx.lineTo(x, y);
                    }
                    this.ctx.stroke();
                    this.ctx.fillStyle = this.colors[lineIndex-1];
                    this.ctx.fillText(`${line[line.length-1].toFixed(1)}`, this.canvas.width-5, 5+20*(lineIndex-1));
                }
            }
        });
    }

    animate() {
        if (this.isRunning) {
            this.drawGraph();
            this.animationFrameId = requestAnimationFrame(animate);
        }
    }

    launchOscilloscope() {
        if (!this.isRunning) {
            this.isRunning = true;
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
}
