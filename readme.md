CryptoPunk
==========

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

* Blowfish
* CAST-128
* DES (64 bit with parity or 56 bit without)
* IDEA
* LUCIFER (Sorkin and Outerbridge variants)
* RC5
* RC6
* Rijndael (128, 160, 192, 224, 256 key *and* block sizes, variable rounds)
* Skipjack (including NESSIE variant)
* Serpent
* Speck
* TEA, XTEA, Block TEA, XXTEA (big and little endian variants)
* Threefish
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
* SHA-2 (128, 192, 256, 512)
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

* Camellia
* CAST-256
* 3DES
* GOST (Magma) (GOST 28147-89, GOST R 34.12-2015)
* RC2
* RC5, RC6 (16/64 bit word sizes)
* Serpent-0, tnepreS
* Browser-native RSA decryption

#### Second priority

* 3-Way, BaseKing
* A5/1, A5/2
* Anubis
* ARIA
* CS-Cipher
* Grand Cru
* Hierocrypt
* KASUMI
* Khafre
* KHAZAD
* Khufu
* Madryga
* MISTY1
* NewDES / NewDES-96
* Nimbus
* NOEKON
* NUSH
* PRESENT
* Q
* Red Pike
* S-1
* SAFER/SAFER+/SAFER++
* SC2000
* SEED
* Shacal
* Unicorn-A, Unicorn-E

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
* SHA-2 512/224, 512/256 - maybe other truncations
* Skein
* Snefru
* Spectral Hash
* SWIFFT

## Byte <-> Text
* Baudot / ITA-2 / MTK-2 / US TTY
* EBCDIC
* UTF-32