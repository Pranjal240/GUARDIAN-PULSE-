"""
mpu6050_reader.py
=================
Reads raw 6-axis data from MPU6050 over I2C on Raspberry Pi.

Wiring (MPU6050 → Pi):
  VCC  → 3.3V  (Pin 1)
  GND  → GND   (Pin 6)
  SCL  → GPIO3 (Pin 5)
  SDA  → GPIO2 (Pin 3)
  AD0  → GND   (I2C address 0x68)

Enable I2C: sudo raspi-config → Interface Options → I2C → Enable
Install   : pip install smbus2
"""

import time
import numpy as np
import smbus2

# ─────────────────────────────────────────────
# MPU6050 REGISTER MAP
# ─────────────────────────────────────────────
MPU6050_ADDR     = 0x68
PWR_MGMT_1       = 0x6B
SMPLRT_DIV       = 0x19
CONFIG           = 0x1A
GYRO_CONFIG      = 0x1B
ACCEL_CONFIG     = 0x1C
ACCEL_XOUT_H     = 0x3B
TEMP_OUT_H       = 0x41
GYRO_XOUT_H      = 0x43
INT_ENABLE       = 0x38

# Scale factors
ACCEL_SCALE      = 16384.0   # ±2g range → LSB/g
GYRO_SCALE       = 131.0     # ±250°/s range → LSB/(°/s)
GRAVITY          = 9.80665   # m/s²


class MPU6050:
    def __init__(self, bus_num: int = 1, address: int = MPU6050_ADDR):
        self.bus     = smbus2.SMBus(bus_num)
        self.address = address
        self._init_sensor()

    def _init_sensor(self):
        """Wake up and configure the sensor."""
        # Wake up (clear sleep bit)
        self.bus.write_byte_data(self.address, PWR_MGMT_1, 0x00)
        time.sleep(0.1)

        # Sample rate = 8kHz / (1 + SMPLRT_DIV) → 100 Hz
        self.bus.write_byte_data(self.address, SMPLRT_DIV, 0x4F)  # 79 → 100Hz

        # DLPF bandwidth = 44 Hz (smooth but fast enough)
        self.bus.write_byte_data(self.address, CONFIG, 0x03)

        # Gyro  ±250 °/s
        self.bus.write_byte_data(self.address, GYRO_CONFIG, 0x00)

        # Accel ±2 g
        self.bus.write_byte_data(self.address, ACCEL_CONFIG, 0x00)

        # Interrupt enable
        self.bus.write_byte_data(self.address, INT_ENABLE, 0x01)
        print(f"MPU6050 initialized at 0x{self.address:02X}")

    def _read_raw_word(self, reg):
        """Read 16-bit signed value from register."""
        high = self.bus.read_byte_data(self.address, reg)
        low  = self.bus.read_byte_data(self.address, reg + 1)
        val  = (high << 8) | low
        if val >= 0x8000:
            val -= 0x10000
        return val

    def read_raw(self) -> dict:
        """Read raw accelerometer and gyroscope values."""
        return {
            "ax_raw": self._read_raw_word(ACCEL_XOUT_H),
            "ay_raw": self._read_raw_word(ACCEL_XOUT_H + 2),
            "az_raw": self._read_raw_word(ACCEL_XOUT_H + 4),
            "temp_raw": self._read_raw_word(TEMP_OUT_H),
            "gx_raw": self._read_raw_word(GYRO_XOUT_H),
            "gy_raw": self._read_raw_word(GYRO_XOUT_H + 2),
            "gz_raw": self._read_raw_word(GYRO_XOUT_H + 4),
        }

    def read_scaled(self) -> dict:
        """
        Returns scaled values:
          ax, ay, az in m/s²
          gx, gy, gz in °/s
          temp       in °C
        """
        raw = self.read_raw()
        return {
            "ax":   (raw["ax_raw"] / ACCEL_SCALE) * GRAVITY,
            "ay":   (raw["ay_raw"] / ACCEL_SCALE) * GRAVITY,
            "az":   (raw["az_raw"] / ACCEL_SCALE) * GRAVITY,
            "gx":   raw["gx_raw"]  / GYRO_SCALE,
            "gy":   raw["gy_raw"]  / GYRO_SCALE,
            "gz":   raw["gz_raw"]  / GYRO_SCALE,
            "temp": raw["temp_raw"] / 340.0 + 36.53,
        }

    def collect_window(self, n_samples: int = 256, fs: int = 100) -> np.ndarray:
        """
        Collect n_samples at ~fs Hz.
        Returns np.ndarray of shape (n_samples, 6) → [ax,ay,az,gx,gy,gz]
        """
        interval = 1.0 / fs
        window   = np.zeros((n_samples, 6))

        for i in range(n_samples):
            t_start = time.time()
            s = self.read_scaled()
            window[i] = [s["ax"], s["ay"], s["az"],
                         s["gx"], s["gy"], s["gz"]]
            elapsed = time.time() - t_start
            sleep_t = interval - elapsed
            if sleep_t > 0:
                time.sleep(sleep_t)

        return window

    def close(self):
        self.bus.close()


# ─────────────────────────────────────────────
# QUICK TEST (run directly on Pi)
# ─────────────────────────────────────────────
if __name__ == "__main__":
    mpu = MPU6050()
    print("\nStreaming IMU data (Ctrl+C to stop):\n")
    print(f"{'ax':>8} {'ay':>8} {'az':>8} | {'gx':>8} {'gy':>8} {'gz':>8} | {'temp':>6}")
    print("-" * 65)
    try:
        while True:
            d = mpu.read_scaled()
            print(f"{d['ax']:8.3f} {d['ay']:8.3f} {d['az']:8.3f} | "
                  f"{d['gx']:8.2f} {d['gy']:8.2f} {d['gz']:8.2f} | "
                  f"{d['temp']:6.1f}°C")
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        mpu.close()
