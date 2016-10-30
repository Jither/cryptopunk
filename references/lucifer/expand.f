      subroutine expand(a,b,l)
        implicit integer (a-z)
        dimension a(0:*),b(0:*)

c       a is the array in bit array format.
c       b is the array in byte format.
c       l is the length of the array b in hexdigits.
c       a must be 4*l long.

        do 100 i=0,l-1,1
          v=b(i)
          do 200 j=0,3,1
            a((3-j)+i*4)=mod(v,2)
            v=v/2
200       continue
100     continue

        return
      end
