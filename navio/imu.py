import time
import sys
import threading
from navio.mpu9250 import MPU9250

class IMUManager:

    def __init__(self):
        self.imu = MPU9250()
        self.run = False
        self.t_update = None
        self.m9a = [0.0, 0.0, 0.0]
        self.m9g = [0.0, 0.0, 0.0]
        self.m9m = [0.0, 0.0, 0.0]

        if self.imu.testConnection():
            print("Connection established: True")
            self.imu.initialize()
            time.sleep(1)
        else: 
            print("Connection established: False")

    def __update(self):
        while self.run:
            self.m9a, self.m9g, self.m9m = self.imu.getMotion9()
            time.sleep(0.1)

    def get_data(self):
        return (self.m9a, self.m9g, self.m9m)

    def start(self):
        if not self.t_update:
            self.run = True
            self.t_update = threading.Thread(target=self.__update)
            self.t_update.start()

    def shutdown(self):
        self.run = False
        if self.t_update:
            self.t_update.join()
            self.t_update = None
