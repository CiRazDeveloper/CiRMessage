# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## WebRTC calling

Calls use the existing authenticated Socket.IO connection for signaling and
WebRTC for audio, video, and screen sharing. Small group calls use a
peer-to-peer mesh.

The frontend uses the public Google STUN server by default. For production
reliability, configure a TURN server in the frontend environment:

```text
VITE_STUN_URL=stun:cirm.ciraz.online:3478
VITE_TURN_URL_UDP=turn:cirm.ciraz.online:3478?transport=udp
VITE_TURN_URL_TCP=turn:cirm.ciraz.online:3478?transport=tcp
VITE_TURN_USERNAME=cirm
VITE_TURN_CREDENTIAL=YOUR_CURRENT_TURN_PASSWORD
```

Replace `YOUR_CURRENT_TURN_PASSWORD` with the password configured in Coturn
before building the frontend. Because Vite exposes `VITE_*` values to browser
code, use a dedicated TURN credential rather than a sensitive server secret.
