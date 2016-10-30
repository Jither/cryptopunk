      subroutine lucifer(d,k,m)
      implicit integer(a-z)
      dimension m(0:7,0:7,0:1),k(0:7,0:15),o(0:7)

c     message block stored one bit/location
c     key stored one bit/location.
c     values must be 0 or 1. this subroutine doesn't verify that
c     condition for message or key.

c     fortran stores data with innermost subscript varying the
c     fastest.therefore, we have m(column,row,plane) and
c     k(column,row). the rows are the bytes of the message and
c     key. the columns are the bits in the bytes. for a normal
c     language such as pl/1, we would declare m(row,column,plane)
c     and k(row,column). we can equivalence a linear array of
c     128 entries to the message and key because of the way
c     in which they are stored

      dimension sw(0:7,0:7),pr(0:7),tr(0:7),c(0:1)
      dimension s0(0:15),s1(0:15)
      equivalence (c(0),h),(c(1),l)

c     diffusion  pattern
      data o/7,6,2,1,5,0,3,4/

c     inverse of fixed permutation
      data pr/2,5,4,0,3,1,7,6/

c     S-box permutations
      data s0/12,15,7,10,14,13,11,0,2,6,3,1,9,4,5,8/
      data s1/7,2,14,9,3,11,0,4,12,13,1,10,6,15,8,5/

c     the halves of the message byte selected are used as input
c     to s0 and s1 to produce 4 v bits each. if k(jj,ks)=0 then
c     the low order 4 bits are used with s0 and the high order 4
c     bits are used with s1. if k(jj,ks)=1 then the low order
c     4 bits are used with s1 and the high order 4 bits are used
c     with s0.

c     we don't physically swap the halves of the message or rotate
c     the message halves or key.  we use pointers into the arrays
c     to tell which bytes are being operated on.

c     d=1 indicates decipher. encipher otherwise.

c     h0 and h1 point to the two halves of the message.
c     value 0 is the lower half and value 1 is the upper

      h0=0
      h1=1

      kc=0
      if(d.eq.1) kc=8

      do 100 ii=1,16,1
c       c-i-d cycle

        if (d.eq.1) kc=mod(kc+1,16)

c       ks is the index of the transform control byte
        ks=kc

        do 200 jj=0,7,1

          l=0
          h=0

c         construct the integer values of the hexdigits of one byte
c         of the message.
c         call compress(m(0,jj,h1),c,2) is equivalent and simpler
c         but was slower. c(0)=h & c(1)=l by equivalence.

          do 400 kk=0,3,1
            l=l*2+m(7-kk,jj,h1)
400       continue

          do 410 kk=4,7,1
            h=h*2+m(7-kk,jj,h1)
410       continue

c         controlled interchange and s-box permutation.

          v=(s0(l)+16*s1(h))*(1-k(jj,ks))+(s0(h)+16*s1(l))*k(jj,ks)

c         convert v back into bit array format.
c         call expand(v,tr,2) is equivalent and simpler but
c         was slower.

          do 500 kk=0,7,1
            tr(kk)=mod(v,2)
            v=v/2
500       continue

c         key-interruption and diffusion combined.
c         the k+tr term is the permuted key interruption.
c         mod(0(kk)+jj,8) is the diffusion row for column kk.
c         row = byte & column = bit within byte.
          do 300 kk=0,7,1
            m(kk,mod(o(kk)+jj,8),h0)=mod(k(pr(kk),kc)+tr(pr(kk))+
     1        m(kk,mod(o(kk)+jj,8),h0),2)
300       continue

          if (jj.lt.7.or.d.eq.1) kc=mod(kc+1,16)

200     continue

c       swap values in h0 and h1 to swap halves of message.
        jjj=h0
        h0=h1
        h1=jjj

100   continue

c     physically swap upper and lower halves of the message after
c     the last round. we wouldn't have needed to do this if we
c     had been swapping all along.

      do 700 jj=0,7,1
      	do 800 kk=0,7,1
          sw(kk,jj)=m(kk,jj,0)
          m(kk,jj,0)=m(kk,jj,1)
          m(kk,jj,1)=sw(kk,jj)
800     continue
700   continue

      return
      end
