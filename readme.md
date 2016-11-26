CryptoPunk
==========

Disclaimer
----------
The cryptography algorithms included in this software are intended for historical, academic and educational purposes only. They are *not* intended for any kind of security purpose. In other words, do *not* use the code in production software, and do *not* use the output for e.g. secure communication.

The algorithms are not optimized in any way - on the contrary: most have been *de-optimized* in order to aid readability. Unrolled loops in reference sources have been "re-rolled"; code has been refactored into functions even in tight loops; bit arithmetic errs on the side of readability rather than efficiency; etc. As such, most will be wildly inefficient compared to other implementations. The goal post is simply "real time results on a modest spec PC for relatively limited input sizes".

Supported
---------

### Classical Ciphers

* ADFGVX / ADFGX (with support for custom headers)
* Affine
* Bifid
* Columnar transposition
* Playfair
* Polybius square
* ROT-X / Caesar (with specific support for ROT-5, ROT-18, ROT-47)
* Skip
* Simple substitution
* Trifid
* Vigenère

### Mechanical Ciphers

* Enigma

### Block Ciphers

* 3-Way
* Blowfish
* Camellia
* CAST-128, CAST-256
* DES (64 bit with parity or 56 bit without)
* ICE
* IDEA
* Khufu, Khafre (both with the actual S-boxes)
* LUCIFER (Sorkin and Outerbridge variants)
* Magma (GOST 28147-89)
* NewDES, NewDES-96
* NOEKEON
* PRESENT
* RC2
* RC5
* RC6
* Red Pike
* Rijndael (128, 160, 192, 224, 256 key *and* block sizes, variable rounds)
* Serpent
* Shark-E
* Skipjack (including NESSIE variant)
* Speck
* SQUARE
* TEA, XTEA, Block TEA, XXTEA (big and little endian variants)
* Threefish
* Treyfer
* Twofish
* Browser-native AES, RSA (crypto.subtle)

### Stream Ciphers

* RC4 (with discard parameter)
* Simple XOR

### Hashes

* BLAKE (224, 256, 384, 512)
* BLAKE2 (BLAKE2s, BLAKE2b)
* HAVAL (128, 160, 192, 224, 256, 3-5 passes)
* HAS-160
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

### Byte <-> Text conversions

* ASCII
* Code pages (ISO-8859, MacOS Roman, Windows 1252...)
* UCS-2
* UTF-8
* UTF-16
* Binary (numbers and bytestreams)
* Octal (numbers and bytestreams)
* Decimal (numbers and bytestreams)
* Hexadecimal (numbers and bytestreams)
* Base32
* Base32-HEX
* Base64 (+ URL safe)


TODO
----

### Classical Ciphers
* Alberti?
* Autokey ciphers (e.g. Vigenère)
* Bacon
* Beaufort (= Vigènere + Atbash)
* Chaocipher
* DRYAD
* Dvorak encoding?
* Four-square
* Great Cipher?
* Hill Cipher
* Jefferson Wheel Cipher
* Keyword Cipher (based on caesar)
* Myszkowski
* Null
* Rail Fence
* Straddling Checkerboard
* Tap Code
* Two-square
* VIC

### Mechanical Ciphers
* Japanese (PURPLE etc.)
* US
* Lorenz

### Modern Ciphers

* 3DES
* Kuznyechik (GOST R 34.12-2015)
* RC5, RC6 (16/64 bit word sizes)
* Serpent-0, tnepreS
* Browser-native RSA decryption

#### Second priority

* BaseKing
* A5/1, A5/2
* Akelarre
* Anubis
* CRYPTON (0.5, 1.0)
* CS-Cipher
* DEAL
* DES-X
* DFC / DFCv2-128
* E2
* FEAL
* FROG
* Grand Cru
* Hierocrypt
* IDEA NXT
* Iraqi
* KASUMI
* KHAZAD
* LOKI89/91 / LOKI97
* MacGuffin
* Madryga
* MAGENTA
* MARS
* MISTY1 / MISTY2
* S-1
* SAFER / SAFER+ / SAFER++
* SC2000
* Scream
* SEAL(-3.0)
* SEED
* Shacal
* Shark-A
* Simon
* SNOW
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

### Hashes

* BLAKE2X, BLAKE2sp, BLAKE2bp
* Blue Midnight Wish (BMW)
* CubeHash
* FSB
* Fugue
* Grøstl
* HAS-V
* JH
* MD6
* PANAMA
* RadioGatún
* Skein
* Snefru
* Spectral Hash
* SWIFFT

## Byte <-> Text
* Baudot / ITA-2 / MTK-2 / US TTY
* EBCDIC
* UTF-32

Terminology and conventions
---------------------------
Generally, in the source code and UI, the term *size* (e.g. *key size* or *block size*) refers to number of *bits*, while *length* (e.g. *key length* or *block length*) refers to number of *bytes*. That is, a key *size* of 128 corresponds to a key *length* of 16 (128 divided by 8). This may not always follow the terms chosen by individual algorithm authors.

