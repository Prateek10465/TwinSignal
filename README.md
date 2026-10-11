# 📡 TWIN SIGNAL

> **A real-time cooperative deduction game powered by quantum non-locality.**  
> Built for the **Qollab × IonQ Global Quantum Hackathon (Oct 9–11, 2026)** · **Track 02: Quantum Playground**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Tests: 35 passed](https://img.shields.io/badge/tests-35%20passed-brightgreen.svg)](server/tests)
[![Physics: CHSH Bell Test](https://img.shields.io/badge/physics-CHSH%20Bell%20Violation-purple.svg)](server/quantum.py)

---

## 🛰️ Overview

*Two agents. Two sealed rooms. One rule.*

**Twin Signal** transforms the foundational physics of quantum entanglement into a high-stakes espionage deduction game. 

Two agents are placed in isolated rooms with zero communication permitted during operation. In each round, HQ deals each agent a secret card (🔴 Red or 🔵 Blue) and each agent must pick a door (🚪 **L** or **R**).

- **The Objective Rule**:
  - If **both** cards are 🔴 Red, the doors must be **DIFFERENT** ($L \ne R$).
  - In all other card combinations, the doors must be the **SAME** ($L = R$).

Mathematically, this is the canonical **CHSH Game** ($\text{Door}_A \oplus \text{Door}_B = \text{Card}_A \land \text{Card}_B$):
- **Classical Local Realism (The Wall)**: Any pre-agreed strategy, codebook, or shared classical randomness is mathematically capped at a maximum win rate of **75.0%** (Bell's Inequality).
- **Quantum Entanglement (The Twin Link)**: By measuring an entangled Bell state ($|\Phi^+\rangle = \frac{|00\rangle + |11\rangle}{\sqrt{2}}$), agents break local realism and reach Tsirelson’s bound at **85.4%** ($\cos^2(\pi/8)$).

---

## ✨ Key Features

- **⚡ Instant 1-Click Solo Training**:
  Jump directly into a match in 1 click from the title screen. The server automatically provisions AI bot agents with unique personalities so you can train without needing a partner.

- **👥 Real-Time Multiplayer (4P & 8P Rooms)**:
  Create or join rooms with 4-letter room codes. Full WebSocket state machine supporting 4-player co-op or 8-player cell network lobbies with hot-reconnect and spectator support.

- **🕵️ Social Deduction & Mole Sabotage**:
  In 4P and 8P Story modes, hidden moles try to covertly replace the quantum channel with local hidden-variable fakes, inject noise jitter, forge alibis, and coordinate through encrypted cell channels. Teams must analyze win rates and call emergency meetings to burn suspected links.

- **🔬 Interactive Bell Lab**:
  A built-in interactive sandbox where players can test all 16 possible classical codebook combinations against the quantum link across 200 simulated rounds to verify why classical strategies can never beat 75%.

- **📐 Declassified "Nerd Mode" & Circuit Export**:
  Inspect the exact quantum circuit and knob angles that break the Bell inequality. Includes 1-click **COPY QISKIT** (standalone Python 3 script using `qiskit` & `qiskit_aer`) and **COPY QASM** (OpenQASM 2.0 format) to run directly on IonQ hardware or external simulators.

- **🔊 Procedural Espionage Audio**:
  Real-time Web Audio synthesizer that generates radar pings, carrier wave hums, telegraph clicks, siren alarms, and role assignment stingers dynamically without external audio assets.

---

## 🧮 The Quantum Physics Behind Twin Signal

### 1. Entangled Bell State Preparation
Before measurement, qubits 0 and 1 are placed into the maximally entangled Bell state:
$$\vert\Phi^+\rangle = \frac{\vert 00\rangle + \vert 11\rangle}{\sqrt{2}}$$

### 2. Basis Rotations
Each agent has a dial with 5 snap positions ($\theta = k \cdot \frac{\pi}{8}$ for $k \in \{-2, -1, 0, 1, 2\}$):
- **Alice's optimal angles**: $\theta_A(0) = 0$, $\theta_A(1) = \frac{\pi}{4}$ ($45^\circ$)
- **Bob's optimal angles**: $\theta_B(0) = \frac{\pi}{8}$ ($22.5^\circ$), $\theta_B(1) = -\frac{\pi}{8}$ ($-22.5^\circ$)

The relative angle difference between Alice and Bob is always $\Delta\theta = \pm\frac{\pi}{8}$.

### 3. Measurement & Tsirelson's Bound
The probability of winning each round is governed by quantum measurement statistics:
$$P(\text{win} \mid x, y) = \cos^2\left(\frac{\pi}{8}\right) \approx 0.8536 \quad (85.4\%)$$
This violates the classical Bell-CHSH inequality ($S \le 2$) by achieving the maximum quantum Tsirelson bound ($S = 2\sqrt{2} \approx 2.828$).

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Modern web browser (Chrome, Firefox, Safari, Edge)

### 1. Clone & Run (Zero Dependencies)
Twin Signal includes a zero-dependency standard library server that runs out of the box with pure Python:

```bash
# Clone the repository
git clone https://github.com/your-username/twin-signal.git
cd twin-signal

# Start the game server
python server/serve.py
```
Open your browser and navigate to **`http://localhost:8000`**.

### 2. Production Server (FastAPI + Uvicorn)
For production deployments (Render, Railway, Fly.io, Heroku):

```bash
# Install production requirements
pip install -r requirements.txt

# Start using Uvicorn
uvicorn server.app:app --host 0.0.0.0 --port 8000
```

### 3. Run Test Suite
Verify quantum mechanics math, game engine state machines, and multiplayer networking:

```bash
pytest server/tests
```
All **35 test suites** run in under 20 seconds.

---

## 📁 Repository Structure

```text
twin-signal/
├── client/                     # Frontend client (Vanilla HTML5 / CSS / JS)
│   ├── index.html              # Main viewport & responsive shell
│   ├── app.js                  # State manager, WebSocket client, event dispatcher
│   ├── tpl_a.js                # Title screen, lobby & silent run view templates
│   ├── tpl_b.js                # Meeting, reveal & declassified nerd mode templates
│   ├── overlays.js             # Bell Lab, guide, case file & leaderboard overlays
│   └── audio.js                # Synthesized Web Audio engine
├── server/                     # Backend authoritative engine
│   ├── serve.py                # Standalone zero-dependency RFC 6455 WebSocket server
│   ├── app.py                  # Production FastAPI / Uvicorn server entrypoint
│   ├── game.py                 # Authoritative room state machine & bot AI
│   ├── quantum.py              # CHSH mathematics, Bell statistics & Qiskit circuits
│   ├── hub.py                  # Room lifecycle & connection manager
│   ├── leaderboard.py          # Endless & Daily case file score tracker
│   └── tests/                  # Pytest test suite (35 tests)
├── Procfile                    # Cloud deployment process definition
├── requirements.txt            # Python dependencies
├── LICENSE                     # MIT License
└── README.md                   # Project documentation
```

---

## 📜 License

This project is open-source and licensed under the **[MIT License](LICENSE)**.

*Built for the Qollab × IonQ Global Quantum Hackathon (Oct 9–11, 2026).*
