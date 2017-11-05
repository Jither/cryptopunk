CryptoPunk
==========
Node GUI for experimentation with various cryptography-related algorithms - classical and modern.

Disclaimer
----------
The cryptography algorithms included in this software are intended for historical, academic and educational purposes only. They are *not* intended for any kind of security purpose. In other words, do *not* use the code in production software, and do *not* use the output for e.g. secure communication.

The algorithms are not optimized in any way - on the contrary: most have been *de-optimized* in order to aid readability. Unrolled loops in reference sources have been "re-rolled"; code has been refactored into functions even in tight loops; bit arithmetic errs on the side of readability rather than efficiency; etc. As such, most will be wildly inefficient compared to other implementations. The goal post is simply "real time results on a modest spec PC for relatively limited input sizes".

"Pre-alpha"
-----------
This "software" is "work in progress" and far from finalized: It's mostly been a testing ground for various algorithms. It *works* but is not a fully fledged user-friendly tool.

Supported
---------

### Classical Ciphers

* ADFGVX / ADFGX (with support for custom headers)
* Affine
* Bifid
* Columnar transposition
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
* Blowfish
* Camellia
* CAST-128, CAST-256
* DES (64 bit with parity or 56 bit without)
* DES-X
* FEAL (FEAL-4, FEAL-8, FEAL-NX) (64 and 128 bit key sizes; variable rounds)
* ICE
* IDEA
* "Iraqi"
* Khufu, Khafre (both with the actual S-boxes)
* Kuznyechik (GOST R 34.12-2015)
* LUCIFER (Sorkin and Outerbridge variants)
* Madryga
* Magma (GOST 28147-89)
* NewDES, NewDES-96
* NOEKEON
* PRESENT
* RC2
* RC5
* RC6
* Red Pike
* Rijndael (128, 160, 192, 224, 256 key *and* block sizes; variable rounds)
* Serpent
* Shark-E
* Simon
* Skipjack (including NESSIE variant)
* Speck
* SQUARE
* TEA, XTEA, Block TEA, XXTEA (big and little endian variants)
* Threefish (1.1, 1.2 and 1.3 variants)
* Treyfer
* Twofish
* Browser-native AES, RSA (crypto.subtle)

### Stream Ciphers

* A5/1, A5/2
* ChaCha (variable rounds; 80, 128 and 256 key sizes) and XChaCha
* RC4 (with discard parameter)
* Salsa20 (variable rounds, including Salsa20/8 and Salsa20/12; 80, 128 and 256 key sizes) and XSalsa20
* Simple XOR

### Hashes

* BLAKE (224, 256, 384, 512)
* BLAKE2 (BLAKE2s, BLAKE2b)
* HAVAL (128, 160, 192, 224, 256; 3-5 passes)
* HAS-160
* Kangaroo Twelve / Marsupilami Fourteen
* Keccak (variable capacity, hash length, suffix)
* MD2
* MD4
* MD5
* RIPEMD (original)
* RIPEMD (128, 160, 256, 320)
* SHA-0
* SHA-1
* SHA-2 (128, 192, 256, 512, 512/224, 512/256 - as well as any non-approved 512/t for byte sized t)
* SHA-3 (128, 192, 256, 512)
* SHAKE (128, 256)
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


TODO
----

### Classical Ciphers

* Alberti?
* AMSCO
* Bacon
* Bazeries
* Beaufort (= Vigenère + Atbash)
* Cadenius
* Chaocipher
* Condi
* DRYAD
* Dvorak encoding?
* Four-square
* Great Cipher?
* Jefferson Wheel Cipher
* Keyword Cipher (based on caesar)
* Myszkowski
* Null
* Straddling Checkerboard
* Tap Code
* Two-square
* VIC

### Mechanical Ciphers

* Japanese (PURPLE etc.)
* US
* Lorenz

### Block Ciphers

* 3DES
* RC5, RC6 (16/64 bit word sizes)
* Serpent-0, tnepreS
* Browser-native RSA decryption

#### Second priority

* Akelarre
* Anubis
* BaseKing
* CRYPTON (0.5, 1.0)
* CS-Cipher
* DEAL
* DFC / DFCv2-128
* E2
* FROG
* Grand Cru
* Hierocrypt
* IDEA NXT
* KHAZAD
* Kalyna
* LOKI89/91 / LOKI97
* MacGuffin
* MAGENTA
* MARS
* MISTY1 / MISTY2
* S-1
* SAFER / SAFER+ / SAFER++
* SC2000
* SEED
* Shacal
* Shark-A
* SPEED
* Unicorn-A, Unicorn-E

#### Third priority

* ARIA
* BassOmatic
* Diamond2
* FEA-M
* HPC-1 / HPC-2
* Mercy
* MESH
* MMB
* MULTI2
* New Data Seal
* Nimbus
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
* F-FCSR
* FISH
* HC-128 / HC-256
* ISAAC
* KASUMI
* MUGI
* PANAMA
* Helix / Phelix
* Pike
* Py
* QUAD
* Rabbit
* Scream
* SEAL(-3.0)
* SNOW
* SOBER, SOBER-128
* SOSEMANUK
* VEST
* VMPC
* WAKE

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
* CubeHash
* ECOH
* FSB
* Fugue
* GOST R 34.11-94
* Grøstl
* HAS-V
* JH
* MD6
* RadioGatún
* Skein
* Snefru
* Spectral Hash
* Streebog (GOST 34.11-2012)
* SWIFFT

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
