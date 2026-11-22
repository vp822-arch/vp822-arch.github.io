---
date: 2026-10-25
title: "Self-balancing robot, log 1: simulate before you solder"
category: project
summary: Starting a self-balancing robot on an ESP32 with an MPU-6050, beginning with a C++ simulation of the inverted pendulum to tune the PID controller.
tags: [ESP32, C++, PID control, MPU-6050]
---

I'm building a two-wheeled self-balancing robot. It's an inverted pendulum: it falls over unless a control loop keeps correcting it.

## The plan

- **Brain:** ESP32
- **Sensing:** MPU-6050 IMU for tilt angle and rate
- **Control:** closed-loop PID driving the motors

## Simulation first

Before touching hardware, I wrote a C++ simulation of the inverted-pendulum dynamics so I could tune the PID gains without crashing a real robot every time I got them wrong.

## Next

Fabricating the chassis.
