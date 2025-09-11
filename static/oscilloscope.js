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

    constructor(scopeId, title, timeSpan, signals) {
        this.oscilloscopeElement = document.getElementById(scopeId);
        this.oscilloscopeElement.innerHTML = 
            `<div class="scope-header">
                <div id="${scopeId}-chA-max" class="scope-ch-range scope-chA-color">--</div>
                <div id="${scopeId}-chB-max" class="scope-ch-range scope-chB-color">--</div>
                <div id="${scopeId}-chC-max" class="scope-ch-range scope-chC-color">--</div>
                <div id="${scopeId}-chD-max" class="scope-ch-range scope-chD-color">--</div>
            </div>
            <canvas id="${scopeId}-canvas" class="scope-screen"></canvas>
            <div class="scope-footer">
                <div id="${scopeId}-chA-min" class="scope-ch-range scope-chA-color">--</div>
                <div id="${scopeId}-chB-min" class="scope-ch-range scope-chB-color">--</div>
                <div id="${scopeId}-chC-min" class="scope-ch-range scope-chC-color">--</div>
                <div id="${scopeId}-chD-min" class="scope-ch-range scope-chD-color">--</div>
            </div>
            <div class="scope-controller">
                <div class="scope-sub-controller">
                    <div class="scope-button-group scope-chA-color">
                        <button id="${scopeId}-wzA" class="scope-wheel scope-wheel-zoom">
                        <button id="${scopeId}-woA" class="scope-wheel scope-wheel-offset">
                    </div>
                    <div class="scope-button-group scope-chB-color">
                        <button id="${scopeId}-wzB" class="scope-wheel scope-wheel-zoom">
                        <button id="${scopeId}-woB" class="scope-wheel scope-wheel-offset">
                    </div>
                    <div class="scope-button-group scope-chC-color">
                        <button id="${scopeId}-wzC" class="scope-wheel scope-wheel-zoom">
                        <button id="${scopeId}-woC" class="scope-wheel scope-wheel-offset">
                    </div>
                    <div class="scope-button-group scope-chD-color">
                        <button id="${scopeId}-wzD" class="scope-wheel scope-wheel-zoom">
                        <button id="${scopeId}-woD" class="scope-wheel scope-wheel-offset">
                    </div>
                </div>
                <div class="scope-sub-controller">
                    <div class="scope-button-group scope-span-color">
                        <button id="${scopeId}-play" class="scope-play-button play">
                        <button id="${scopeId}-ws" class="scope-wheel scope-wheel-span">
                    </div>
                </div>
            </div>`
        this.canvas = document.getElementById(`${scopeId}-canvas`);
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
        this.wheelsZoom = [new OscilloscopeWheel(`${scopeId}-wzA`),
                           new OscilloscopeWheel(`${scopeId}-wzB`),
                           new OscilloscopeWheel(`${scopeId}-wzC`),
                           new OscilloscopeWheel(`${scopeId}-wzD`)];
        this.wheelsOffset = [new OscilloscopeWheel(`${scopeId}-woA`),
                             new OscilloscopeWheel(`${scopeId}-woB`),
                             new OscilloscopeWheel(`${scopeId}-woC`),
                             new OscilloscopeWheel(`${scopeId}-woD`)];
        this.wheelSpan = new OscilloscopeWheel(`${scopeId}-ws`);
        this.channels = [new OscilloscopeChannel(this.canvas, signals[0], `${scopeId}-chA-min`, `${scopeId}-chA-max`, this.wheelsZoom[0], this.wheelsOffset[0]),
                         new OscilloscopeChannel(this.canvas, signals[1], `${scopeId}-chB-min`, `${scopeId}-chB-max`, this.wheelsZoom[1], this.wheelsOffset[1]),
                         new OscilloscopeChannel(this.canvas, signals[2], `${scopeId}-chC-min`, `${scopeId}-chC-max`, this.wheelsZoom[2], this.wheelsOffset[2]),
                         new OscilloscopeChannel(this.canvas, signals[3], `${scopeId}-chD-min`, `${scopeId}-chD-max`, this.wheelsZoom[3], this.wheelsOffset[3])];
        document.getElementById(`${scopeId}-play`).addEventListener('click', this.launchOscilloscope)
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
        // this.eventSource = new EventSource('/events');
        // this.eventSource.onmessage = (event) => {
        //     try {
        //         const values = JSON.parse(event.data);
        //         this.signals.forEach((signal, signalIndex) => {
        //             signal.pushVal(values.time, values[signal.name])
        //             while (signal.bufferLength() > 1) {
        //                 if (signal.tBuffer[signal.bufferLength()-2] - signal.tBuffer[0] > this.timeSpan) {
        //                     signal.shiftVal();
        //                 } else {
        //                     break;
        //                 }
        //             }
        //         });
        //     } catch (e) {
        //         console.error('Erreur lors de l\'analyse des données JSON:', e);
        //     }
        // };
        // this.eventSource.onerror = (error) => {
        //     console.error('Erreur EventSource:', error);
        //     this.stopOscilloscope();
        // };
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
