const imuEventSource = new EventSource('/events-imu');
imuEventSource.onmessage = (event) => {
    try {
        imuEventSource.innerHtml = event.data;
    } catch (e) {
        console.error('Erreur lors de l\'analyse des données JSON:', e);
    }
};
imuEventSource.onerror = (error) => {
    console.error('Erreur EventSource:', error);
};