class IMUDisp {

    constructor(imuId) {
        this.isRunning = false;
        this.imuId = imuId;
        this.eventSource = null;
        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);
    }

    start() {
        this.isRunning = true;
        this.eventSource = new EventSource('/events-imu');
        this.eventSource.onmessage = (event) => {
            try {
                document.getElementById(this.imuId).innerHTML = event.data;
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
