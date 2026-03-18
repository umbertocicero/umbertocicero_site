/**
 * Spiral / Helix shape module
 * Exports createMesh(THREE, material) and COLLISION_R
 */

/* ─── Shape Config ─────────────────────────────────────────────────── */
const SPIRAL_RADIUS = 0.5;    // helix coil radius
const SPIRAL_TUBE   = 0.14;   // tube thickness
const SPIRAL_TURNS  = 2.5;    // number of coils
const SPIRAL_HEIGHT = 1.8;    // total height of the spiral

export const COLLISION_R = 2.2;

/* ─── Cached geometry ──────────────────────────────────────────────── */
let _spiralGeo = null;
let _capGeo = null;
let _helixCurve = null;
let _THREE = null;

class HelixCurve {
    constructor(THREE, radius, height, turns) {
        // Extend THREE.Curve manually for ES module compat
        this._curve = new class extends THREE.Curve {
            getPoint(t, optionalTarget = new THREE.Vector3()) {
                const angle = Math.PI * 2 * turns * t;
                const x = radius * Math.cos(angle);
                const y = (t - 0.5) * height;
                const z = radius * Math.sin(angle);
                return optionalTarget.set(x, y, z);
            }
        }();
    }
    getPoint(t) { return this._curve.getPoint(t); }
    get curve() { return this._curve; }
}

function ensureGeo(THREE) {
    if (_spiralGeo) return;
    _THREE = THREE;
    const helix = new HelixCurve(THREE, SPIRAL_RADIUS, SPIRAL_HEIGHT, SPIRAL_TURNS);
    _helixCurve = helix;
    _spiralGeo = new THREE.TubeGeometry(helix.curve, 128, SPIRAL_TUBE, 16, false);
    _spiralGeo.computeVertexNormals();
    _capGeo = new THREE.SphereGeometry(SPIRAL_TUBE, 16, 16);
}

/* ─── Public factory ───────────────────────────────────────────────── */
export function createMesh(THREE, material) {
    ensureGeo(THREE);

    const g = new THREE.Group();

    // Tube body
    g.add(new THREE.Mesh(_spiralGeo, material));

    // Rounded end caps
    const startPt = _helixCurve.getPoint(0);
    const endPt   = _helixCurve.getPoint(1);

    const capStart = new THREE.Mesh(_capGeo, material);
    capStart.position.copy(startPt);
    g.add(capStart);

    const capEnd = new THREE.Mesh(_capGeo, material);
    capEnd.position.copy(endPt);
    g.add(capEnd);

    return g;
}
