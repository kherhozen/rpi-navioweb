class OscilloscopeSignal {

    constructor(name, unit, yMin, yMax, maxBufferSize=10000) {
        this.name = name;
        this.unit = unit;
        this.yMin = yMin;
        this.yMax = yMax;
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
        this.chMin = (Math.round(this.signal.yMin*1000)/1000).toString();
        this.chMax = (Math.round(this.signal.yMax*1000)/1000).toString();
        this.chMinElmt.value = this.chMin;
        this.chMaxElmt.value = this.chMax;
        this.chMinElmt.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.chMin = this.chMinElmt.value;
                this.chMinElmt.blur();
            }
        });
        this.chMaxElmt.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.chMax = this.chMaxElmt.value;
                this.chMaxElmt.blur();
            }
        });
        this.chMinElmt.addEventListener('click', (e) => {
            e.target.select();
        });
        this.chMaxElmt.addEventListener('click', (e) => {
            e.target.select();
        });
        this.chMinElmt.addEventListener('change', (e) => {
            this.chMin = e.target.value;
        });
        this.chMaxElmt.addEventListener('change', (e) => {
            this.chMax = e.target.value;
        });
    }

    getYPosition(valueIndex) {
        return this.canvasElmt.height*(1 - (this.signal.valBuffer[valueIndex]-this.chMin)/(this.chMax-this.chMin));
    }

}

class Oscilloscope {

    constructor(scopeId, title, signals, timeSpan=20) {
        this.scopeId = scopeId;
        this.oscilloscopeElement = document.getElementById(scopeId);
        this.oscilloscopeElement.innerHTML = 
            `<div class="scope-header">
                <div id="${scopeId}-sub-header-hi" class="scope-sub-header"></div>
                <div class="scope-title">${title}</div>
            </div>
            <div class="scope-header">
                <div id="${scopeId}-sub-header-lo" class="scope-sub-header"></div>
            </div>
            <canvas id="${scopeId}-canvas" class="scope-screen"></canvas>
            <div class="scope-footer">
                <div id="${scopeId}-sub-footer-hi-left" class="scope-sub-footer"></div>
                <div id="${scopeId}-sub-footer-hi-right" class="scope-sub-footer">
                    <input type="button" id="${scopeId}-play" class="scope-play-button play">
                </div>
            </div>
            <div class="scope-footer">
                <div id="${scopeId}-sub-footer-lo" class="scope-sub-footer"></div>
                <div class="scope-sub-footer">
                    <div class="scope-ch-label-unit scope-span-label-color">s</div>
                </div>
            </div>`
        this.canvas = document.getElementById(`${scopeId}-canvas`);
        this.ctx = this.canvas.getContext('2d');
        this.timeSpan = timeSpan;
        this.signals = signals;
        this.channelNames = ['chA', 'chB', 'chC', 'chD'];
        const rs = getComputedStyle(document.querySelector(':root'));
        this.channelColors = [rs.getPropertyValue('--chA-color'), rs.getPropertyValue('--chB-color'),
                              rs.getPropertyValue('--chC-color'), rs.getPropertyValue('--chD-color')];
        this.channels = [];
        for (let i = 0; i < this.signals.length && i < 4; i++) {
            const newChannelMin = document.createElement('input');
            newChannelMin.type = "text";
            newChannelMin.id = `${scopeId}-${this.channelNames[i]}-min`;
            newChannelMin.className = `scope-ch-range scope-${this.channelNames[i]}-color`;
            document.getElementById(`${scopeId}-sub-footer-hi-left`).appendChild(newChannelMin);
            const newChannelLabelUnit = document.createElement('div');
            newChannelLabelUnit.innerHTML = this.signals[i].unit;
            newChannelLabelUnit.className = `scope-ch-label-unit scope-${this.channelNames[i]}-label-color`;
            document.getElementById(`${scopeId}-sub-footer-lo`).appendChild(newChannelLabelUnit);
            const newChannelLabelName = document.createElement('div');
            newChannelLabelName.innerHTML = this.signals[i].name;
            newChannelLabelName.className = `scope-ch-label-name scope-${this.channelNames[i]}-label-color`;
            document.getElementById(`${scopeId}-sub-header-hi`).appendChild(newChannelLabelName);
            const newChannelMax = document.createElement('input');
            newChannelMax.type = "text";
            newChannelMax.id = `${scopeId}-${this.channelNames[i]}-max`;
            newChannelMax.className = `scope-ch-range scope-${this.channelNames[i]}-color`;
            document.getElementById(`${scopeId}-sub-header-lo`).appendChild(newChannelMax);
            this.channels.push(new OscilloscopeChannel(this.canvas, this.signals[i], newChannelMin.id, newChannelMax.id));
        }
        const newSpan = document.createElement('input');
        newSpan.type = "text";
        newSpan.id = `${scopeId}-span`;
        newSpan.className = `scope-ch-range scope-span-color`;
        document.getElementById(`${scopeId}-sub-footer-hi-right`).appendChild(newSpan);
        newSpan.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.timeSpan = newSpan.value;
                newSpan.blur();
            }
        });
        newSpan.addEventListener('click', (e) => {
            e.target.select();
        });
        newSpan.addEventListener('change', (e) => {
            this.timeSpan = newSpan.value;
        });

        this.isRunning = false;
        this.animationFrameId = null;
        this.eventSource = null;
        this.animate = this.animate.bind(this);
        this.startOscilloscope = this.startOscilloscope.bind(this);
        this.stopOscilloscope = this.stopOscilloscope.bind(this);
        this.launchOscilloscope = this.launchOscilloscope.bind(this);
        document.getElementById(`${scopeId}-play`).addEventListener('click', this.launchOscilloscope);
    }

    drawGraph() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.lineWidth = 1;
        const scaleX = this.canvas.width/this.timeSpanElmt.value;
        this.signals.forEach((signal, signalIndex) => {
            if (signal.bufferLength() > 1) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = this.channelColors[signalIndex];
                this.ctx.moveTo(0, this.channels[signalIndex].getYPosition(0));
                for (let i = 1; i < signal.bufferLength(); i++) {
                    this.ctx.lineTo((signal.tBuffer[i] - signal.tBuffer[0])*scaleX,
                                    this.channels[signalIndex].getYPosition(i));
                }
                this.ctx.stroke();
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
                        if (signal.tBuffer[signal.bufferLength()-2] - signal.tBuffer[0] > this.timeSpanElmt.value) {
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
            document.getElementById(`${this.scopeId}-play`).classList.remove('play');
            document.getElementById(`${this.scopeId}-play`).classList.add('pause');
        } else {
            this.stopOscilloscope();
            document.getElementById(`${this.scopeId}-play`).classList.remove('pause');
            document.getElementById(`${this.scopeId}-play`).classList.add('play');
        }
    }
}
