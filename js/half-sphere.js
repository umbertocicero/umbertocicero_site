/**
 * Half-Sphere shape module
 * A hemisphere (bowl) — flat on top, dome below.
 * Exports createMesh(THREE, material) and COLLISION_R
 */

/* ─── Shape Config ─────────────────────────────────────────────────── */
const RADIUS   = 1.0;      // hemisphere radius
const W_SEGS   = 48;       // width segments  (longitude)
const H_SEGS   = 28;       // height segments (latitude)

export const COLLISION_R = 2.2;

/* ─── Cached geometry ──────────────────────────────────────────────── */
let _domeGeo = null;
let _discGeo = null;

function ensureGeo(THREE) {
    if (_domeGeo) return;

    /* Hemisphere: standard SphereGeometry cut at the equator
       phiStart=0, phiLength=2π, thetaStart=0, thetaLength=π/2
       This gives the top half of the sphere (dome pointing +Y). */
    _domeGeo = new THREE.SphereGeometry(
        RADIUS, W_SEGS, H_SEGS,
        0, Math.PI * 2,       // phi   — full revolution
        0, Math.PI / 2        // theta — top half only
    );
    _domeGeo.computeVertexNormals();

    /* Flat disc to seal the open base (at y = 0) */
    _discGeo = new THREE.CircleGeometry(RADIUS, W_SEGS);
    _discGeo.computeVertexNormals();
}

/* ─── Public factory ───────────────────────────────────────────────── */
export function createMesh(THREE, material) {
    ensureGeo(THREE);

    const g = new THREE.Group();

    /* Dome (top half of sphere) */
    const dome = new THREE.Mesh(_domeGeo, material);
    g.add(dome);

    /* Flat base disc — rotated so it faces downward (-Y) */
    const disc = new THREE.Mesh(_discGeo, material);
    disc.rotation.x = Math.PI / 2;   // CircleGeometry faces +Z → rotate to face +Y
    g.add(disc);

    /* Flip the whole group so the bowl opens upward
       (dome on bottom, opening on top — like the reference image) */
    g.rotation.x = Math.PI;

    return g;
}
