import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { ror, rol } from "../../cryptopunk.bitarith";

const VARIANT_VALUES = [
	"0.5",
	"1.0"
];

const VARIANT_NAMES = [
	"CRYPTON 0.5",
	"CRYPTON 1.0"
];

const
    MB0 = 0xcffccffc,
    MB1 = 0xf33ff33f,
    MB2 = 0xfccffccf,
    MB3 = 0x3ff33ff3,

    MC0 = 0xacacacac,
    MC1 = 0x59595959,
    MC2 = 0xb2b2b2b2,
    MC3 = 0x65656565;

const P0  = [15, 14, 10,  1, 11,  5,  8, 13,  9,  3,  2,  7,  0,  6,  4, 12];
const P1  = [11, 10, 13,  7,  8, 14,  0,  5, 15,  6,  3,  4,  1,  9,  2, 12];
const IP0 = [12,  3, 10,  9, 14,  5, 13, 11,  6,  8,  2,  4, 15,  7,  1,  0];
const IP1 = [ 6, 12, 14, 10, 11,  7,  9,  3,  4, 13,  1,  0, 15,  2,  5,  8];

const SBOX_0 = [],
    SBOX_1 = [],
    SBOX_2 = [],
    SBOX_3 = [],

    STAB_0 = [],
    STAB_1 = [],
    STAB_2 = [],
    STAB_3 = []
    
    CE = [],
    CD = [];

const SBOX = [SBOX_0, SBOX_1, SBOX_2, SBOX_3];
const STAB = [STAB_0, STAB_1, STAB_2, STAB_3];

function rowPermutate(x)
{
    return (x & MB0) ^ (rol(x, 8) & MB1) ^ (rol(x, 16) & MB2) ^ (rol(x, 24) & MB3);
}

function fr0(x)
{
    const y0 = STAB_0[x >>> 24] ^ STAB_1[(x >>> 16) & 0xff] ^ STAB_2[(x >>> 8) & 0xff] ^ STAB_3[x & 0xff];
    const y1 = STAB_1[x >>> 24]
}

function precompute()
{
    if (SBOX_0.length > 0)
    {
        return;
    }

    for (let i = 0; i < 256; i++)
    {
        let xl = P1[i >> 4];
        let xr = P0[i & 0x0f];

        let yl = 
            ( xl &       0x0e) ^ 
            ((xl << 3) & 0x08) ^ 
            ((xl >> 3) & 0x01) ^ 
            ((xr << 1) & 0x0a) ^ 
            ((xr << 2) & 0x04) ^
            ((xr >> 2) & 0x02) ^
            ((xr >> 1) & 0x01);
        
        let yr =
            ( xr &       0x0d) ^
            ((xr << 1) & 0x04) ^
            ((xr >> 1) & 0x02) ^
            ((xl >> 1) & 0x05) ^
            ((xl << 2) & 0x08) ^
            ((xl << 1) & 0x02) ^
            ((xl >> 2) & 0x01);
        
        let y = IP0[yl] | (IP1[yr] << 4);

        yr = ((y << 3) | (y >> 5)) & 0xff;
        xr = ((i << 3) | (i >> 5)) & 0xff;
        yl = ((y << 1) | (y >> 7)) & 0xff;
        xl = ((i << 1) | (i >> 7)) & 0xff;

        SBOX_0[i] = yl;
        SBOX_1[i] = yr;
        SBOX_2[xl] = y;
        SBOX_3[xr] = y;

        STAB_0[i] = (yl * 0x01010101) & 0x3fcff3fc;
        STAB_1[i] = (yr * 0x01010101) & 0xfc3fcff3;
        STAB_2[xl] = (y * 0x01010101) & 0xf3fc3fcf;
        STAB_3[xl] = (y * 0x01010101) & 0xcff3fc3f;
    }

    xl = 0xa54ff53a;

    for (let i = 0; i < ROUNDS; i++)
    {
        CE[4 * i    ] = xl ^ MC0;
        CE[4 * i + 1] = xl ^ MC1;
        CE[4 * i + 2] = xl ^ MC2;
        CE[4 * i + 3] = xl ^ MC3;

        const t = i & 1 > 0 ? xl : ror(xl, 16);
        yl = rowPermutate(t);

        CD[4 * (12 - i)    ] = yl ^ MC0;
        CD[4 * (12 - i) + 1] = rol(yl, 24) ^ MC1;
        CD[4 * (12 - i) + 2] = rol(yl, 16) ^ MC2;
        CD[4 * (12 - i) + 3] = rol(yl, 8) ^ MC3;

        xl = add(xl, 0x3c6ef372);
    }
}

class CryptonTransform extends BlockCipherTransform
{
    constructor(decrypt)
    {
        super(decrypt);
        this.addOption("variant", "Variant", "1.0", { type: "select", values: VARIANT_VALUES, texts: VARIANT_NAMES });
    }

    transform(bytes, keyBytes)
    {
        this.checkBytesSize("Key", keyBytes, [128, 192, 256]);
        
        precompute();

        this.generateKeys(keyBytes)
    }

    generateKeys(keyBytes)
    {
        const u = new Array(4);
        const v = new Array(4);
        for (let i = 0; i < 4; i++)
        {
            const k = i * 8;
            u[i] = (keyBytes[k + 6] << 24) |
                (keyBytes[k + 4] << 16) |
                (keyBytes[k + 2] << 8) |
                (keyBytes[k]);
            v[i] = (keyBytes[k + 7] << 24) |
                (keyBytes[k + 5] << 16) |
                (keyBytes[k + 3] << 8) |
                (keyBytes[k + 1]);
        }

        const u1 = fr0(u);
        const v1 = fr0(v);
    }
}