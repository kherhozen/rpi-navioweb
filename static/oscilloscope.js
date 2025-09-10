class OscilloscopeSignal {

    constructor(name, unit, yMin, yMax, color, maxBufferSize=10000) {
        this.name = name;
        this.unit = unit;
        this.yMin = yMin;
        this.yMax = yMax;
        this.color = color;
        this.selected = false;
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
        this.wheel = document.getElementById(wheelId);
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

class OscilloscopeChannel {

    constructor(canvasElmt, signal, chMinId, chMaxId, wheelZoom, wheelOffset) {
        this.canvasElmt = canvasElmt;
        this.signal = signal;
        this.chMinElmt = document.getElementById(chMinId);
        this.chMaxElmt = document.getElementById(chMaxId);
        this.chMinElmt.innerHTML = '--';
        this.chMaxElmt.innerHTML = '--';
        this.wheelZoom = wheelZoom;
        this.wheelOffset = wheelOffset;
    }

    getYMinMax() {
        const yHeight = this.signal.yMax - this.signal.yMin
        const yHeightZoom = yHeight/(2**(this.wheelZoom.value/5))
        const yOffset = -yHeightZoom*this.wheelOffset.value/10
        return [this.signal.yMin+(yHeight-yHeightZoom)/2-yOffset, this.signal.yMax-(yHeight-yHeightZoom)/2-yOffset]
    }

    getYPosition(valueIndex) {
        const [yMin, yMax] = this.getYMinMax()
        return this.canvasElmt.height*(1 - (this.signal.valBuffer[valueIndex]-yMin)/(yMax-yMin));
    };

    setMinMaxLabels() {
        if (this.signal !== null) {
            const [yMin, yMax] = this.getYMinMax()
            this.chMinElmt.innerHTML = yMin.toFixed(3);
            this.chMaxElmt.innerHTML = yMax.toFixed(3);
        }
    }
}

class Oscilloscope {

    constructor(oscilloscopeId, title, timeSpan, signals) {
        this.oscilloscopeElement = document.getElementById(oscilloscopeId);
        this.oscilloscopeElement.innerHTML = 
            `<div id="oscilloscope-header">
                <div id="chA-max" class="ch-range chA-color">--</div>
                <div id="chB-max" class="ch-range chB-color">--</div>
                <div id="chC-max" class="ch-range chC-color">--</div>
                <div id="chD-max" class="ch-range chD-color">--</div>
            </div>
            <canvas id="oscilloscope-canvas" width="400" height="200"></canvas>
            <div id="oscilloscope-footer">
                <div id="chA-min" class="ch-range chA-color">--</div>
                <div id="chB-min" class="ch-range chB-color">--</div>
                <div id="chC-min" class="ch-range chC-color">--</div>
                <div id="chD-min" class="ch-range chD-color">--</div>
            </div>
            <div id="oscilloscope-controller">
                <button id="oscilloscope_play" class="toggle-button play">
                    <div class="icon-play"></div>
                    <div class="icon-pause"></div>
                </button>
                <button id="wzA" class="oscilloscope-wheel wheel-zoom wheel-ch chA-color">
                <button id="wzB" class="oscilloscope-wheel wheel-zoom wheel-ch chB-color">
                <button id="wzC" class="oscilloscope-wheel wheel-zoom wheel-ch chC-color">
                <button id="wzD" class="oscilloscope-wheel wheel-zoom wheel-ch chD-color">
            </div>
            <div id="oscilloscope-controller">
                <button id="ws" class="oscilloscope-wheel wheel-span">
                <button id="woA" class="oscilloscope-wheel wheel-offset wheel-ch chA-color">
                <button id="woB" class="oscilloscope-wheel wheel-offset wheel-ch chB-color">
                <button id="woC" class="oscilloscope-wheel wheel-offset wheel-ch chC-color">
                <button id="woD" class="oscilloscope-wheel wheel-offset wheel-ch chD-color">
            </div>`
        this.canvas = document.getElementById("oscilloscope-canvas");
        this.title = title;
        this.ctx = this.canvas.getContext('2d');
        this.gridColor = '#333';
        this.numLinesX = 20;
        this.numLinesY = 10;
        this.signals = signals;
        while (this.signals.length < 4) {
            this.signals.push(null)
        }
        this.isRunning = false;
        this.animationFrameId = null;
        this.timeSpan = timeSpan;
        this.scaleX = this.canvas.width/this.timeSpan;
        this.eventSource = null;
        this.animate = this.animate.bind(this);
        this.startOscilloscope = this.startOscilloscope.bind(this);
        this.stopOscilloscope = this.stopOscilloscope.bind(this);
        this.launchOscilloscope = this.launchOscilloscope.bind(this);
        this.wheelsZoom = [new OscilloscopeWheel("wzA"),
                           new OscilloscopeWheel("wzB"),
                           new OscilloscopeWheel("wzC"),
                           new OscilloscopeWheel("wzD")];
        this.wheelsOffset = [new OscilloscopeWheel("woA"),
                             new OscilloscopeWheel("woB"),
                             new OscilloscopeWheel("woC"),
                             new OscilloscopeWheel("woD")];
        this.wheelSpan = new OscilloscopeWheel("ws");
        this.channels = [new OscilloscopeChannel(this.canvas, signals[0], "chA-min", "chA-max", this.wheelsZoom[0], this.wheelsOffset[0]),
                         new OscilloscopeChannel(this.canvas, signals[1], "chB-min", "chB-max", this.wheelsZoom[1], this.wheelsOffset[1]),
                         new OscilloscopeChannel(this.canvas, signals[2], "chC-min", "chC-max", this.wheelsZoom[2], this.wheelsOffset[2]),
                         new OscilloscopeChannel(this.canvas, signals[3], "chD-min", "chD-max", this.wheelsZoom[3], this.wheelsOffset[3])];
        document.getElementById("oscilloscope_play").addEventListener('click', this.launchOscilloscope)
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
        for (let i = 0; i < this.signals.length; i++) {
            this.channels[i].setMinMaxLabels()
        }
        this.ctx.fillStyle = "#ffffff";
        this.ctx.textAlign = 'end';
        this.ctx.textBaseline = 'bottom';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`${this.timeSpan}s`, this.canvas.width-5, this.canvas.height-5);
    }

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
                this.ctx.moveTo(0, this.channels[signalIndex].getYPosition(0));
                for (let i = 1; i < signal.bufferLength(); i++) {
                    this.ctx.lineTo((signal.tBuffer[i] - signal.tBuffer[0])*this.scaleX,
                                    tthis.channels[signalIndex].getYPosition(i));
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

    launchOscilloscope() {
        if (!this.isRunning) {
            this.startOscilloscope();
            document.getElementById("oscilloscope_play").classList.remove('play');
            document.getElementById("oscilloscope_play").classList.add('pause');
        } else {
            this.stopOscilloscope();
            document.getElementById("oscilloscope_play").classList.remove('pause');
            document.getElementById("oscilloscope_play").classList.add('play');
        }
    }
}
