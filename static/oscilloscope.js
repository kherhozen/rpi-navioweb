class OscilloscopeSignal {

    constructor(name, unit, yMin, yMax, color, maxBufferSize=10000) {
        this.name = name;
        this.unit = unit;
        this.yMin = yMin;
        this.yMax = yMax;
        this.color = color;
        this.selected = false;
        this.zoom = 0;
        this.offset = 0;
        this.maxBufferSize = maxBufferSize;
        this.tBuffer = [];
        this.valBuffer = [];
    }

    bufferLength() {
        return this.tBuffer.length;
    }

    pushVal(t, val) {
        this.tBuffer.push(t);
        this.valBuffer.push(val);
        if (this.tBuffer.length > this.maxBufferSize) {
            this.tBuffer.shift();
            this.valBuffer.shift();
        }
    }

    shiftVal() {
        this.tBuffer.shift();
        this.valBuffer.shift();
    }
}

class OscilloscopeWheel {

    constructor(wheelId) {
        this.wheel = wheelId;
        this.value = 0;
        this.wheel.addEventListener('wheel', (e) => {
            if (e.deltaY > 0) {
                this.value -= 1;
            } else if (e.deltaY < 0) {
                this.value += 1;
            }
            e.preventDefault();
        }, { passive: false });
    }
}

class Oscilloscope {

    constructor(canvasId, title, timeSpan, signals, wheelspan, wheelsignal, wheelzoom, wheeloffset) {
        this.canvas = canvasId;
        this.title = title;
        this.ctx = this.canvas.getContext('2d');
        this.gridColor = '#333';
        this.numLinesX = 20;
        this.numLinesY = 10;
        this.signals = signals;
        this.isRunning = false;
        this.animationFrameId = null;
        this.timeSpan = timeSpan;
        this.scaleX = this.canvas.width/this.timeSpan;
        this.eventSource = null;
        this.animate = this.animate.bind(this);
        this.wheelspan = wheelspan;
        this.wheelsignal = wheelsignal;
        this.wheelzoom = wheelzoom;
        this.wheeloffset = wheeloffset;
    }

    drawGrid() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = this.gridColor;

        for (let i = 0; i <= this.numLinesX; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.canvas.width / this.numLinesX, 0);
            this.ctx.lineTo(i * this.canvas.width / this.numLinesX, this.canvas.height);
            this.ctx.stroke();
        }

        for (let i = 0; i <= this.numLinesY; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.canvas.height / this.numLinesY);
            this.ctx.lineTo(this.canvas.width, i * this.canvas.height / this.numLinesY);
            this.ctx.stroke();
        }

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = '64px Arial';
        this.ctx.fillStyle = "#555";
        this.ctx.fillText(this.title, this.canvas.width/2, this.canvas.height/2);
    }

    drawLabels() {
        this.ctx.textAlign = 'start';
        this.signals.forEach((signal, signalIndex) => {
            this.ctx.fillStyle = signal.color;
            this.ctx.textBaseline = 'top';
            const yView = this.getYView(signal.yMin, signal.yMax)
            if (signal.selected) {
                this.ctx.font = 'bold 14px Arial';
            } else {
                this.ctx.font = '14px Arial';
            }
            this.ctx.fillText(`${yView[1].toFixed(3)}`, 5, 5+20*signalIndex);
            this.ctx.textBaseline = 'bottom';
            this.ctx.fillText(`${yView[0].toFixed(3)}`, 5, this.canvas.height-(5+20*signalIndex));
        });
        this.ctx.fillStyle = "#ffffff";
        this.ctx.textAlign = 'end';
        this.ctx.textBaseline = 'bottom';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`${this.timeSpan}s`, this.canvas.width-5, this.canvas.height-5);
    }

    getYView(signal) {
        const yHeight = signal.yMax-signal.yMin
        //////const yHeightZoom = yHeight/(2**(signal.wheelzoom.value/5))
        const yOffset = -yHeightZoom*this.wheeloffset.value/this.numLinesY
        return [yMin+(yHeight-yHeightZoom)/2-yOffset, yMax-(yHeight-yHeightZoom)/2-yOffset]
    }

    getYPosition(signal, valueIndex) {
        const yView = this.getYView(signal)
        return this.canvas.height*(1 - (signal.valBuffer[valueIndex]-yView[0])/(yView[1]-yView[0]));
    };

    drawGraph() {
        this.drawGrid();
        this.drawLabels();
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'end';
        this.ctx.textBaseline = 'top';
        this.ctx.lineWidth = 2;
        this.signals.forEach((signal, signalIndex) => {
            if (signal.bufferLength() > 1) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = signal.color;
                this.ctx.moveTo(0, this.getYPosition(signal, 0));
                for (let i = 1; i < signal.bufferLength(); i++) {
                    this.ctx.lineTo((signal.tBuffer[i] - signal.tBuffer[0])*this.scaleX,
                                    this.getYPosition(signal, i));
                }
                this.ctx.stroke();
                this.ctx.fillStyle = signal.color;
                this.ctx.fillText(`${signal.valBuffer[signal.bufferLength()-1].toFixed(1)}${signal.unit}`, this.canvas.width-5, 5+20*signalIndex);
            }
        });
    }

    animate() {
        if (this.isRunning) {
            this.drawGraph();
            this.animationFrameId = requestAnimationFrame(this.animate);
        }
    }

    startOscilloscope() {
        this.isRunning = true;
        this.eventSource = new EventSource('/events');
        this.eventSource.onmessage = (event) => {
            try {
                const values = JSON.parse(event.data);
                this.signals.forEach((signal, signalIndex) => {
                    signal.pushVal(values.time, values[signal.name])
                    while (signal.bufferLength() > 1) {
                        if (signal.tBuffer[signal.bufferLength()-2] - signal.tBuffer[0] > this.timeSpan) {
                            signal.shiftVal();
                        } else {
                            break;
                        }
                    }
                });
            } catch (e) {
                console.error('Erreur lors de l\'analyse des données JSON:', e);
            }
        };
        this.eventSource.onerror = (error) => {
            console.error('Erreur EventSource:', error);
            this.stopOscilloscope();
        };
        this.animate();
    }

    stopOscilloscope() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }
}
