# BlinkChat

BlinkChat is a secure, offline-first messaging application that operates via a Bluetooth Low Energy (BLE) Mesh Network and Tor.

## Project Structure

The project follows a professional React Native architecture to ensure scalability and separation of concerns.

### 📂 src/
- **services/**: Core business logic and external integrations.
    - `ble/`: Bluetooth Low Energy communication and scanning.
    - `crypto/`: Ed25519 identities, X25519 key exchange, and AES-256-GCM encryption.
    - `mesh/`: Peer registry and routing logic for the offline mesh.
    - `network/`: Mode management and battery optimization.
    - `protocol/`: Packet definitions and communication protocols.
    - `state/`: Zustand stores for global application state.
    - `storage/`: SQLite database management.
    - `tor/`: Tor SOCKS5 proxy and GhostRoute architecture.
- **ui/**: Presentation layer.
    - `components/`: Reusable UI building blocks.
    - `screens/`: Feature-specific screen layouts.
    - `navigation/`: App navigation configuration.
- **constants/**: Global constants and configuration.
- **types/**: TypeScript type definitions.
- **tests/**: Unit and integration tests.

## Security Architecture
- **Zero-Knowledge**: No phone numbers or emails.
- **End-to-End Encryption**: AES-256-GCM.
- **Routing**: Offline Mesh $\leftrightarrow$ Tor (via GhostRoute).
- **Storage**: Encrypted SQLite with self-destruct mechanisms.
