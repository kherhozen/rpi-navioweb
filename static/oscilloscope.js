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
    }

    getYPosition(valueIndex) {
        const yMin = this.chMinElmt.value;
        const yMax = this.chMaxElmt.value;
        return this.canvasElmt.height*(1 - (this.signal.valBuffer[valueIndex]-yMin)/(yMax-yMin));
    }

}

class Oscilloscope {

    constructor(scopeId, title, signals, timeSpan=20) {
        this.oscilloscopeElement = document.getElementById(scopeId);
        this.oscilloscopeElement.innerHTML = 
            `<div class="scope-header">
                <div id="${scopeId}-sub-header-hi" class="scope-sub-header"></div>
                <div class="scope-title">${title}</div>
            </div>
            <div class="scope-header">
                <div id="${scopeId}-sub-header-lo" class="scope-sub-header"></div>
                <div class="scope-sub-header">
                    <input type="button" id="${scopeId}-play" class="scope-play-button play">
                </div>
            </div>
            <canvas id="${scopeId}-canvas" class="scope-screen"></canvas>
            <div class="scope-footer">
                <div id="${scopeId}-sub-footer-hi" class="scope-sub-footer"></div>
                <div class="scope-sub-footer">
                    <input onClick="this.select();" type="text" id="${scopeId}-span" class="scope-ch-range scope-span-color">
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
            document.getElementById(`${scopeId}-sub-footer-hi`).appendChild(newChannelMin);
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
        this.eventSource = null;
        this.animate = this.animate.bind(this);
        this.startOscilloscope = this.startOscilloscope.bind(this);
        this.stopOscilloscope = this.stopOscilloscope.bind(this);
        this.launchOscilloscope = this.launchOscilloscope.bind(this);
        document.getElementById(`${scopeid}-play`).addEventListener('click', this.launchOscilloscope());
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
            document.getElementById(`${scopeid}-play`).classList.remove('play');
            document.getElementById(`${scopeid}-play`).classList.add('pause');
        } else {
            this.stopOscilloscope();
            document.getElementById(`${scopeid}-play`).classList.remove('pause');
            document.getElementById(`${scopeid}-play`).classList.add('play');
        }
    }
}
