import time
import threading
from smbus import SMBus


class Barometer:

    __MS5611_ADDRESS_CSB_LOW  = 0x76
    __MS5611_ADDRESS_CSB_HIGH = 0x77
    __MS5611_DEFAULT_ADDRESS  = 0x77

    __MS5611_RA_ADC           = 0x00
    __MS5611_RA_RESET         = 0x1E

    __MS5611_RA_C0            = 0xA0
    __MS5611_RA_C1            = 0xA2
    __MS5611_RA_C2            = 0xA4
    __MS5611_RA_C3            = 0xA6
    __MS5611_RA_C4            = 0xA8
    __MS5611_RA_C5            = 0xAA
    __MS5611_RA_C6            = 0xAC
    __MS5611_RA_C7            = 0xAE

    __MS5611_RA_D1_OSR_256    = 0x40
    __MS5611_RA_D1_OSR_512    = 0x42
    __MS5611_RA_D1_OSR_1024   = 0x44
    __MS5611_RA_D1_OSR_2048   = 0x46
    __MS5611_RA_D1_OSR_4096   = 0x48

    __MS5611_RA_D2_OSR_256    = 0x50
    __MS5611_RA_D2_OSR_512    = 0x52
    __MS5611_RA_D2_OSR_1024   = 0x54
    __MS5611_RA_D2_OSR_2048   = 0x56
    __MS5611_RA_D2_OSR_4096   = 0x58

    def __init__(self):
        self.bus = SMBus(1)
        self.address = 0x77
        self.c1 = 0
        self.c2 = 0
        self.c3 = 0
        self.c4 = 0
        self.c5 = 0
        self.c6 = 0
        self.d1 = 0
        self.d2 = 0
        self.temperature = 0.0 # Calculated temperature
        self.pressure = 0.0 # Calculated Pressure

    def initialize(self):
        c1a = self.bus.read_i2c_block_data(self.address, self.__MS5611_RA_C1, 2)
        c1b = self.bus.read_i2c_block_data(self.address, self.__MS5611_RA_C1)
        print(c1a, c1a[0] * 256.0 + c1a[1])
        print(c1b, c1b[0] * 256.0 + c1b[1])
        print(c1a, int.from_bytes(c1a, byteorder='big'))
        print(c1b, int.from_bytes(c1b, byteorder='big'))
        self.c1 = int.from_bytes(self.bus.read_i2c_block_data(self.address, self.__MS5611_RA_C1, 2), byteorder='big')
        #time.sleep(0.05)
        self.c2 = int.from_bytes(self.bus.read_i2c_block_data(self.address, self.__MS5611_RA_C2, 2), byteorder='big')
        #time.sleep(0.05)
        self.c3 = int.from_bytes(self.bus.read_i2c_block_data(self.address, self.__MS5611_RA_C3, 2), byteorder='big')
        #time.sleep(0.05)
        self.c4 = int.from_bytes(self.bus.read_i2c_block_data(self.address, self.__MS5611_RA_C4, 2), byteorder='big')
        #time.sleep(0.05)
        self.c5 = int.from_bytes(self.bus.read_i2c_block_data(self.address, self.__MS5611_RA_C5, 2), byteorder='big')
        #time.sleep(0.05)
        self.c6 = int.from_bytes(self.bus.read_i2c_block_data(self.address, self.__MS5611_RA_C6, 2), byteorder='big')

        self.update()

    def refresh_pressure(self):
        self.bus.write_byte(self.address, self.__MS5611_RA_D1_OSR_4096)

    def refresh_temperature(self):
        self.bus.write_byte(self.address, self.__MS5611_RA_D2_OSR_4096)

    def read_pressure(self):
        self.d1 = int.from_bytes(self.bus.read_i2c_block_data(self.address, self.__MS5611_RA_ADC, 4), byteorder='big')

    def read_temperature(self):
        self.d2 = int.from_bytes(self.bus.read_i2c_block_data(self.address, self.__MS5611_RA_ADC, 4), byteorder='big')

    def calculate(self):
        dt = self.d2 - self.c5*2**8
        self.temperature = 2000 + dt*self.c6/2**23

        off = self.c2*2**16 + self.c4*dt/2**7
        sens = self.c1*2**15 + self.c3*dt/2**8

        if self.temperature >= 2000:
            t2 = 0
            off2 = 0
            sens2 = 0
        else:
            t2 = dt*dt/2**31
            off2 = 5*((self.temperature - 2000)**2)/2
            sens2 = off2/2
            if self.temperature < -1500:
                off2 += 7*(self.temperature + 1500)**2
                sens2 += 11*(self.temperature + 1500)**2/2

        self.temperature -= t2
        off -= off2
        sens -= sens2

        self.pressure = (self.d1*sens/2**21 - off) / 2**15

    def get_pressure(self):
        return self.pressure/100

    def get_temperature(self):
        return self.temperature/100

    def update(self):
        self.refresh_pressure()
        time.sleep(0.01) # Waiting for pressure data ready
        self.read_pressure()

        self.refresh_temperature()
        time.sleep(0.01) # Waiting for temperature data ready
        self.read_temperature()

        self.calculate()


class BarometerManager:

    def __init__(self):
        self.baro = Barometer()
        self.run = False
        self.t_update = None

    def __update(self):
        while self.run:
            self.baro.update()
            time.sleep(0.2)

    def get_data_str(self):
        return f"OAT: {self.baro.get_temperature():.1f}degC - Ps: {self.baro.get_pressure():.0f}mb"

    def start(self):
        if not self.t_update:
            self.baro.initialize()
            self.run = True
            self.t_update = threading.Thread(target=self.__update)
            self.t_update.start()

    def shutdown(self):
        self.run = False
        if self.t_update:
            self.t_update.join()
            self.t_update = None
