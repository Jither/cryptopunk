      subroutine compress(a,b,l)
        implicit integer(a-z)
        dimension a(0:*),b(0:*)

c       a is the array in bit array format.
c       b is the array in byte format.
c       l is the length of array b in hexdigits.
c       a must be 4*l.

        do 100 i=0,l-1,1
          v=0
          do 200 j=0,3,1
            v=v*2+mod(a(j+i*4),2)
200       continue
          b(i)=v
100     continue

        return
      end