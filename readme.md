CryptoPunk
==========

Supported
---------

### Classical Ciphers

* ADFGVX / ADFGX (with support for custom headers)
* Affine
* Bifid
* Columnar transposition
* Polybius square
* ROT-X / Caesar (with specific support for ROT-5, ROT-18, ROT-47)
* Skip
* Simple substitution
* Vigenère

### Mechanical Ciphers

* Enigma

### Modern Ciphers

* Blowfish
* DES (64 bit with parity or 56 bit without)
* IDEA
* LUCIFER (Sorkin implementation)
* RC4 (with discard parameter)
* Rijndael (128, 160, 192, 224, 256 key *and* block sizes, variable rounds)
* Skipjack (including NESSIE variant)
* Simple XOR
* Speck (32, 48, 64, 96, 128)
* TEA, XTEA, Block TEA, XXTEA (big and little endian variants)
* Threefish
* Twofish
* Browser-native AES, RSA (crypto.subtle)

### Hashes

* BLAKE (224, 256, 384, 512)
* BLAKE2 (BLAKE2s)
* HAVAL (128, 160, 192, 224, 256, 3-5 passes)
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
* Keyword Cipher (based on caesar)
* Null
* Playfair
* Rail Fence
* Tap Code
* Trifid
* Two-square
* VIC

### Mechanical Ciphers
* Japanese (PURPLE etc.)
* US
* Lorentz

### Modern Ciphers

* Camellia
* CAST-128
* 3DES
* GOST (Magma) (GOST 28147-89, GOST R 34.12-2015)
* RC2, RC5, RC6
* Serpent
* Browser-native RSA decryption

#### Second priority

* Anubis
* ARIA
* CS-Cipher
* Grand Cru
* Hierocrypt
* KASUMI
* KHAZAD
* MISTY1
* Nimbus
* NOEKON
* NUSH
* Q
* SAFER/SAFER+/SAFER++
* SC2000
* SEED
* Shacal
* Unicorn-A, Unicorn-E

### Hashes

* BLAKE2b
* Blue Midnight Wish (BMW)
* CubeHash
* FSB
* Fugue
* Grøstl
* JH
* MD6
* PANAMA
* RadioGatún
* Skein
* Snefru
* Spectral Hash
* SWIFFT
* Tiger / Tiger2