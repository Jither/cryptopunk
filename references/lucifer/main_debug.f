c     main program that uses Lucifer
      implicit integer (a-z)
      data handle/0/
      dimension k(0:7,0:15),m(0:7,0:7,0:1)
c     message and key arrays are equivalenced to 128 element linear
c     arrays.
      dimension key(0:127),message(0:127)
c     MODIFIED: Pretty sure this line was wrong:
c     equivalence (k(0,0),key(1)),(m(0,0,0),message(1))
      equivalence (k(0,0),key(0)),(m(0,0,0),message(0))
c     input byte arrays for reading key and message
c     input is in hex digits. 128 bits = 32 hex digits = 16 bytes
      dimension kb(0:31),mb(0:31)
      character*32 kstr
      character*32 mstr

      kstr='0123fedc4567ba987654cdef321089ba'
      mstr='00112233445566778899aabbccddeeff'
      read(kstr,1004) (kb(i),i=0,31)
      read(mstr,1006) (mb(i),i=0,31)

      call expand(message,mb,32)
      call expand(key,kb,32)

      write(6,1003)
      write(6,1007) (kb(i),i=0,31)
      write(6,1005)
      write(6,1007) (mb(i),i=0,31)

      write(6,1000) (key(i), i=0,127)
      write(6,1001) (message(i), i=0,127)

c     encipher
      d=0
      call lucifer_debug(d,k,m)

      call compress(message,mb,32)
      call compress(key,kb,32)
      write(6,1003)
      write(6,1007) (kb(i),i=0,31)
      write(6,1005)
      write(6,1007) (mb(i),i=0,31)

      write(*,*) ''
      write(*,*) 'DECIPHER'
c     decipher
      d=1
      call lucifer_debug(d,k,m)

      write(6,1002) (message(i), i=0,127)

      call compress(message,mb,32)
      call compress(key,kb,32)
      write(6,1003)
      write(6,1007) (kb(i),i=0,31)
      write(6,1008)
      write(6,1007) (mb(i),i=0,31)

1000  format(' key '/16(1x,i1))
1001  format(' plain '/16(1x,i1))
1002  format(' cipher '/16(1x,i1))
1003  format(' key ')
1004  format(32z1.1)
1005  format(' plain ')
1006  format(32z1.1)
1007  format(1x,32z1.1)
1008  format(' cipher ')
      end
