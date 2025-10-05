import time
import threading
from navio.mpu9250 import MPU9250
import numpy as np
from ahrs.filters import Mahony
from ahrs.common.orientation import q2rpy

class IMUManager:

    __SAMPLE_RATE = 20.0  # IMU reading rate
    __DT = 1.0/__SAMPLE_RATE
    __BETA = 0.1

    def __init__(self):
        
        self.imu = MPU9250()
        self.run = False
        self.t_update = None
        self.m9a = [0.0, 0.0, 0.0]
        self.m9g = [0.0, 0.0, 0.0]
        self.m9m = [0.0, 0.0, 0.0]
        self.mahony = Mahony(
            gyr=np.array([self.m9a]),
            acc=np.array([self.m9g]),
            mag=np.array([self.m9m]),
            frequency=self.__SAMPLE_RATE
        )
        self.q = np.array([1.0, 0.0, 0.0, 0.0])
        self.att = [0.0, 0.0, 0.0]
        self.t = time.time()

        if self.imu.testConnection():
            self.imu.initialize()
            time.sleep(1)
        else: 
            print("Error: IMU Connection not established")

    def __update(self):
        while self.run:
            self.m9a, self.m9g, self.m9m = self.imu.getMotion9()
            self.q = self.mahony.updateMARG(self.q, np.array(self.m9g), np.array(self.m9a), np.array(self.m9m))
            self.att = q2rpy(self.q, in_deg=True)
            dt = time.time()-self.t
            print(time.time()-self.t)
            self.t = time.time()
            time.sleep(self.__DT-dt)

    def get_data(self):
        return (self.m9a, self.m9g, self.m9m, self.att)

    def start(self):
        if not self.t_update:
            self.run = True
            self.t_update = threading.Thread(target=self.__update)
            self.t_update.start()

    def shutdown(self):
        if self.imu.bus:
            self.imu.bus.close()
        self.run = False
        if self.t_update:
            self.t_update.join()
            self.t_update = None
