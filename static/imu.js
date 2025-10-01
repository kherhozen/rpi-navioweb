class IMUDisp {

    constructor(imuId) {
        this.isRunning = false;
        this.imuId = imuId;
        this.signalsList = ['ax', 'ay', 'az', 'gx', 'gy', 'gz', 'mx', 'my', 'mz'];
        this.imuElement = document.getElementById(imuId);
        this.imuElement.innerHTML = `<div id="imu-matrix" class="matrix-container"></div>`
        this.signalsList.forEach((signal, signalIndex) => {
            const cell = document.createElement('div');
            cell.className = "matrix-cell";
            const cellLabel = document.createElement('span');
            cellLabel.className = "label";
            cellLabel.innerHTML = signal;
            cell.appendChild(cellLabel);
            const cellValue = document.createElement('span');
            cellValue.className = "value";
            cellValue.id = `val-${signal}`;
            cellValue.innerHTML = 0.0;
            cell.appendChild(cellValue);
            document.getElementById("imu-matrix").appendChild(cell);
        });
        this.eventSource = null;
        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);
    }

    start() {
        this.isRunning = true;
        this.eventSource = new EventSource('/events-imu');
        this.eventSource.onmessage = (event) => {
            try {
                const values = JSON.parse(event.data);
                this.signalsList.forEach((signal, signalIndex) => {
                    document.getElementById(`val-${signal}`).innerHTML = values[signal].toFixed(3)
                });
            } catch (e) {
                console.error('Erreur lors de l\'analyse des données JSON:', e);
            }
        };
        this.eventSource.onerror = (error) => {
            console.error('Erreur EventSource:', error);
            this.stop();
        };
    }

    stop() {
        this.isRunning = false;
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }
}
