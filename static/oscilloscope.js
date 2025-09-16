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

class OscilloscopeChannel {

    constructor(canvasElmt, signal, chMinId, chMaxId) {
        this.canvasElmt = canvasElmt;
        this.signal = signal;
        this.chMinElmt = document.getElementById(chMinId);
        this.chMaxElmt = document.getElementById(chMaxId);
        if (this.signal !== null) {
            this.chMinElmt.value = (Math.round(this.signal.yMin*1000)/1000).toString();
            this.chMaxElmt.value = (Math.round(this.signal.yMax*1000)/1000).toString();
            this.chMinElmt.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.chMinElmt.blur();
                }
            });
            this.chMaxElmt.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.chMaxElmt.blur();
                }
            });
        } else {
            this.chMinElmt.disabled = true;
            this.chMaxElmt.disabled = true;
            this.chMinElmt.value = '--';
            this.chMaxElmt.value = '--';
        }
        
    }

    getYPosition(valueIndex) {
        const yMin = this.chMinElmt.value;
        const yMax = this.chMaxElmt.value;
        return this.canvasElmt.height*(1 - (this.signal.valBuffer[valueIndex]-yMin)/(yMax-yMin));
    }

}

class Oscilloscope {

    constructor(scopeId, title, timeSpan, signals) {
        this.oscilloscopeElement = document.getElementById(scopeId);
        this.oscilloscopeElement.innerHTML = 
            `<div class="scope-header">
                <div class="scope-sub-header">
                    <input onClick="this.select();" type="text" id="${scopeId}-chA-max" class="scope-ch-range scope-chA-color">
                    <input onClick="this.select();" type="text" id="${scopeId}-chB-max" class="scope-ch-range scope-chB-color">
                    <input onClick="this.select();" type="text" id="${scopeId}-chC-max" class="scope-ch-range scope-chC-color">
                    <input onClick="this.select();" type="text" id="${scopeId}-chD-max" class="scope-ch-range scope-chD-color">
                </div>
            </div>
            <canvas id="${scopeId}-canvas" class="scope-screen"></canvas>
            <div class="scope-footer">
                <div class="scope-sub-footer">
                    <input onClick="this.select();" type="text" id="${scopeId}-chA-min" class="scope-ch-range scope-chA-color">
                    <input onClick="this.select();" type="text" id="${scopeId}-chB-min" class="scope-ch-range scope-chB-color">
                    <input onClick="this.select();" type="text" id="${scopeId}-chC-min" class="scope-ch-range scope-chC-color">
                    <input onClick="this.select();" type="text" id="${scopeId}-chD-min" class="scope-ch-range scope-chD-color">
                </div>
                <div class="scope-sub-footer">
                    <input onClick="this.select();" type="text" id="${scopeId}-span" class="scope-ch-range scope-span-color">
                </div>
            </div>`
        this.canvas = document.getElementById(`${scopeId}-canvas`);
        this.title = title;
        this.ctx = this.canvas.getContext('2d');
        this.signals = signals;
        this.channels = [];
        for (let i = 0; i < this.signals.length; i++) {
            this.channels.push(new OscilloscopeChannel(this.canvas, signals[0], `${scopeId}-chA-min`, `${scopeId}-chA-max`));
        }
        this.isRunning = false;
        this.animationFrameId = null;
        this.timeSpanElmt = document.getElementById(`${scopeId}-span`);
        this.timeSpanElmt.value = timeSpan;
        this.timeSpanElmt.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.timeSpanElmt.blur();
            }
        });
        this.scaleX = this.canvas.width/this.timeSpanElmt.value;
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
