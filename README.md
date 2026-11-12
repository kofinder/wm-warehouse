# WM Warehouse — Web 3D Digital Twin (Node.js 14 Edition)

**React 18 · Material UI 5 · Three.js · React Three Fiber 8 · Vite 4 · TypeScript 5**

Uses your supplied fox logo as the application logo and browser favicon. Designed for **Node.js 14.20.1 / npm 6.14.18**.

## What's included

- Branded **WM Warehouse** navigation and dashboard.
- Interactive **3D mock warehouse** with 48 storage locations, forklift, two AGVs, crane, local mock tasks, and pallets.
- **Device Integration** dialog (left navigation or top toolbar): architecture, local API connection checks, live read-only WCS crane status, WMS inventory count, and OPC UA tag reference.
- Mock data remains separate from real WMS/WCS feedback. **No direct PLC control is implemented.**

## Part A — Run 3D mock simulation only (no backend required)

1. Download `wm-warehouse-3d-node14-full.zip` into `~/Downloads`.
2. In Ubuntu Terminal:

```bash
cd ~/Downloads
unzip -o wm-warehouse-3d-node14-full.zip
cd wm-warehouse-3d-node14
nvm use 14.20.1
node -v       # v14.20.1
npm -v        # 6.14.18
npm install
npm run dev
```

3. Open **http://localhost:3000**. Click rack locations; run mock putaway/retrieval; watch the forklift, AGVs and crane.
4. Click **Device Integration**. The default state is offline/not checked, which is expected if WMS/WCS are not running.

To stop, press **Ctrl+C** in the frontend terminal.

## Part B — Connect the REAL WMS/WCS application (READ-ONLY)

The browser cannot speak OPC UA directly. It reads your **existing WCS** HTTP API, which in turn reads PLC/simulator signals via its protected OPC UA client.

Start your existing ASRS services in separate terminals (from `~/workspaces/wm_asrs`):

**Terminal 1 — ROS planner** (required for existing WCS task execution, not needed for viewing status):

```bash
cd ~/workspaces/wm_asrs/ros2_ws
source /opt/ros/jazzy/setup.bash
source install/setup.bash
ros2 run asrs_ros_planner planner_node
```

**Terminal 2 — Virtual PLC:**

```bash
cd ~/workspaces/wm_asrs
./gradlew :asrs-simulator:run
```

**Terminal 3 — WCS:**

```bash
cd ~/workspaces/wm_asrs
./gradlew :asrs-wcs:bootRun
```

**Terminal 4 — WMS:**

```bash
cd ~/workspaces/wm_asrs
./gradlew :asrs-wms:bootRun
```

**Terminal 5 — WM Warehouse 3D web application:**

```bash
cd ~/Downloads/wm-warehouse-3d-node14
nvm use 14.20.1
npm run dev
```

At **http://localhost:3000**, click **Device Integration** → **Connections & telemetry** → **Test connections**. Expect **WCS ONLINE** and **WMS ONLINE** when their APIs are running.

Switch on **Enable live read-only monitoring** to poll every 3 seconds. A green telemetry strip at the top shows actual WCS `MachineState`, `AxisXPositionMm`, `AxisZPositionMm` and confirmed WMS inventory count. The 3D scene **still uses local mock animation** and is labeled accordingly: actual coordinate calibration for 3D and genuine forklift/AGV telemetry are future tasks.

### Changing backend addresses

The app uses fixed same-origin development proxy paths to avoid browser CORS issues:

| Browser endpoint | Proxied to | Purpose |
| --- | --- | --- |
| `GET /bridge/wcs/api/crane/status` | `http://127.0.0.1:8080/api/crane/status` | WCS crane / PLC feedback |
| `GET /bridge/wcs/api/tasks` | `http://127.0.0.1:8080/api/tasks` | WCS task history |
| `GET /bridge/wms/api/wms/inventory` | `http://127.0.0.1:8081/api/wms/inventory` | Confirmed WMS inventory |

If Kotlin services run on a different trusted machine, create a `.env` file next to `package.json` based on `.env.example`:

```bash
cp .env.example .env
nano .env
```

Edit backend targets, for example:

```properties
WCS_PROXY_TARGET=http://192.168.1.50:8080
WMS_PROXY_TARGET=http://192.168.1.50:8081
```

Restart `npm run dev` after changes. The dialog's URL fields are **same-origin paths**; they do not take absolute URLs or credentials.

### Test with curl

```bash
curl -i http://127.0.0.1:3000/bridge/wcs/api/crane/status
curl -i http://127.0.0.1:3000/bridge/wcs/api/tasks
curl -i http://127.0.0.1:3000/bridge/wms/api/wms/inventory
```

Only these three `GET` endpoints are exposed through the dev proxy. A write or other route returns **403**, for example:

```bash
curl -i -X POST http://127.0.0.1:3000/bridge/wcs/api/tasks/putaway
```

**Security:** This is a local development proxy bound to `127.0.0.1`, not a production gateway. Do not expose this Node 14 app, the WMS, or the PLC interfaces publicly. Real equipment needs TLS, authorization, network isolation, auditing and certified/independently engineered safety systems. No control requests or OPC UA writes are implemented in the web frontend.

## Test and build

```bash
npm run check:logic
npm run build
```

If you previously used Vite 5, delete old dependencies and reinstall with your Node 14 environment:

```bash
rm -rf node_modules
npm install
```

## Next integration milestone

To make the 3D crane reflect **real** PLC feedback, define/calibrate the transformation from physical millimeters and real rack IDs to this demo's 8-bay × 3-level model. Then add authenticated WCS WebSocket telemetry, real AGV/forklift localization and tracked pallet IDs. Do not treat mock AGV positions as live devices.

Node.js 14 is end-of-life. This edition is a **local development demonstration**, not production software.
