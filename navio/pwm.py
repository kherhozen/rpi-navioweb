import smbus
import time
from gpiozero import LED

class NavioPWM:

    __GPIO_OUT_ENBL = 27

    # Registers/etc.
    __MODE1 = 0x00
    __MODE2 = 0x01
    __SUBADR1 = 0x02
    __SUBADR2 = 0x03
    __SUBADR3 = 0x04
    __PRESCALE = 0xFE
    __LED0_ON_L = 0x06
    __LED0_ON_H = 0x07
    __LED0_OFF_L = 0x08
    __LED0_OFF_H = 0x09
    __ALL_LED_ON_L = 0xFA
    __ALL_LED_ON_H = 0xFB
    __ALL_LED_OFF_L = 0xFC
    __ALL_LED_OFF_H = 0xFD

    # Bits
    __RESTART = 0x80
    __SLEEP = 0x10
    __ALLCALL = 0x01
    __INVRT = 0x10
    __OUTDRV = 0x04
    __FULL_OFF = 0x10

    def __init__(self):
        self.bus = smbus.SMBus(1)
        self.address = 0x40
        self.pin_enable = LED(self.__GPIO_OUT_ENBL)

    def set_all_pwm(self, on, off):
        """Sets all PWM channels"""
        self.bus.write_byte_data(self.address, self.__ALL_LED_ON_L, on & 0xFF)
        self.bus.write_byte_data(self.address, self.__ALL_LED_ON_H, on >> 8)
        self.bus.write_byte_data(self.address, self.__ALL_LED_OFF_L, off & 0xFF)
        self.bus.write_byte_data(self.address, self.__ALL_LED_OFF_H, off >> 8)

    def set_pwm(self, channel, duty_cycle=0.5, delay=0.0):
        if delay + duty_cycle <= 1:
            on = int(delay*4095)
            off = int(duty_cycle*4095) + on
            self.bus.write_byte_data(self.address, self.__LED0_ON_L + 4 * channel, on & 0xFF)
            self.bus.write_byte_data(self.address, self.__LED0_ON_H + 4 * channel, on >> 8)
            self.bus.write_byte_data(self.address, self.__LED0_OFF_L + 4 * channel, off & 0xFF)
            self.bus.write_byte_data(self.address, self.__LED0_OFF_H + 4 * channel, off >> 8)

    def start(self):
        self.bus.write_byte_data(self.address, self.__ALL_LED_OFF_H, self.__FULL_OFF)
        # self.bus.write_byte_data(self.address, self.__MODE2, self.__OUTDRV)
        # self.bus.write_byte_data(self.address, self.__MODE1, self.__ALLCALL)
        time.sleep(0.005)  # wait for oscillator
        mode1 = self.bus.read_byte_data(self.address, self.__MODE1)
        mode1 = mode1 & ~self.__SLEEP  # wake up (reset sleep)
        self.bus.write_byte_data(self.address, self.__MODE1, mode1)
        time.sleep(0.005)  # wait for oscillator
        self.pin_enable.off()  # Reversed logic

    def shutdown(self):
        self.pin_enable.off()  # Reversed logic
        self.bus.write_byte_data(self.address, self.__ALL_LED_OFF_H, self.__FULL_OFF)
        time.sleep(0.005)  # wait for oscillator
        mode1 = self.bus.read_byte_data(self.address, self.__MODE1)
        mode1 = mode1 & self.__SLEEP  # go to sleep
        self.bus.write_byte_data(self.address, self.__MODE1, mode1)