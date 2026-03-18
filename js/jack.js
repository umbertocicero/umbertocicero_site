/**
 * Jack / Cross shape module
 * Exports createMesh(THREE, material) and COLLISION_R
 */

/* --- Shape Config -------------------------------------------------- */
const ARM_LEN    = 1.9;
const ARM_RADIUS = 0.30;
const SEGS       = 32;

export const COLLISION_R = 2.5;

/* --- Cached geometry ----------------------------------------------- */
let _armGeo = null;
let _filletGeo = null;

function ensureGeo(THREE) {
    if (_armGeo) return;
    _armGeo = new THREE.CapsuleGeometry(ARM_RADIUS, ARM_LEN, 8, SEGS);
    _armGeo.computeVertexNormals();
    _filletGeo = new THREE.SphereGeometry(ARM_RADIUS * 1.12, SEGS, SEGS / 2);
}

/* --- Public factory ------------------------------------------------ */
export function createMesh(THREE, material) {
    ensureGeo(THREE);

    const g = new THREE.Group();

    // Y arm (capsule default axis)
    g.add(new THREE.Mesh(_armGeo, material));

    // X arm
    const mx = new THREE.Mesh(_armGeo, material);
    mx.rotation.z = Math.PI / 2;
    g.add(mx);

    // Z arm
    const mz = new THREE.Mesh(_armGeo, material);
    mz.rotation.x = Math.PI / 2;
    g.add(mz);

    // Center fillet
    g.add(new THREE.Mesh(_filletGeo, material));

    return g;
}
