CryptoPunk
==========
Node-based GUI for experimentation with various cryptography-related algorithms - classical and modern.

Disclaimer
----------
__The cryptography algorithms included in this software are intended for historical, academic and educational purposes only. They are *not* intended for any kind of security purpose. In other words, do *not* use the code in production software, and do *not* use the output for e.g. secure communication.__

If you need *reasons* not to use this for actual security purposes, there are plenty:

* A huge percentage of the implemented algorithms are considered weak or broken.
* Even if the code is accurate, there will be an abundance of side-channel vulnerabilities.
* Because this is intended for education, security best practices aren't enforced - from block cipher modes to key choice.
* If you're considering doing cryptography in browser javascript, it's likely you should reconsider.

Also, the algorithms are not optimized in any way - on the contrary: most have been *de-optimized* in order to aid readability. Unrolled loops in reference sources have been "re-rolled"; code has been refactored into functions even in tight loops; most elaborate table lookup optimizations have been replaced with on-demand calculation; bit arithmetic errs on the side of readability rather than efficiency; etc. As such, most will be wildly inefficient compared to other implementations. The goal post is simply "real time results on a modest spec PC for relatively limited input sizes".

"Pre-alpha"
-----------
This "software" is "work in progress" and far from finalized: It's mostly been a testing ground for various algorithms. It *works* but is not a fully fledged user-friendly tool.

Supported
---------

### Classical Ciphers

* ADFGVX / ADFGX (with support for custom headers)
* Affine
* AMSCO (with customizable cutting sequence)
* Bifid
* Columnar transposition
* CONDI
* Hill Cipher
* Letter-Number (a = 1, b = 2, c = 3...)
* Playfair
* Polybius square
* Rail fence
* ROT-X / Caesar (with specific support for ROT-5, ROT-18, ROT-47)
* Skip
* Simple substitution
* Trifid
* Vigenère, Autokey Vigenère

### Mechanical Ciphers

* Enigma

### Block Ciphers

* 3-Way
* 3DES
* Anubis (128, 160, 192, 224, 256, 288 and 320 key sizes; Anubis-0 and tweak variants)
* ARIA (128, 192 and 256 key sizes; variable rounds)
* BaseKing (uncertain correctness)
* Blowfish
* Camellia
* CAST-128, CAST-256
* CipherUnicorn-A
* CLEFIA
* Crypton (0.5, 1.0; uncertain correctness for 1.0)
* CS-Cipher
* DEAL
* DES (64 bit with parity or 56 bit without)
* DES-X
* DFC, DFCv2 (128 bit block size)
* E2
* FEAL (FEAL-4, FEAL-8, FEAL-NX) (64 and 128 bit key sizes; variable rounds)
* FROG (40-1000 bit key sizes; 64-1024 bit block sizes; variable rounds)
* Hierocrypt (Hierocrypt-L1 and Hierocrypt-3 variants)
* ICE
* IDEA
* "Iraqi"
* Kalyna (128, 256, 512 key and block sizes; variable rounds)
* KASUMI (variable rounds)
* KHAZAD (variable rounds)
* Khufu, Khafre (both with the actual S-boxes)
* Kuznyechik (GOST R 34.12-2015)
* LEA
* LOKI89/91
* LOKI97
* LUCIFER (Sorkin and Outerbridge variants)
* MacGuffin
* Madryga
* MAGENTA
* Magma (GOST 28147-89)
* MARS (original AES submission and 2nd round tweak; 128-448 bit key sizes)
* MISTY1 (variable rounds)
* NewDES, NewDES-96
* Nimbus
* NOEKEON
* PRESENT
* RC2
* RC5
* RC6
* Red Pike
* Rijndael (128, 160, 192, 224, 256 key *and* block sizes; variable rounds)
* S-1
* SAFER (K-64, K-128, SK-40, SK-64, SK-128; variable rounds)
* SC2000
* SEED
* Serpent (including tnepreS)
* SHACAL ("SHACAL-0", SHACAL-1, SHACAL-2)
* Shark (Shark-E(xor) and Shark-A(ffine))
* Simon
* Skipjack (including NESSIE variant)
* Speck
* SPEED (64, 128 and 256 bit block sizes; 48-256 bit key sizes; variable rounds)
* SQUARE
* TEA, XTEA, Block TEA, XXTEA (big and little endian variants)
* Threefish (1.1, 1.2 and 1.3 variants)
* Treyfer
* Twofish
* Browser-native AES, RSA (crypto.subtle)

### Stream Ciphers

* A5/1, A5/2
* ChaCha (variable rounds; 80, 128 and 256 key sizes) and XChaCha
* Rabbit
* RC4 (with discard parameter)
* Salsa20 (variable rounds, including Salsa20/8 and Salsa20/12; 80, 128 and 256 key sizes) and XSalsa20
* Simple XOR

### Hashes

* BLAKE (224, 256, 384, 512)
* BLAKE2 (BLAKE2s, BLAKE2b)
* CubeHash (variable i, r, b, f, h)
* Grøstl (Grøstl-0 and tweaked versions)
* HAVAL (128, 160, 192, 224, 256; 3-5 passes)
* HAS-160
* JH (224, 256, 384, 512; 35.5 and 42 round variants)
* Kangaroo Twelve / Marsupilami Fourteen
* Keccak (variable capacity, hash length, suffix)
* MD2
* MD4
* MD5
* Panama
* RadioGatún (all byte sized word sizes, i.e. 8, 16, 24, 32, 40, 48, 56, 64; variable output size)
* RIPEMD (original)
* RIPEMD (128, 160, 256, 320)
* SHA-0
* SHA-1
* SHA-2 (128, 192, 256, 512, 512/224, 512/256 - as well as any non-approved 512/t for byte sized t)
* SHA-3 (128, 192, 256, 512)
* SHAKE (128, 256)
* Snefru (2.0; 128, 256; variable rounds)
* Tiger / Tiger2
* WHIRLPOOL (0, T, final)

### Checksums

* ADLER-32
* BSD
* CRC (multiple variants)
* Fletcher (16, 32, 64)

### Text representations

* Morse

### Byte <-> Text conversions

* ASCII
* Code pages (ASCII-based 8-bit character encodings - ISO-8859, MacOS Roman, Windows 1252, JIS X 0201...)
* EBCDIC
* Shift JIS
* EUC-JP
* UCS-2
* UTF-8
* UTF-16
* UTF-32
* Binary (numbers and bytestreams)
* Octal (numbers and bytestreams)
* Decimal (numbers and bytestreams)
* Hexadecimal (numbers and bytestreams)
* Base32
* Base32-HEX
* Base58 (Bitcoin, Ripple and Flickr variants)
* Base62
* Base64 (+ URL safe)

### Tools
* Change string case (upper, lower, invert)
* Remove characters (whitespace, newlines, character classes, specific characters)
* Simple string transpositions (reverse text)
* Add/remove binary padding (zero, bit, ANSI X.923, ISO 10126, PKCS#7)
* Endianness (invert endianness for words, dwords, qwords, dqwords and tribytes)

TODO
----

### Classical Ciphers

* Alberti?
* Bacon
* Bazeries
* Beaufort (= Vigenère + Atbash)
* Cadenius
* Chaocipher
* DRYAD
* Dvorak encoding?
* Four-square
* Great Cipher?
* Jefferson Wheel Cipher
* Keyword Cipher (based on caesar)
* Myszkowski
* Null
* RC-4 Pen & Paper (https://crypto.anarres.info/2016/rc4_pencilandpaper)
* Straddling Checkerboard
* Tap Code
* Two-square
* VIC

### Mechanical Ciphers

* Japanese (PURPLE etc.)
* US
* Lorenz

### Block Ciphers

* RC5, RC6 (16/64 bit word sizes)
* Serpent-0

#### Block Ciphers: Second priority

* Grand Cru
* IDEA NXT
* MISTY2
* SAFER+ / SAFER++
* CipherUnicorn-E

#### Block Ciphers: Third priority

* Akelarre
* ARIA 0.8/0.9? (If vectors can be found)
* BassOmatic
* BEAR / LION
* Chiasmus?
* CS2-Cipher
* CRISP
* Diamond2
* FEA-M
* HPC-1 / HPC-2
* Mercy
* MESH
* MMB
* MULTI-S01
* New Data Seal
* NUSH
* Rainbow
* Q
* REDOC II / REDOC III
* Sapphire-II
* SM4
* Spectr-H64
* SXAL / MBAL
* UES
* Xenon
* xmx
* Zodiac

### Stream Ciphers

* Achterbahn
* E0
* Enocoro
* F-FCSR
* FISH
* HC-128 / HC-256
* ISAAC
* KCipher-2
* Leviathan
* LILI-128
* MUGI
* PANAMA
* Helix / Phelix
* Pike
* Py
* QUAD
* Scream
* SEAL(-3.0)
* SNOW
* SOBER, SOBER-128
* SOSEMANUK
* VEST
* VMPC
* WAKE

### Asymmetric Cryptography
* Browser-native RSA
* RSA (with small keys)
* DSA
* DH
* Elliptic Curve schemes
* etc.

### Educational Ciphers

* Cyph0 (Outerbridge)
* Mini-AES
* Simplified DES

### Block cipher modes

* Electronic Code Book (ECB) (basically already done)
* Cipher Block Chaining (CBC)
* Propagating Cipher Block Chaining (PCBC)
* Cipher Feedback (CFB)
* Output Feedback (OFB)
* Counter (CTR)
* Authenticated modes? (OCB, EAX, CWC, CCM, GCM, SGCM, XCBC, IACBC)

### Hashes

* BLAKE2X, BLAKE2sp, BLAKE2bp
* Blue Midnight Wish (BMW)
* FSB
* Fugue
* GOST R 34.11-94
* HAS-V
* LAKE
* LASH
* MD6
* N-Hash
* Skein
* Spectral Hash
* Streebog (GOST 34.11-2012)
* SWIFFT

#### Hashes: Second priority

* DASH
* DHA-256
* ECOH
* Edon-R
* FFT-Hash / FFT-Hash II
* FORK-256
* Grindahl
* SMASH
* Snefru 1.0?

### Key-Derivation Functions

* Argon2
* Bcrypt
* HKDF
* Lyra, Lyra2
* PBKDF2
* Scrypt

### Checksums

* SYSV

### Non-cryptographic hashes (uncertain)

* Buzhash
* CityHash
* FarmHash
* FNV
* Jenkins
* MurmurHash
* NHash
* Pearson
* PJW, ElfHash
* SpookyHash
* SuperFastHash
* xxHash
* HighwayHash

### Text representations

* Baudot / ITA-2 / MTK-2 / US TTY
* Braille

### Byte <-> Text

* More EBCDIC code pages
* ISO-2022-JP? Second priority: other JIS encodings

Terminology and conventions
---------------------------
Generally, in the source code and UI, the term *size* (e.g. *key size* or *block size*) refers to number of *bits*, while *length* (e.g. *key length* or *block length*) refers to number of *bytes*. That is, a key *size* of 128 corresponds to a key *length* of 16 (128 divided by 8). This may not always follow the terms chosen by individual algorithm authors.
