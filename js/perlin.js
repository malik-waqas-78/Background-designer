// perlin.js – tiny Perlin noise implementation (ES module)
export class PerlinNoise {
    constructor() {
        this.p = new Uint8Array(512);
        const permutation = [
            151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
            140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
            247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
            57, 177, 33, 88, 237, 149, 56, 87, 178, 208, 198, 202, 176, 145, 24,
            18, 17, 211, 209, 114, 249, 129, 195, 78, 210, 123, 55, 54, 235, 216,
            162, 40, 111, 192, 236, 170, 186, 166, 108, 175, 155, 250, 232, 22,
            138, 183, 184, 85, 193, 222, 168, 16, 169, 205, 196, 44, 25, 188, 124,
            1, 20, 73, 156, 245, 174, 107, 253, 83, 50, 65, 113, 84, 147, 72,
            138, 5, 248, 154, 165, 152, 159, 104, 179, 9, 14, 58, 2, 115, 182,
            143, 246, 86, 171, 116, 98, 220, 153, 60, 61, 150, 118, 161, 223, 163,
            59, 243, 92, 224, 228, 109, 122, 81, 52, 67, 105, 97, 226, 106, 101,
            34, 3, 4, 185, 173, 80, 218, 63, 68, 89, 19, 43, 158, 112, 28, 204,
            141, 180, 244, 127, 70, 64, 251, 110, 239, 189, 187, 144, 134, 227,
            146, 207, 254, 181, 12, 77, 66, 164, 172, 241, 126, 238, 206, 121,
            217, 42, 125, 71, 27, 76, 255
        ];
        for (let i = 0; i < 256; ++i) {
            this.p[256 + i] = this.p[i] = permutation[i];
        }
    }

    // 3‑D noise – we only need 2‑D but using 3‑D makes the texture evolve over time
    noise(x, y, z) {
        const X = Math.floor(x) & 255,
            Y = Math.floor(y) & 255,
            Z = Math.floor(z) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        const u = fade(x),
            v = fade(y),
            w = fade(z);
        const A = this.p[X] + Y,
            AA = this.p[A] + Z,
            AB = this.p[A + 1] + Z,
            B = this.p[X + 1] + Y,
            BA = this.p[B] + Z,
            BB = this.p[B + 1] + Z;

        return lerp(
            w,
            lerp(
                v,
                lerp(u, grad(this.p[AA], x, y, z), grad(this.p[BA], x - 1, y, z)),
                lerp(u, grad(this.p[AB], x, y - 1, z), grad(this.p[BB], x - 1, y - 1, z))
            ),
            lerp(
                v,
                lerp(u, grad(this.p[AA + 1], x, y, z - 1), grad(this.p[BA + 1], x - 1, y, z - 1)),
                lerp(u, grad(this.p[AB + 1], x, y - 1, z - 1), grad(this.p[BB + 1], x - 1, y - 1, z - 1))
        ));
        // -----------------------------------------------------------------
        function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
        function lerp(t, a, b) { return a + t * (b - a); }
        function grad(hash, x, y, z) {
            const h = hash & 15;
            const u = h < 8 ? x : y;
            const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
            return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
        }
    }
}