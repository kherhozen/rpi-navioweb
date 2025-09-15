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

class OscilloscopeChannelRange {

    constructor(chElmtId, updateZoom, updateOffset) {
        this.chElmt = document.getElementById(chElmtId);
        this.chElmt_isMouseOver = false;
        this.updateZoom = updateZoom;
        this.updateOffset = updateOffset;
        this.ctrlIsPressed = false;
        this.chElmt.addEventListener('mouseover', (e) => {
            this.chElmt_isMouseOver = true;
            this.manageCursor();
        });
        this.chElmt.addEventListener('mouseout', (e) => {
            this.chElmt_isMouseOver = false;
            this.manageCursor();
        });
        this.chElmt.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                if (e.deltaY > 0) {
                    this.updateZoom(-1);
                } else if (e.deltaY < 0) {
                    this.updateZoom(1);
                }
            } else {
                if (e.deltaY > 0) {
                    this.updateOffset(-1);
                } else if (e.deltaY < 0) {
                    this.updateOffset(1);
                }
            }
            e.preventDefault();
        }, { passive: false });
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && !e.repeat) {
                this.ctrlIsPressed = true;
                this.manageCursor();
            }
        });
        document.addEventListener('keyup', (e) => {
            this.ctrlIsPressed = false;
            this.manageCursor();
        });
    }

    manageCursor() {
        if (this.chElmt_isMouseOver && this.ctrlIsPressed) {
            this.chElmt.classList.add('hover-with-ctrl');
        } else {
            this.chElmt.classList.remove('hover-with-ctrl');
        }
    }
}

class OscilloscopeChannel {

    constructor(canvasElmt, signal, chMinId, chMaxId) {
        this.canvasElmt = canvasElmt;
        this.signal = signal;
        this.zoom = 0;
        this.offset = 0;
        this.chMinElmt = document.getElementById(chMinId);
        this.chMaxElmt = document.getElementById(chMaxId);
        this.chMinRange = new OscilloscopeChannelRange(chMinId, this.updateZoom.bind(this), this.updateOffset.bind(this));
        this.chMaxRange = new OscilloscopeChannelRange(chMaxId, this.updateZoom.bind(this), this.updateOffset.bind(this));
    }

    updateZoom(value) {
        this.zoom += value;
        this.setMinMaxLabels();
    }

    updateOffset(value) {
        this.offset += value;
        this.setMinMaxLabels();
    }

    getYMinMax() {
        const yHeight = this.signal.yMax - this.signal.yMin;
        const yHeightZoom = yHeight/(2**(this.zoom/5));
        const yOffset = -yHeightZoom*this.offset/10;
        return [this.signal.yMin+(yHeight-yHeightZoom)/2-yOffset, this.signal.yMax-(yHeight-yHeightZoom)/2-yOffset];
    }

    getYPosition(valueIndex) {
        const [yMin, yMax] = this.getYMinMax();
        return this.canvasElmt.height*(1 - (this.signal.valBuffer[valueIndex]-yMin)/(yMax-yMin));
    };

    setMinMaxLabels() {
        if (this.signal !== null) {
            const [yMin, yMax] = this.getYMinMax();
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
                <div class="scope-sub-header">
                    <div id="${scopeId}-chA-max" class="scope-ch-range scope-chA-color">--</div>
                    <div id="${scopeId}-chB-max" class="scope-ch-range scope-chB-color">--</div>
                    <div id="${scopeId}-chC-max" class="scope-ch-range scope-chC-color">--</div>
                    <div id="${scopeId}-chD-max" class="scope-ch-range scope-chD-color">--</div>
                </div>
            </div>
            <canvas id="${scopeId}-canvas" class="scope-screen"></canvas>
            <div class="scope-footer">
                <div class="scope-sub-footer">
                    <div id="${scopeId}-chA-min" class="scope-ch-range scope-chA-color">--</div>
                    <div id="${scopeId}-chB-min" class="scope-ch-range scope-chB-color">--</div>
                    <div id="${scopeId}-chC-min" class="scope-ch-range scope-chC-color">--</div>
                    <div id="${scopeId}-chD-min" class="scope-ch-range scope-chD-color">--</div>
                </div>
                <div class="scope-sub-footer">
                    <div id="${scopeId}-span" class="scope-ch-range scope-span-color">--</div>
                </div>
            </div>`
        this.canvas = document.getElementById(`${scopeId}-canvas`);
        this.title = title;
        this.ctx = this.canvas.getContext('2d');
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
        this.channels = [new OscilloscopeChannel(this.canvas, signals[0], `${scopeId}-chA-min`, `${scopeId}-chA-max`),
                         new OscilloscopeChannel(this.canvas, signals[1], `${scopeId}-chB-min`, `${scopeId}-chB-max`),
                         new OscilloscopeChannel(this.canvas, signals[2], `${scopeId}-chC-min`, `${scopeId}-chC-max`),
                         new OscilloscopeChannel(this.canvas, signals[3], `${scopeId}-chD-min`, `${scopeId}-chD-max`)];
        // this.launchOscilloscope()
        for (let i = 0; i < this.channels.length; i++) {
            this.channels[i].setMinMaxLabels()
        }
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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
        // this.animate();
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
            // document.getElementById("oscilloscope_play").classList.remove('play');
            // document.getElementById("oscilloscope_play").classList.add('pause');
        } else {
            this.stopOscilloscope();
            // document.getElementById("oscilloscope_play").classList.remove('pause');
            // document.getElementById("oscilloscope_play").classList.add('play');
        }
    }
}
