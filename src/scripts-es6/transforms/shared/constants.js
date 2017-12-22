// Fractional part of Euler's Number, e
export const E_FRACTION = [
	0xb7e15162, 0x8aed2a6a, 0xbf715880, 0x9cf4f3c7, 
	0x62e7160f, 0x38b4da56, 0xa784d904, 0x5190cfef, 
	0x324e7738, 0x926cfbe5, 0xf4bf8d8d, 0x8c31d763,
	0xda06c80a, 0xbb1185eb, 0x4f7c7b57, 0x57f59584, 
	0x90cfd47d, 0x7c19bb42, 0x158d9554, 0xf7b46bce, 
	0xd55c4d79, 0xfd5f24d6, 0x613c31c3, 0x839a2ddf,
	0x8a9a276b, 0xcfbfa1c8, 0x77c56284, 0xdab79cd4, 
	0xc2b3293d, 0x20e9e5ea, 0xf02ac60a, 0xcc93ed87, 
	0x4422a52e, 0xcb238fee, 0xe5ab6add, 0x835fd1a0,
	0x753d0a8f, 0x78e537d2, 0xb95bb79d, 0x8dcaec64, 
	0x2c1e9f23, 0xb829b5c2, 0x780bf387, 0x37df8bb3, 
	0x00d01334, 0xa0d0bd86, 0x45cbfa73, 0xa6160ffe,
	0x393c48cb, 0xbbca060f, 0x0ff8ec6d, 0x31beb5cc, 
	0xeed7f2f0, 0xbb088017, 0x163bc60d, 0xf45a0ecb, 
	0x1bcd289b, 0x06cbbfea, 0x21ad08e1, 0x847f3f73,
	0x78d56ced, 0x94640d6e, 0xf0d3d37b, 0xe67008e1,
	0x86d1bf27, 0x5b9b241d,	0xeb64749a, 0x47dfdfb9,
	0x6632c3eb, 0x061b6472, 0xbbf84c26, 0x144e49c2
];

export const ROOTS = {
	SQRT2_DIV4  : 0x5a827999, // 2^30 * SQRT(2)
	SQRT3_DIV4  : 0x6ed9eba1, // 2^30 * SQRT(3)
	SQRT5_DIV4  : 0x8f1bbcdc, // 2^30 * SQRT(5)
	SQRT7_DIV4  : 0xa953fd4e, // 2^30 * SQRT(7)
	SQRT10_DIV4 : 0xca62c1d6, // 2^30 * SQRT(10)
	SQRT15_DIV4 : 0xf7def58a, // 2^30 * SQRT(15)

	// First 32 bits of the fractions of square roots of the first 8 prime numbers:
	SQRT2       : 0x6a09e667, // 2^32 * SQRT(FRAC(2))
	SQRT3       : 0xbb67ae85, 
	SQRT5       : 0x3c6ef372, 
	SQRT7       : 0xa54ff53a, 
	SQRT11      : 0x510e527f,
	SQRT13      : 0x9b05688c, 
	SQRT17      : 0x1f83d9ab,
	SQRT19      : 0x5be0cd19,
	SQRT23 		: 0xcbbb9d5d,

	// *Second* 32 bits of the fractions of the square roots of the 9th to 16th prime numbers:
	SQRT23_2    : 0xc1059ed8, // 2^64 * SQRT(FRAC(23)) % 2^32
	SQRT29_2    : 0x367cd507, 
	SQRT31_2    : 0x3070dd17, 
	SQRT37_2    : 0xf70e5939,
	SQRT41_2    : 0xffc00b31, 
	SQRT43_2    : 0x68581511, 
	SQRT47_2    : 0x64f98fa7, 
	SQRT53_2    : 0xbefa4fa4,

	// First 32 bits of the fractions of the cube roots of the first 4 prime numbers
	CBRT2_DIV4  :  0x50a28be6, // 2^30 * CBRT(2)
	CBRT3_DIV4  :  0x5c4dd124, // 2^30 * CBRT(3)
	CBRT5_DIV4  :  0x6d703ef3, // 2^30 * CBRT(5)
	CBRT7_DIV4  :  0x7a6d76e9, // 2^30 * CBRT(7)
};

export const INIT = {
	_1_67   :  0x67452301, // Little Endian 01234567
	_2_EF   :  0xefcdab89, // Little Endian 89abcdef
	_3_98   :  0x98badcfe, // Little Endian fedcba98
	_4_10   :  0x10325476, // Little Endian 76543210
	_5_C3   :  0xc3d2e1f0, // cdef 3210 interleaved

	_1_76   :  0x76543210, // Big Endian version of _4
	_2_FE   :  0xfedcba98, // Big Endian version of _3
	_3_89   :  0x89abcdef, // Big Endian version of _2
	_4_01   :  0x01234567, // Big Endian version of _1
	_5_3C   :  0x3c2d1e0f  // Nibbles switched version of _5
};
