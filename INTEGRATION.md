# WM Warehouse integration plan

This app offers a working **read-only** integration dialog for WCS and WMS. It does not yet connect the 3D positions to real telemetry.

1. Configure trusted WMS/WCS backend targets in `.env` (development only).
2. Open `Device Integration` and click `Test connections`.
3. Enable polling; compare numeric WCS PLC feedback with your WCS Communication Monitor on port 8080.
4. For production, replace the development Vite proxy with an authenticated, audited Spring Boot gateway (TLS + role-based authorization).
5. Build a warehouse coordinate calibration service before showing physical machine movements in the 3D model.
6. Add separate tracked fleet telemetries for forklift and AGV; none currently exist in this backend.
7. Use WCS state and verified task IDs for status; never infer task completion from a browser animation.

Current supported paths: `GET /api/crane/status`, `GET /api/tasks`, `GET /api/wms/inventory` through the read-only proxy.
